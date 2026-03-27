#import "PitchDetectorBridge.h"
#include "yin.h"
#include "note_mapper.h"
#include "ring_buffer.h"
#include "high_pass_filter.h"
#include <mutex>
#include <cstring>
#include <atomic>
#include <chrono>
#include <vector>

@implementation PitchDetectorBridge {
    RingBuffer _ringBuffer;
    YIN _yin;
    HighPassFilter _highPass;

    // Sliding window frame buffer for overlapping detection
    float _frameBuffer[FRAME_SIZE];
    int _frameBufferCount;

    // Debug counters
    int _detectCallCount;
    int _lastLoggedDetectCount;
    std::atomic<int> _bufferCallCount;
    std::atomic<float> _lastRms;

    // Consecutive frames with no valid pitch — used to clear stale results
    int _noPitchCount;

    // Pre-allocated buffer for high-pass filtering
    std::vector<float> _filterBuffer;

    // Thread-safe result storage
    std::mutex _resultMutex;
    float _latestFrequency;
    float _latestConfidence;
    std::string _latestNote;
    int _latestOctave;
    float _latestCents;

    // Latency measurement (written from audio thread, read from main thread)
    std::atomic<int64_t> _lastBufferTimestampNs;
}

+ (instancetype)shared {
    static PitchDetectorBridge *instance = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        instance = [[PitchDetectorBridge alloc] init];
    });
    return instance;
}

- (instancetype)init {
    self = [super init];
    if (self) {
        _frameBufferCount = 0;
        std::memset(_frameBuffer, 0, sizeof(_frameBuffer));
        _latestFrequency = 0;
        _latestConfidence = 0;
        _latestOctave = 0;
        _latestCents = 0;
        _lastBufferTimestampNs.store(0, std::memory_order_relaxed);
        _bufferCallCount.store(0, std::memory_order_relaxed);
        _lastRms.store(0.0f, std::memory_order_relaxed);
    }
    return self;
}

- (void)configureSampleRate:(float)sampleRate {
    NSLog(@"[PitchDebug] configureSampleRate: %.0f Hz", sampleRate);
    _yin = YIN(sampleRate, FRAME_SIZE, YIN_THRESHOLD);
    _highPass = HighPassFilter(60.0f, sampleRate);
}

- (void)processAudioBuffer:(const float *)buffer frameCount:(uint32_t)frameCount {
    _bufferCallCount.fetch_add(1, std::memory_order_relaxed);

    // Compute RMS of incoming raw buffer for debug
    float rawRms = 0.0f;
    for (uint32_t i = 0; i < frameCount; ++i) {
        rawRms += buffer[i] * buffer[i];
    }
    rawRms = std::sqrt(rawRms / static_cast<float>(frameCount));
    _lastRms.store(rawRms, std::memory_order_relaxed);

    // Record timestamp for latency measurement
    auto now = std::chrono::steady_clock::now();
    _lastBufferTimestampNs.store(
        std::chrono::duration_cast<std::chrono::nanoseconds>(
            now.time_since_epoch()).count(),
        std::memory_order_release);

    // Apply high-pass filter to remove DC offset and low-frequency rumble
    if (_filterBuffer.size() < frameCount) {
        _filterBuffer.resize(frameCount);
    }
    _highPass.process(buffer, _filterBuffer.data(), static_cast<int>(frameCount));
    const float* filtered = _filterBuffer.data();

    _ringBuffer.write(filtered, frameCount);

    while (_ringBuffer.available() >= static_cast<size_t>(FRAME_SIZE - _frameBufferCount)) {
        // Fill remainder of frame buffer from ring buffer
        size_t needed = static_cast<size_t>(FRAME_SIZE - _frameBufferCount);
        _ringBuffer.read(_frameBuffer + _frameBufferCount, needed);
        _frameBufferCount = FRAME_SIZE;

        // Run YIN pitch detection (includes RMS silence check, EMA smoothing)
        PitchResult result = _yin.detect(_frameBuffer, FRAME_SIZE);
        _detectCallCount++;

        // Log every detection for first 10, then every 50th
        if (_detectCallCount <= 10 || _detectCallCount % 50 == 0) {
            float rms = YIN::computeRMS(_frameBuffer, FRAME_SIZE);
            NSLog(@"[PitchDebug] detect #%d  rms=%.6f  freq=%.1f  conf=%.3f  clipping=%d",
                  _detectCallCount, rms, result.frequency, result.confidence, result.clipping);
        }

        if (result.confidence >= MIN_CONFIDENCE &&
            result.frequency >= MIN_FREQUENCY &&
            result.frequency <= MAX_FREQUENCY) {
            _noPitchCount = 0;
            NoteInfo noteInfo = NoteMapper::mapToNote(result.frequency);

            // Log every accepted detection
            if (_detectCallCount <= 20 || _detectCallCount % 50 == 0) {
                NSLog(@"[PitchDebug] ACCEPTED  note=%s%d  freq=%.1f  conf=%.3f  cents=%.1f",
                      noteInfo.note.c_str(), noteInfo.octave, result.frequency, result.confidence, noteInfo.cents);
            }

            std::lock_guard<std::mutex> lock(_resultMutex);
            _latestFrequency = result.frequency;
            _latestConfidence = result.confidence;
            _latestNote = noteInfo.note;
            _latestOctave = noteInfo.octave;
            _latestCents = noteInfo.cents;
        } else if (++_noPitchCount >= 3) {
            // Clear stale result after 3 consecutive non-detections (~60ms)
            // so the UI doesn't show a ghost note from old ambient noise
            std::lock_guard<std::mutex> lock(_resultMutex);
            _latestFrequency = 0;
            _latestConfidence = 0;
            _latestNote = "";
            _latestOctave = 0;
            _latestCents = 0;
        }

        // Slide window by HOP_SIZE for overlapping frames
        std::memmove(_frameBuffer, _frameBuffer + HOP_SIZE,
                     (FRAME_SIZE - HOP_SIZE) * sizeof(float));
        _frameBufferCount = FRAME_SIZE - HOP_SIZE;
    }
}

- (NSDictionary<NSString *, id> *)getLatestPitch {
    std::lock_guard<std::mutex> lock(_resultMutex);

    NSString *noteString = @"";
    if (!_latestNote.empty()) {
        noteString = [NSString stringWithUTF8String:_latestNote.c_str()];
    }

    return @{
        @"frequency": @(_latestFrequency),
        @"confidence": @(_latestConfidence),
        @"note": noteString,
        @"octave": @(_latestOctave),
        @"cents": @(_latestCents),
        @"_dbgBuffers": @(_bufferCallCount.load(std::memory_order_relaxed)),
        @"_dbgDetects": @(_detectCallCount),
        @"_dbgRms": @(_lastRms.load(std::memory_order_relaxed))
    };
}

- (double)getLatencyMs {
    int64_t ts = _lastBufferTimestampNs.load(std::memory_order_acquire);
    if (ts == 0) return 0.0;
    auto now = std::chrono::steady_clock::now();
    int64_t nowNs = std::chrono::duration_cast<std::chrono::nanoseconds>(
        now.time_since_epoch()).count();
    return static_cast<double>(nowNs - ts) / 1e6;
}

- (void)reset {
    // Drain ring buffer
    float discard[512];
    while (_ringBuffer.available() > 0) {
        _ringBuffer.read(discard, std::min(_ringBuffer.available(), static_cast<size_t>(512)));
    }

    _frameBufferCount = 0;
    std::memset(_frameBuffer, 0, sizeof(_frameBuffer));

    // Reset DSP state
    _yin.reset();
    _highPass.reset();

    std::lock_guard<std::mutex> lock(_resultMutex);
    _latestFrequency = 0;
    _latestConfidence = 0;
    _latestNote = "";
    _latestOctave = 0;
    _latestCents = 0;

    _lastBufferTimestampNs.store(0, std::memory_order_relaxed);
}

@end
