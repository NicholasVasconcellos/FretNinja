#pragma once

#include <oboe/Oboe.h>
#include <atomic>
#include <memory>
#include "ring_buffer.h"
#include "yin.h"
#include "note_mapper.h"
#include "high_pass_filter.h"

struct AtomicPitchData {
  std::atomic<float> frequency{0.0f};
  std::atomic<float> confidence{0.0f};
  std::atomic<float> cents{0.0f};
  std::atomic<int> octave{0};
  // Note name stored as a small fixed buffer (e.g. "C#")
  std::atomic<char> noteName0{'\0'};
  std::atomic<char> noteName1{'\0'};
  std::atomic<char> noteName2{'\0'};

  void store(float freq, float conf, const NoteInfo& info) {
    frequency.store(freq, std::memory_order_relaxed);
    confidence.store(conf, std::memory_order_relaxed);
    cents.store(info.cents, std::memory_order_relaxed);
    octave.store(info.octave, std::memory_order_relaxed);
    const auto& n = info.note;
    noteName0.store(n.size() > 0 ? n[0] : '\0', std::memory_order_relaxed);
    noteName1.store(n.size() > 1 ? n[1] : '\0', std::memory_order_relaxed);
    noteName2.store(n.size() > 2 ? n[2] : '\0', std::memory_order_release);
  }

  void clear() {
    frequency.store(0.0f, std::memory_order_relaxed);
    confidence.store(0.0f, std::memory_order_relaxed);
    cents.store(0.0f, std::memory_order_relaxed);
    octave.store(0, std::memory_order_relaxed);
    noteName0.store('\0', std::memory_order_relaxed);
    noteName1.store('\0', std::memory_order_relaxed);
    noteName2.store('\0', std::memory_order_release);
  }

  void load(float& freq, float& conf, float& c, int& oct, char name[4]) {
    // Read note name last char first (release-paired)
    name[2] = noteName2.load(std::memory_order_acquire);
    name[1] = noteName1.load(std::memory_order_relaxed);
    name[0] = noteName0.load(std::memory_order_relaxed);
    name[3] = '\0';
    oct = octave.load(std::memory_order_relaxed);
    c = cents.load(std::memory_order_relaxed);
    conf = confidence.load(std::memory_order_relaxed);
    freq = frequency.load(std::memory_order_relaxed);
  }
};

class OboeAudioCapture : public oboe::AudioStreamCallback {
public:
  OboeAudioCapture();
  ~OboeAudioCapture();

  bool start();
  void stop();

  // Configure detection thresholds from JS
  void configure(float rmsThreshold, float nativeConfidence);

  // Read latest pitch result (thread-safe, lock-free)
  void getLatestPitch(float& frequency, float& confidence, float& cents,
                      int& octave, char noteName[4]);

  // Measure latency from last audio buffer arrival to now (in milliseconds)
  double getLatencyMs();

  // oboe::AudioStreamCallback
  oboe::DataCallbackResult onAudioReady(
      oboe::AudioStream* stream, void* audioData, int32_t numFrames) override;

  void onErrorAfterClose(oboe::AudioStream* stream,
                         oboe::Result error) override;

  // Debug accessors (match iOS _dbg* fields)
  int getDebugBufferCount() const { return bufferCallCount_.load(std::memory_order_relaxed); }
  int getDebugDetectCount() const { return detectCallCount_.load(std::memory_order_relaxed); }
  float getDebugRms() const { return lastRms_.load(std::memory_order_relaxed); }

private:
  std::shared_ptr<oboe::AudioStream> stream_;
  RingBuffer ringBuffer_;
  YIN yin_;
  HighPassFilter highPass_;
  float frameBuffer_[FRAME_SIZE];
  float filterBuffer_[4096];
  int bufferedSamples_ = 0;
  int noPitchCount_ = 0;
  AtomicPitchData latestPitch_;
  std::atomic<bool> running_{false};
  std::atomic<int64_t> lastBufferTimestampNs_{0};

  // Configured thresholds (persisted across YIN recreation in start())
  float configuredRmsThreshold_ = RMS_SILENCE_THRESHOLD;
  float configuredMinConfidence_ = MIN_CONFIDENCE;

  // Debug counters
  std::atomic<int> bufferCallCount_{0};
  std::atomic<int> detectCallCount_{0};
  std::atomic<float> lastRms_{0.0f};
};
