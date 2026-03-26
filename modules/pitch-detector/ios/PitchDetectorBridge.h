#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface PitchDetectorBridge : NSObject

+ (instancetype)shared;

/// Write audio samples into the ring buffer and run pitch detection when a full frame is available.
- (void)processAudioBuffer:(const float *)buffer frameCount:(uint32_t)frameCount;

/// Read the latest pitch detection result. Thread-safe.
- (NSDictionary<NSString *, id> *)getLatestPitch;

/// Reset internal state (ring buffer, frame buffer, latest result).
- (void)reset;

@end

NS_ASSUME_NONNULL_END
