#include "OboeAudioCapture.h"
#include <android/log.h>
#include <chrono>
#include <cstring>
#include <algorithm>

#define LOG_TAG "OboeAudioCapture"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

OboeAudioCapture::OboeAudioCapture()
    : yin_(SAMPLE_RATE, FRAME_SIZE, YIN_THRESHOLD), bufferedSamples_(0) {}

OboeAudioCapture::~OboeAudioCapture() { stop(); }

bool OboeAudioCapture::start() {
  if (running_.load(std::memory_order_acquire)) {
    return true;
  }

  oboe::AudioStreamBuilder builder;
  builder.setDirection(oboe::Direction::Input)
      ->setPerformanceMode(oboe::PerformanceMode::LowLatency)
      ->setSharingMode(oboe::SharingMode::Exclusive)
      ->setFormat(oboe::AudioFormat::Float)
      ->setSampleRate(static_cast<int32_t>(SAMPLE_RATE))
      ->setChannelCount(oboe::ChannelCount::Mono)
      ->setInputPreset(oboe::InputPreset::Unprocessed)
      ->setCallback(this);

  oboe::Result result = builder.openStream(stream_);
  if (result != oboe::Result::OK) {
    LOGE("Failed to open stream: %s", oboe::convertToText(result));
    return false;
  }

  // Log actual stream config
  LOGI("Stream opened: sampleRate=%d, framesPerBurst=%d, sharingMode=%s",
       stream_->getSampleRate(), stream_->getFramesPerBurst(),
       oboe::convertToText(stream_->getSharingMode()));

  result = stream_->requestStart();
  if (result != oboe::Result::OK) {
    LOGE("Failed to start stream: %s", oboe::convertToText(result));
    stream_->close();
    stream_.reset();
    return false;
  }

  running_.store(true, std::memory_order_release);
  LOGI("Audio capture started");
  return true;
}

void OboeAudioCapture::stop() {
  if (!running_.load(std::memory_order_acquire)) {
    return;
  }

  running_.store(false, std::memory_order_release);

  if (stream_) {
    stream_->requestStop();
    stream_->close();
    stream_.reset();
  }

  bufferedSamples_ = 0;

  // Reset DSP state
  yin_.reset();
  highPass_.reset();
  lastBufferTimestampNs_.store(0, std::memory_order_relaxed);

  LOGI("Audio capture stopped");
}

void OboeAudioCapture::getLatestPitch(float& frequency, float& confidence,
                                       float& cents, int& octave,
                                       char noteName[4]) {
  latestPitch_.load(frequency, confidence, cents, octave, noteName);
}

double OboeAudioCapture::getLatencyMs() {
  int64_t ts = lastBufferTimestampNs_.load(std::memory_order_acquire);
  if (ts == 0) return 0.0;
  auto now = std::chrono::steady_clock::now();
  int64_t nowNs = std::chrono::duration_cast<std::chrono::nanoseconds>(
      now.time_since_epoch()).count();
  return static_cast<double>(nowNs - ts) / 1e6;
}

oboe::DataCallbackResult OboeAudioCapture::onAudioReady(
    oboe::AudioStream* /*stream*/, void* audioData, int32_t numFrames) {
  // Record timestamp for latency measurement
  auto now = std::chrono::steady_clock::now();
  lastBufferTimestampNs_.store(
      std::chrono::duration_cast<std::chrono::nanoseconds>(
          now.time_since_epoch()).count(),
      std::memory_order_release);

  // Zero allocations in this callback — all buffers are preallocated
  const auto* input = static_cast<const float*>(audioData);

  // Apply high-pass filter to remove DC offset and low-frequency rumble
  int count = std::min(static_cast<int>(numFrames), 4096);
  highPass_.process(input, filterBuffer_, count);
  const float* filtered = filterBuffer_;

  // Write filtered samples to the ring buffer
  ringBuffer_.write(filtered, static_cast<size_t>(count));

  // Accumulate samples and run YIN when we have a full frame
  int remaining = count;
  int offset = 0;

  while (remaining > 0) {
    int needed = FRAME_SIZE - bufferedSamples_;
    int toCopy = (remaining < needed) ? remaining : needed;

    for (int i = 0; i < toCopy; ++i) {
      frameBuffer_[bufferedSamples_ + i] = filtered[offset + i];
    }

    bufferedSamples_ += toCopy;
    offset += toCopy;
    remaining -= toCopy;

    if (bufferedSamples_ >= FRAME_SIZE) {
      PitchResult result = yin_.detect(frameBuffer_, FRAME_SIZE);

      if (result.frequency >= MIN_FREQUENCY &&
          result.frequency <= MAX_FREQUENCY &&
          result.confidence >= MIN_CONFIDENCE) {
        NoteInfo noteInfo = NoteMapper::mapToNote(result.frequency);
        latestPitch_.store(result.frequency, result.confidence, noteInfo);
      }

      // Hop: keep the last (FRAME_SIZE - HOP_SIZE) samples
      int keep = FRAME_SIZE - HOP_SIZE;
      for (int i = 0; i < keep; ++i) {
        frameBuffer_[i] = frameBuffer_[HOP_SIZE + i];
      }
      bufferedSamples_ = keep;
    }
  }

  return oboe::DataCallbackResult::Continue;
}

void OboeAudioCapture::onErrorAfterClose(oboe::AudioStream* /*stream*/,
                                          oboe::Result error) {
  LOGE("Stream error after close: %s", oboe::convertToText(error));

  // Attempt to restart if we were still supposed to be running (audio focus loss/recovery)
  if (running_.load(std::memory_order_acquire)) {
    LOGI("Attempting to restart stream after error...");
    running_.store(false, std::memory_order_release);
    stream_.reset();
    bufferedSamples_ = 0;
    start();
  }
}
