#include "yin.h"
#include <cmath>

// The YIN algorithm (de Cheveigné & Kawahara, 2002) estimates the fundamental
// frequency of a monophonic audio signal. It works by computing the difference
// function (a measure of self-similarity at various lag values), normalizing it
// to remove the amplitude dependency, finding the first dip below a threshold,
// and refining the lag with parabolic interpolation to achieve sub-sample
// accuracy. The resulting lag (in samples) is converted to frequency via
// frequency = sampleRate / lag.

YIN::YIN(float sample_rate, int frame_size, float threshold)
    : sample_rate_(sample_rate),
      frame_size_(frame_size),
      half_size_(frame_size / 2),
      threshold_(threshold),
      diff_(frame_size / 2, 0.0f),
      cmnd_(frame_size / 2, 0.0f) {}

void YIN::reset() {
  ema_frequency_ = 0.0f;
  ema_initialized_ = false;
}

void YIN::setRmsThreshold(float threshold) { rms_threshold_ = threshold; }
void YIN::setMinConfidence(float confidence) { min_confidence_ = confidence; }
float YIN::getRmsThreshold() const { return rms_threshold_; }
float YIN::getMinConfidence() const { return min_confidence_; }

float YIN::computeRMS(const float* buffer, int length) {
  float sum = 0.0f;
  for (int i = 0; i < length; ++i) {
    sum += buffer[i] * buffer[i];
  }
  return std::sqrt(sum / static_cast<float>(length));
}

bool YIN::detectClipping(const float* buffer, int length) {
  for (int i = 0; i < length; ++i) {
    if (std::fabs(buffer[i]) >= CLIPPING_THRESHOLD) {
      return true;
    }
  }
  return false;
}

// YIN Step 1: Difference function.
// For each lag tau, compute the squared difference between the signal and a
// shifted copy of itself: d(tau) = sum_i (x[i] - x[i + tau])^2.
// A periodic signal will have d(tau) ≈ 0 at the fundamental period.
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

// YIN Step 2: Cumulative mean normalized difference (CMND).
// Normalizes d(tau) by its running average to remove the bias that causes
// the raw difference function to favor tau=0. The CMND dips below 1.0 at
// lags that are likely fundamental periods, making threshold-based detection
// reliable: cmnd(tau) = d(tau) / ((1/tau) * sum_{j=1..tau} d(j)).
void YIN::cumulativeMeanNormalizedDifference() {
  cmnd_[0] = 1.0f;
  float running_sum = 0.0f;
  for (int tau = 1; tau < half_size_; ++tau) {
    running_sum += diff_[tau];
    cmnd_[tau] = diff_[tau] * tau / running_sum;
  }
}

// YIN Step 3: Absolute threshold.
// Scan the CMND for the first value below the threshold (0.15), constrained
// to the lag range corresponding to our frequency bounds (65–4200 Hz).
// Once a dip is found, walk forward to its local minimum to avoid picking the
// edge of the dip. Returns the best lag, or -1 if no pitch is detected.
int YIN::absoluteThreshold() {
  int min_tau = static_cast<int>(sample_rate_ / MAX_FREQUENCY);
  int max_tau = static_cast<int>(sample_rate_ / MIN_FREQUENCY);
  if (max_tau >= half_size_) {
    max_tau = half_size_ - 1;
  }
  if (min_tau < 1) {
    min_tau = 1;
  }

  for (int tau = min_tau; tau < max_tau; ++tau) {
    if (cmnd_[tau] < threshold_) {
      while (tau + 1 < max_tau && cmnd_[tau + 1] < cmnd_[tau]) {
        ++tau;
      }
      return tau;
    }
  }
  return -1;
}

// YIN Step 4: Parabolic interpolation for sub-sample accuracy.
// Fits a parabola through the three points around the integer lag minimum
// (tau-1, tau, tau+1) and returns the fractional tau at the parabola's vertex.
// Uses the raw difference function (not CMND) because the CMND's tau-dependent
// normalization distorts the parabola shape at small tau values.
float YIN::parabolicInterpolation(int tau) {
  if (tau <= 0 || tau >= half_size_ - 1) {
    return static_cast<float>(tau);
  }

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

// Main detection pipeline: pre-checks -> YIN steps 1-4 -> frequency conversion -> EMA smoothing.
PitchResult YIN::detect(const float* buffer, int length) {
  PitchResult result{};

  if (length < frame_size_) {
    return result;
  }

  // Flag clipping (samples near ±1.0) so callers can warn the user
  result.clipping = detectClipping(buffer, length);

  // Skip expensive YIN computation if the signal is below the silence threshold
  if (computeRMS(buffer, length) < rms_threshold_) {
    ema_frequency_ = 0.0f;
    ema_initialized_ = false;
    return result;
  }

  // --- YIN algorithm steps 1–4 ---
  difference(buffer, length);                     // Step 1: difference function
  cumulativeMeanNormalizedDifference();            // Step 2: CMND normalization
  int tau = absoluteThreshold();                   // Step 3: find first dip below threshold
  if (tau == -1) {
    ema_frequency_ = 0.0f;
    ema_initialized_ = false;
    return result;
  }
  float refined_tau = parabolicInterpolation(tau); // Step 4: sub-sample refinement

  // Step 5: Convert lag (samples) to frequency: f = sampleRate / tau
  float frequency = sample_rate_ / refined_tau;

  if (frequency < MIN_FREQUENCY || frequency > MAX_FREQUENCY) {
    return result;
  }

  // Confidence: invert the CMND value (lower CMND = more periodic = higher confidence)
  float confidence = 1.0f - cmnd_[tau];
  if (confidence < 0.0f) confidence = 0.0f;
  if (confidence > 1.0f) confidence = 1.0f;

  if (confidence < min_confidence_) {
    ema_frequency_ = 0.0f;
    ema_initialized_ = false;
    result.frequency = frequency;
    result.confidence = confidence;
    return result;
  }

  // EMA (exponential moving average) smoothing reduces frame-to-frame jitter.
  // On large jumps (>1 semitone), the filter resets instantly to the new frequency
  // so that note transitions are not sluggish.
  if (!ema_initialized_) {
    ema_frequency_ = frequency;
    ema_initialized_ = true;
  } else {
    float ratio = frequency / ema_frequency_;
    constexpr float SEMITONE_RATIO = 1.05946309f; // 2^(1/12)
    if (ratio > SEMITONE_RATIO || ratio < 1.0f / SEMITONE_RATIO) {
      ema_frequency_ = frequency; // snap to new note
    } else {
      ema_frequency_ = EMA_ALPHA * frequency + (1.0f - EMA_ALPHA) * ema_frequency_;
    }
  }

  result.frequency = ema_frequency_;
  result.confidence = confidence;
  return result;
}
