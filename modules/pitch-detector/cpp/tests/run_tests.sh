#!/bin/bash
# Compile and run all C++ unit tests for the pitch-detector module.
# Usage: ./run_tests.sh
# Requires: clang++ with C++17 support

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CPP_DIR="$SCRIPT_DIR/.."
BUILD_DIR="$SCRIPT_DIR/build"

mkdir -p "$BUILD_DIR"

CXX="${CXX:-clang++}"
CXXFLAGS="-std=c++17 -Wall -Wextra -O2"

echo "=== Building tests ==="

# Build test_yin (needs yin.cpp + note_mapper.cpp)
echo "  Compiling test_yin..."
$CXX $CXXFLAGS -I"$CPP_DIR" \
  "$SCRIPT_DIR/test_yin.cpp" \
  "$CPP_DIR/yin.cpp" \
  "$CPP_DIR/note_mapper.cpp" \
  -o "$BUILD_DIR/test_yin"

# Build test_ring_buffer (header-only, no extra sources)
echo "  Compiling test_ring_buffer..."
$CXX $CXXFLAGS -I"$CPP_DIR" \
  "$SCRIPT_DIR/test_ring_buffer.cpp" \
  -o "$BUILD_DIR/test_ring_buffer"

# Build test_note_mapper (needs note_mapper.cpp)
echo "  Compiling test_note_mapper..."
$CXX $CXXFLAGS -I"$CPP_DIR" \
  "$SCRIPT_DIR/test_note_mapper.cpp" \
  "$CPP_DIR/note_mapper.cpp" \
  -o "$BUILD_DIR/test_note_mapper"

echo ""
echo "=== Running tests ==="

TOTAL_PASS=0
TOTAL_FAIL=0

for test_bin in test_yin test_ring_buffer test_note_mapper; do
  if "$BUILD_DIR/$test_bin"; then
    : # test passed
  else
    TOTAL_FAIL=$((TOTAL_FAIL + 1))
  fi
done

echo ""
if [ "$TOTAL_FAIL" -gt 0 ]; then
  echo "*** $TOTAL_FAIL test suite(s) had failures ***"
  exit 1
else
  echo "All test suites passed."
  exit 0
fi
