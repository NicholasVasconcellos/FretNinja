#include "yin.h"
#include "note_mapper.h"
#include "ring_buffer.h"
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <vector>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

static std::vector<float> generateSine(float freq, float sample_rate, int num_samples) {
  std::vector<float> buf(num_samples);
  for (int i = 0; i < num_samples; ++i) {
    buf[i] = std::sin(2.0 * M_PI * freq * i / sample_rate);
  }
  return buf;
}

static float freqToCents(float detected, float expected) {
  return 1200.0f * std::log2(detected / expected);
}

static int failures = 0;

static void assertCents(const char* label, float detected, float expected,
                        float tolerance_cents) {
  float cents = freqToCents(detected, expected);
  bool pass = std::fabs(cents) <= tolerance_cents;
  std::printf("[%s] %s: detected=%.2f Hz, expected=%.2f Hz, error=%.2f cents\n",
              pass ? "PASS" : "FAIL", label, detected, expected, cents);
  if (!pass) ++failures;
}

static void assertConfidenceBelow(const char* label, float confidence,
                                  float threshold) {
  bool pass = confidence < threshold;
  std::printf("[%s] %s: confidence=%.4f (threshold=%.4f)\n",
              pass ? "PASS" : "FAIL", label, confidence, threshold);
  if (!pass) ++failures;
}

static void assertNoteMapping(const char* label, float freq,
                              const char* expected_note, int expected_octave,
                              float max_cents) {
  NoteInfo info = NoteMapper::mapToNote(freq);
  bool note_ok = info.note == expected_note;
  bool octave_ok = info.octave == expected_octave;
  bool cents_ok = std::fabs(info.cents) <= max_cents;
  bool pass = note_ok && octave_ok && cents_ok;
  std::printf("[%s] %s: %.2f Hz -> %s%d (%.2f cents)\n",
              pass ? "PASS" : "FAIL", label, freq, info.note.c_str(),
              info.octave, info.cents);
  if (!pass) ++failures;
}

int main() {
  YIN yin(SAMPLE_RATE, FRAME_SIZE, YIN_THRESHOLD);

  std::printf("=== YIN Pitch Detection Tests ===\n\n");

  // Test 1: A4 (440Hz) — within +/- 1 cent
  {
    auto buf = generateSine(440.0f, SAMPLE_RATE, FRAME_SIZE);
    PitchResult r = yin.detect(buf.data(), buf.size());
    assertCents("A4 (440 Hz)", r.frequency, 440.0f, 1.0f);
  }

  // Test 2: E2 (82.4Hz) — within +/- 5 cents
  {
    auto buf = generateSine(82.4f, SAMPLE_RATE, FRAME_SIZE);
    PitchResult r = yin.detect(buf.data(), buf.size());
    assertCents("E2 (82.4 Hz)", r.frequency, 82.4f, 5.0f);
  }

  // Test 3: 1000Hz — within +/- 1 cent
  {
    auto buf = generateSine(1000.0f, SAMPLE_RATE, FRAME_SIZE);
    PitchResult r = yin.detect(buf.data(), buf.size());
    assertCents("1000 Hz", r.frequency, 1000.0f, 1.0f);
  }

  // Test 4: 4000Hz — within +/- 1 cent
  {
    auto buf = generateSine(4000.0f, SAMPLE_RATE, FRAME_SIZE);
    PitchResult r = yin.detect(buf.data(), buf.size());
    assertCents("4000 Hz", r.frequency, 4000.0f, 1.0f);
  }

  // Test 5: Silence — low confidence
  {
    std::vector<float> silence(FRAME_SIZE, 0.0f);
    PitchResult r = yin.detect(silence.data(), silence.size());
    assertConfidenceBelow("Silence", r.confidence, 0.5f);
  }

  std::printf("\n=== Note Mapper Tests ===\n\n");

  // Test 6: 440Hz -> A4, ~0 cents
  assertNoteMapping("440 Hz -> A4", 440.0f, "A", 4, 0.5f);

  // Test 7: 261.63Hz -> C4
  assertNoteMapping("261.63 Hz -> C4", 261.63f, "C", 4, 5.0f);

  // Test 8: 82.41Hz -> E2
  assertNoteMapping("82.41 Hz -> E2", 82.41f, "E", 2, 5.0f);

  std::printf("\n=== Ring Buffer Tests ===\n\n");

  // Test 9: Basic write/read
  {
    RingBuffer rb;
    float write_data[10];
    for (int i = 0; i < 10; ++i) write_data[i] = static_cast<float>(i);

    size_t written = rb.write(write_data, 10);
    bool pass = (written == 10 && rb.available() == 10);
    std::printf("[%s] RingBuffer write: wrote=%zu, available=%zu\n",
                pass ? "PASS" : "FAIL", written, rb.available());
    if (!pass) ++failures;

    float read_data[10] = {};
    size_t read_count = rb.read(read_data, 10);
    bool data_ok = (read_count == 10);
    for (int i = 0; i < 10 && data_ok; ++i) {
      if (read_data[i] != static_cast<float>(i)) data_ok = false;
    }
    std::printf("[%s] RingBuffer read: read=%zu, data_correct=%s\n",
                data_ok ? "PASS" : "FAIL", read_count,
                data_ok ? "yes" : "no");
    if (!data_ok) ++failures;
  }

  // Test 10: Wrap-around
  {
    RingBuffer rb;
    // Fill most of the buffer
    std::vector<float> big(4000, 1.0f);
    rb.write(big.data(), big.size());
    // Read it all out
    std::vector<float> discard(4000);
    rb.read(discard.data(), discard.size());
    // Now write across the wrap boundary
    float wrap_data[200];
    for (int i = 0; i < 200; ++i) wrap_data[i] = static_cast<float>(i + 100);
    size_t written = rb.write(wrap_data, 200);
    float read_back[200] = {};
    size_t read_count = rb.read(read_back, 200);
    bool pass = (written == 200 && read_count == 200);
    for (int i = 0; i < 200 && pass; ++i) {
      if (read_back[i] != static_cast<float>(i + 100)) pass = false;
    }
    std::printf("[%s] RingBuffer wrap-around: written=%zu, read=%zu\n",
                pass ? "PASS" : "FAIL", written, read_count);
    if (!pass) ++failures;
  }

  std::printf("\n=== Summary ===\n");
  if (failures == 0) {
    std::printf("All tests passed!\n");
  } else {
    std::printf("%d test(s) FAILED\n", failures);
  }

  return failures;
}
