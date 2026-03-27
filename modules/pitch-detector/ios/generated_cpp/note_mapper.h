#pragma once

#include <string>

struct NoteInfo {
  std::string note;
  int octave;
  float cents;
};

class NoteMapper {
public:
  static NoteInfo mapToNote(float frequency);
};
