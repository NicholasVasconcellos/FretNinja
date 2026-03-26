#import "PitchDetectorBridge.h"
#include "yin.h"
#include "note_mapper.h"
#include "ring_buffer.h"
#include <mutex>
#include <cstring>

@implementation PitchDetectorBridge {
    RingBuffer _ringBuffer;
    YIN _yin;

    // Sliding window frame buffer for overlapping detection
    float _frameBuffer[FRAME_SIZE];
    int _frameBufferCount;

    // Thread-safe result storage
    std::mutex _resultMutex;
    float _latestFrequency;
    float _latestConfidence;
    std::string _latestNote;
    int _latestOctave;
    float _latestCents;
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
    }
    return self;
}

- (void)processAudioBuffer:(const float *)buffer frameCount:(uint32_t)frameCount {
    _ringBuffer.write(buffer, frameCount);

    while (_ringBuffer.available() >= static_cast<size_t>(FRAME_SIZE - _frameBufferCount)) {
        // Fill remainder of frame buffer from ring buffer
        size_t needed = static_cast<size_t>(FRAME_SIZE - _frameBufferCount);
        _ringBuffer.read(_frameBuffer + _frameBufferCount, needed);
        _frameBufferCount = FRAME_SIZE;

        // Run YIN pitch detection
        PitchResult result = _yin.detect(_frameBuffer, FRAME_SIZE);

        if (result.confidence >= MIN_CONFIDENCE &&
            result.frequency >= MIN_FREQUENCY &&
            result.frequency <= MAX_FREQUENCY) {
            NoteInfo noteInfo = NoteMapper::mapToNote(result.frequency);

            std::lock_guard<std::mutex> lock(_resultMutex);
            _latestFrequency = result.frequency;
            _latestConfidence = result.confidence;
            _latestNote = noteInfo.note;
            _latestOctave = noteInfo.octave;
            _latestCents = noteInfo.cents;
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
        noteString = [NSString stringWithFormat:@"%s%d",
                      _latestNote.c_str(), _latestOctave];
    }

    return @{
        @"frequency": @(_latestFrequency),
        @"confidence": @(_latestConfidence),
        @"note": noteString
    };
}

- (void)reset {
    // Drain ring buffer
    float discard[512];
    while (_ringBuffer.available() > 0) {
        _ringBuffer.read(discard, std::min(_ringBuffer.available(), static_cast<size_t>(512)));
    }

    _frameBufferCount = 0;
    std::memset(_frameBuffer, 0, sizeof(_frameBuffer));

    std::lock_guard<std::mutex> lock(_resultMutex);
    _latestFrequency = 0;
    _latestConfidence = 0;
    _latestNote = "";
    _latestOctave = 0;
    _latestCents = 0;
}

@end
