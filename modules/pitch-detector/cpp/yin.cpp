#include "yin.h"
#include <cmath>

YIN::YIN(float sample_rate, int frame_size, float threshold)
    : sample_rate_(sample_rate),
      frame_size_(frame_size),
      half_size_(frame_size / 2),
      threshold_(threshold),
      diff_(frame_size / 2, 0.0f),
      cmnd_(frame_size / 2, 0.0f) {}

void YIN::difference(const float* buffer, int length) {
  int len = half_size_;
  if (length < frame_size_) {
    len = length / 2;
  }
  for (int tau = 0; tau < len; ++tau) {
    diff_[tau] = 0.0f;
    for (int i = 0; i < len; ++i) {
      float delta = buffer[i] - buffer[i + tau];
      diff_[tau] += delta * delta;
    }
  }
}

void YIN::cumulativeMeanNormalizedDifference() {
  cmnd_[0] = 1.0f;
  float running_sum = 0.0f;
  for (int tau = 1; tau < half_size_; ++tau) {
    running_sum += diff_[tau];
    cmnd_[tau] = diff_[tau] * tau / running_sum;
  }
}

int YIN::absoluteThreshold() {
  // Start from tau corresponding to MAX_FREQUENCY
  int min_tau = static_cast<int>(sample_rate_ / MAX_FREQUENCY);
  // End at tau corresponding to MIN_FREQUENCY
  int max_tau = static_cast<int>(sample_rate_ / MIN_FREQUENCY);
  if (max_tau >= half_size_) {
    max_tau = half_size_ - 1;
  }
  if (min_tau < 1) {
    min_tau = 1;
  }

  for (int tau = min_tau; tau < max_tau; ++tau) {
    if (cmnd_[tau] < threshold_) {
      // Find the local minimum in this dip
      while (tau + 1 < max_tau && cmnd_[tau + 1] < cmnd_[tau]) {
        ++tau;
      }
      return tau;
    }
  }
  return -1; // No pitch found
}

float YIN::parabolicInterpolation(int tau) {
  if (tau <= 0 || tau >= half_size_ - 1) {
    return static_cast<float>(tau);
  }

  // Use the raw difference function for interpolation — the CMND's
  // tau-dependent normalization distorts the parabola at small tau values,
  // whereas the raw difference is a clean sum-of-squares around the minimum.
  float s0 = diff_[tau - 1];
  float s1 = diff_[tau];
  float s2 = diff_[tau + 1];

  float denom = s0 - 2.0f * s1 + s2;
  if (std::fabs(denom) < 1e-12f) {
    return static_cast<float>(tau);
  }

  float adjustment = (s0 - s2) / (2.0f * denom);

  // Guard against extreme adjustments
  if (std::isnan(adjustment) || std::isinf(adjustment) ||
      std::fabs(adjustment) > 1.0f) {
    return static_cast<float>(tau);
  }

  return static_cast<float>(tau) + adjustment;
}

PitchResult YIN::detect(const float* buffer, int length) {
  PitchResult result = {0.0f, 0.0f};

  if (length < frame_size_) {
    return result;
  }

  // Step 1: Difference function
  difference(buffer, length);

  // Step 2: Cumulative mean normalized difference
  cumulativeMeanNormalizedDifference();

  // Step 3: Absolute threshold
  int tau = absoluteThreshold();
  if (tau == -1) {
    return result;
  }

  // Step 4: Parabolic interpolation for sub-sample accuracy
  float refined_tau = parabolicInterpolation(tau);

  // Step 5: Convert to frequency
  float frequency = sample_rate_ / refined_tau;

  // Clamp to valid range
  if (frequency < MIN_FREQUENCY || frequency > MAX_FREQUENCY) {
    return result;
  }

  // Confidence is inverse of the CMND value (lower CMND = higher confidence)
  float confidence = 1.0f - cmnd_[tau];
  if (confidence < 0.0f) confidence = 0.0f;
  if (confidence > 1.0f) confidence = 1.0f;

  result.frequency = frequency;
  result.confidence = confidence;
  return result;
}
