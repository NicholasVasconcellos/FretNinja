#pragma once

#include "pitch_result.h"
#include <vector>

// DSP constants
constexpr float SAMPLE_RATE = 44100.0f;
constexpr int FRAME_SIZE = 2048;
constexpr int HOP_SIZE = 1024;
constexpr float YIN_THRESHOLD = 0.15f;
constexpr float MIN_FREQUENCY = 65.0f;
constexpr float MAX_FREQUENCY = 4200.0f;
constexpr float MIN_CONFIDENCE = 0.5f;

class YIN {
public:
  YIN(float sample_rate = SAMPLE_RATE, int frame_size = FRAME_SIZE,
      float threshold = YIN_THRESHOLD);

  PitchResult detect(const float* buffer, int length);

private:
  float sample_rate_;
  int frame_size_;
  int half_size_;
  float threshold_;

  // Preallocated working buffers
  std::vector<float> diff_;
  std::vector<float> cmnd_;

  void difference(const float* buffer, int length);
  void cumulativeMeanNormalizedDifference();
  int absoluteThreshold();
  float parabolicInterpolation(int tau);
};
