#include "../yin.h"
#include "../note_mapper.h"
#include <cassert>
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <ctime>
#include <vector>

// ---------- helpers ----------

static std::vector<float> generateSine(float freq, float sampleRate, int length) {
  std::vector<float> buf(length);
  for (int i = 0; i < length; ++i) {
    buf[i] = 0.8f * std::sin(2.0f * M_PI * freq * i / sampleRate);
  }
  return buf;
}

static std::vector<float> addGaussianNoise(const std::vector<float>& signal, float snrDb) {
  // Calculate signal power
  float signalPower = 0.0f;
  for (float s : signal) signalPower += s * s;
  signalPower /= static_cast<float>(signal.size());

  // Noise power from SNR
  float noisePower = signalPower / std::pow(10.0f, snrDb / 10.0f);
  float noiseStddev = std::sqrt(noisePower);

  // Simple Box-Muller transform for gaussian noise
  std::vector<float> noisy(signal.size());
  std::srand(42); // deterministic seed
  for (size_t i = 0; i < signal.size(); ++i) {
    float u1 = (static_cast<float>(std::rand()) + 1.0f) / (static_cast<float>(RAND_MAX) + 1.0f);
    float u2 = (static_cast<float>(std::rand()) + 1.0f) / (static_cast<float>(RAND_MAX) + 1.0f);
    float z = std::sqrt(-2.0f * std::log(u1)) * std::cos(2.0f * M_PI * u2);
    noisy[i] = signal[i] + noiseStddev * z;
  }
  return noisy;
}

static float frequencyToCents(float detected, float expected) {
  return 1200.0f * std::log2(detected / expected);
}

// ---------- YIN accuracy tests ----------

static int passed = 0;
static int failed = 0;

#define TEST(name) \
  do { std::printf("  %-50s", name); } while(0)

#define PASS() \
  do { std::printf("PASS\n"); ++passed; } while(0)

#define FAIL(msg) \
  do { std::printf("FAIL: %s\n", msg); ++failed; } while(0)

#define ASSERT_NEAR(val, expected, tolerance, msg) \
  do { \
    float v_ = (val); float e_ = (expected); float t_ = (tolerance); \
    if (std::fabs(v_ - e_) > t_) { \
      char buf_[256]; \
      std::snprintf(buf_, sizeof(buf_), "%s (got %.4f, expected %.4f ± %.4f)", msg, v_, e_, t_); \
      FAIL(buf_); return; \
    } \
  } while(0)

void test_yin_sine_E2() {
  TEST("YIN detects E2 (82.41 Hz) within ±5 cents");
  YIN yin(SAMPLE_RATE, FRAME_SIZE, YIN_THRESHOLD);
  auto buf = generateSine(82.41f, SAMPLE_RATE, FRAME_SIZE);
  auto result = yin.detect(buf.data(), buf.size());
  if (result.confidence < MIN_CONFIDENCE) { FAIL("low confidence"); return; }
  float cents = std::fabs(frequencyToCents(result.frequency, 82.41f));
  ASSERT_NEAR(cents, 0.0f, 5.0f, "cents off");
  PASS();
}

void test_yin_sine_A3() {
  TEST("YIN detects A3 (220 Hz) within ±1 cent");
  YIN yin(SAMPLE_RATE, FRAME_SIZE, YIN_THRESHOLD);
  auto buf = generateSine(220.0f, SAMPLE_RATE, FRAME_SIZE);
  auto result = yin.detect(buf.data(), buf.size());
  if (result.confidence < MIN_CONFIDENCE) { FAIL("low confidence"); return; }
  float cents = std::fabs(frequencyToCents(result.frequency, 220.0f));
  ASSERT_NEAR(cents, 0.0f, 1.0f, "cents off");
  PASS();
}

void test_yin_sine_A4() {
  TEST("YIN detects A4 (440 Hz) within ±1 cent");
  YIN yin(SAMPLE_RATE, FRAME_SIZE, YIN_THRESHOLD);
  auto buf = generateSine(440.0f, SAMPLE_RATE, FRAME_SIZE);
  auto result = yin.detect(buf.data(), buf.size());
  if (result.confidence < MIN_CONFIDENCE) { FAIL("low confidence"); return; }
  float cents = std::fabs(frequencyToCents(result.frequency, 440.0f));
  ASSERT_NEAR(cents, 0.0f, 1.0f, "cents off");
  PASS();
}

void test_yin_sine_A5() {
  TEST("YIN detects A5 (880 Hz) within ±1 cent");
  YIN yin(SAMPLE_RATE, FRAME_SIZE, YIN_THRESHOLD);
  auto buf = generateSine(880.0f, SAMPLE_RATE, FRAME_SIZE);
  auto result = yin.detect(buf.data(), buf.size());
  if (result.confidence < MIN_CONFIDENCE) { FAIL("low confidence"); return; }
  float cents = std::fabs(frequencyToCents(result.frequency, 880.0f));
  ASSERT_NEAR(cents, 0.0f, 1.0f, "cents off");
  PASS();
}

void test_yin_sine_C8() {
  TEST("YIN detects C8 (4186 Hz) within ±5 cents");
  YIN yin(SAMPLE_RATE, FRAME_SIZE, YIN_THRESHOLD);
  auto buf = generateSine(4186.0f, SAMPLE_RATE, FRAME_SIZE);
  auto result = yin.detect(buf.data(), buf.size());
  if (result.confidence < MIN_CONFIDENCE) { FAIL("low confidence"); return; }
  float cents = std::fabs(frequencyToCents(result.frequency, 4186.0f));
  ASSERT_NEAR(cents, 0.0f, 5.0f, "cents off");
  PASS();
}

// ---------- YIN with noise ----------

void test_yin_noisy_A4() {
  TEST("YIN detects A4 with SNR=20dB noise");
  YIN yin(SAMPLE_RATE, FRAME_SIZE, YIN_THRESHOLD);
  auto clean = generateSine(440.0f, SAMPLE_RATE, FRAME_SIZE);
  auto noisy = addGaussianNoise(clean, 20.0f);
  auto result = yin.detect(noisy.data(), noisy.size());
  if (result.confidence < MIN_CONFIDENCE) { FAIL("low confidence"); return; }
  float cents = std::fabs(frequencyToCents(result.frequency, 440.0f));
  ASSERT_NEAR(cents, 0.0f, 5.0f, "cents off with noise");
  PASS();
}

void test_yin_noisy_E2() {
  TEST("YIN detects E2 with SNR=20dB noise");
  YIN yin(SAMPLE_RATE, FRAME_SIZE, YIN_THRESHOLD);
  auto clean = generateSine(82.41f, SAMPLE_RATE, FRAME_SIZE);
  auto noisy = addGaussianNoise(clean, 20.0f);
  auto result = yin.detect(noisy.data(), noisy.size());
  if (result.confidence < MIN_CONFIDENCE) { FAIL("low confidence"); return; }
  float cents = std::fabs(frequencyToCents(result.frequency, 82.41f));
  // Low frequencies have fewer cycles per frame, so noise degrades accuracy more
  ASSERT_NEAR(cents, 0.0f, 20.0f, "cents off with noise");
  PASS();
}

// ---------- YIN with silence ----------

void test_yin_silence() {
  TEST("YIN returns low confidence for silence");
  YIN yin(SAMPLE_RATE, FRAME_SIZE, YIN_THRESHOLD);
  std::vector<float> silence(FRAME_SIZE, 0.0f);
  auto result = yin.detect(silence.data(), silence.size());
  if (result.confidence >= 0.5f) {
    FAIL("confidence should be < 0.5 for silence");
    return;
  }
  PASS();
}

// ---------- EMA filter tests ----------

void test_ema_smoothing() {
  TEST("EMA smoothing reduces frame-to-frame jitter");
  YIN yin(SAMPLE_RATE, FRAME_SIZE, YIN_THRESHOLD);

  // First detection to initialize EMA
  auto buf1 = generateSine(440.0f, SAMPLE_RATE, FRAME_SIZE);
  auto r1 = yin.detect(buf1.data(), buf1.size());
  if (r1.confidence < MIN_CONFIDENCE) { FAIL("low confidence on init"); return; }

  // Second detection at slightly different frequency — EMA should smooth
  auto buf2 = generateSine(441.0f, SAMPLE_RATE, FRAME_SIZE);
  auto r2 = yin.detect(buf2.data(), buf2.size());
  if (r2.confidence < MIN_CONFIDENCE) { FAIL("low confidence on second"); return; }

  // Smoothed result should be between 440 and 441 (not jump all the way to 441)
  if (r2.frequency >= 441.0f || r2.frequency <= 440.0f) {
    char msg[128];
    std::snprintf(msg, sizeof(msg), "expected smoothed between 440-441, got %.2f", r2.frequency);
    FAIL(msg);
    return;
  }
  PASS();
}

void test_ema_reset_on_large_jump() {
  TEST("EMA resets on >1 semitone jump");
  YIN yin(SAMPLE_RATE, FRAME_SIZE, YIN_THRESHOLD);

  // Establish EMA at A4
  auto buf1 = generateSine(440.0f, SAMPLE_RATE, FRAME_SIZE);
  yin.detect(buf1.data(), buf1.size());

  // Jump to E5 (659.25 Hz) — way more than 1 semitone
  auto buf2 = generateSine(659.25f, SAMPLE_RATE, FRAME_SIZE);
  auto r2 = yin.detect(buf2.data(), buf2.size());
  if (r2.confidence < MIN_CONFIDENCE) { FAIL("low confidence"); return; }

  // Should snap to new frequency, not be dragged toward 440
  float cents = std::fabs(frequencyToCents(r2.frequency, 659.25f));
  ASSERT_NEAR(cents, 0.0f, 2.0f, "EMA should reset on large jump");
  PASS();
}

// ---------- RMS and clipping ----------

void test_rms_known_signal() {
  TEST("computeRMS returns correct value");
  // RMS of a constant signal of value 0.5 should be 0.5
  std::vector<float> buf(1024, 0.5f);
  float rms = YIN::computeRMS(buf.data(), buf.size());
  ASSERT_NEAR(rms, 0.5f, 0.001f, "RMS mismatch");
  PASS();
}

void test_clipping_detected() {
  TEST("detectClipping flags signal at ±0.99");
  std::vector<float> buf(FRAME_SIZE, 0.0f);
  buf[100] = 0.995f;
  assert(YIN::detectClipping(buf.data(), buf.size()));
  PASS();
}

void test_no_clipping() {
  TEST("detectClipping returns false for clean signal");
  auto buf = generateSine(440.0f, SAMPLE_RATE, FRAME_SIZE);
  // amplitude is 0.8, well below 0.99
  assert(!YIN::detectClipping(buf.data(), buf.size()));
  PASS();
}

// ---------- main ----------

int main() {
  std::printf("\n=== YIN Pitch Detection Tests ===\n\n");

  std::printf("Frequency accuracy:\n");
  test_yin_sine_E2();
  test_yin_sine_A3();
  test_yin_sine_A4();
  test_yin_sine_A5();
  test_yin_sine_C8();

  std::printf("\nNoise robustness:\n");
  test_yin_noisy_A4();
  test_yin_noisy_E2();

  std::printf("\nSilence handling:\n");
  test_yin_silence();

  std::printf("\nEMA smoothing:\n");
  test_ema_smoothing();
  test_ema_reset_on_large_jump();

  std::printf("\nSignal utilities:\n");
  test_rms_known_signal();
  test_clipping_detected();
  test_no_clipping();

  std::printf("\n--- Results: %d passed, %d failed ---\n\n", passed, failed);
  return failed > 0 ? 1 : 0;
}
