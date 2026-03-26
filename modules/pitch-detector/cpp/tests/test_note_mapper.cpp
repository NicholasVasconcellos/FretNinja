#include "../note_mapper.h"
#include <cassert>
#include <cmath>
#include <cstdio>
#include <string>

static int passed = 0;
static int failed = 0;

#define TEST(name) \
  do { std::printf("  %-50s", name); } while(0)

#define PASS() \
  do { std::printf("PASS\n"); ++passed; } while(0)

#define FAIL(msg) \
  do { std::printf("FAIL: %s\n", msg); ++failed; } while(0)

// ---------- tests ----------

void test_A4_440() {
  TEST("A4 = 440 Hz → note A, octave 4, 0 cents");
  auto info = NoteMapper::mapToNote(440.0f);
  if (info.note != "A") { FAIL("wrong note"); return; }
  if (info.octave != 4) { FAIL("wrong octave"); return; }
  if (std::fabs(info.cents) > 1.0f) { FAIL("cents not near 0"); return; }
  PASS();
}

void test_C4_261() {
  TEST("C4 = 261.63 Hz → note C, octave 4");
  auto info = NoteMapper::mapToNote(261.63f);
  if (info.note != "C") { FAIL("wrong note"); return; }
  if (info.octave != 4) { FAIL("wrong octave"); return; }
  if (std::fabs(info.cents) > 2.0f) { FAIL("cents too far from 0"); return; }
  PASS();
}

void test_E2_82() {
  TEST("E2 = 82.41 Hz → note E, octave 2");
  auto info = NoteMapper::mapToNote(82.41f);
  if (info.note != "E") { FAIL("wrong note"); return; }
  if (info.octave != 2) { FAIL("wrong octave"); return; }
  PASS();
}

void test_sharps() {
  TEST("F#4 = 369.99 Hz → note F#, octave 4");
  auto info = NoteMapper::mapToNote(369.99f);
  if (info.note != "F#") { FAIL("wrong note"); return; }
  if (info.octave != 4) { FAIL("wrong octave"); return; }
  PASS();
}

void test_Bb3() {
  TEST("A#3/Bb3 = 233.08 Hz → note A#, octave 3");
  auto info = NoteMapper::mapToNote(233.08f);
  if (info.note != "A#") { FAIL("wrong note"); return; }
  if (info.octave != 3) { FAIL("wrong octave"); return; }
  PASS();
}

void test_C8_high() {
  TEST("C8 = 4186 Hz → note C, octave 8");
  auto info = NoteMapper::mapToNote(4186.0f);
  if (info.note != "C") { FAIL("wrong note"); return; }
  if (info.octave != 8) { FAIL("wrong octave"); return; }
  PASS();
}

void test_cents_positive() {
  TEST("Slightly sharp A4 (442 Hz) has positive cents");
  auto info = NoteMapper::mapToNote(442.0f);
  if (info.note != "A") { FAIL("wrong note"); return; }
  if (info.cents <= 0.0f) { FAIL("expected positive cents"); return; }
  PASS();
}

void test_cents_negative() {
  TEST("Slightly flat A4 (438 Hz) has negative cents");
  auto info = NoteMapper::mapToNote(438.0f);
  if (info.note != "A") { FAIL("wrong note"); return; }
  if (info.cents >= 0.0f) { FAIL("expected negative cents"); return; }
  PASS();
}

void test_all_note_names() {
  TEST("All 12 chromatic notes map correctly");
  // Frequencies for C4 through B4
  float freqs[] = {
    261.63f, 277.18f, 293.66f, 311.13f, 329.63f, 349.23f,
    369.99f, 392.00f, 415.30f, 440.00f, 466.16f, 493.88f
  };
  const char* names[] = {
    "C", "C#", "D", "D#", "E", "F",
    "F#", "G", "G#", "A", "A#", "B"
  };
  for (int i = 0; i < 12; ++i) {
    auto info = NoteMapper::mapToNote(freqs[i]);
    if (info.note != std::string(names[i])) {
      char msg[64];
      std::snprintf(msg, sizeof(msg), "expected %s, got %s for %.1f Hz",
                    names[i], info.note.c_str(), freqs[i]);
      FAIL(msg);
      return;
    }
  }
  PASS();
}

// ---------- main ----------

int main() {
  std::printf("\n=== Note Mapper Tests ===\n\n");

  test_A4_440();
  test_C4_261();
  test_E2_82();
  test_sharps();
  test_Bb3();
  test_C8_high();
  test_cents_positive();
  test_cents_negative();
  test_all_note_names();

  std::printf("\n--- Results: %d passed, %d failed ---\n\n", passed, failed);
  return failed > 0 ? 1 : 0;
}
