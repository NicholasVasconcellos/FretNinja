#include "note_mapper.h"
#include <cmath>

static const char* NOTE_NAMES[] = {
    "C", "C#", "D", "D#", "E", "F",
    "F#", "G", "G#", "A", "A#", "B"};

NoteInfo NoteMapper::mapToNote(float frequency) {
  // MIDI formula: midi = 12 * log2(freq / 440) + 69
  float midi = 12.0f * std::log2(frequency / 440.0f) + 69.0f;

  int midi_rounded = static_cast<int>(std::round(midi));
  float cents = (midi - static_cast<float>(midi_rounded)) * 100.0f;

  // Derive note name and octave from MIDI number
  // MIDI 0 = C-1, so note_index = midi % 12, octave = midi / 12 - 1
  int note_index = ((midi_rounded % 12) + 12) % 12;
  int octave = (midi_rounded / 12) - 1;

  return {NOTE_NAMES[note_index], octave, cents};
}
