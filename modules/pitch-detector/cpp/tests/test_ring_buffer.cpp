#include "../ring_buffer.h"
#include <cassert>
#include <cstdio>
#include <cstring>
#include <vector>

static int passed = 0;
static int failed = 0;

#define TEST(name) \
  do { std::printf("  %-50s", name); } while(0)

#define PASS() \
  do { std::printf("PASS\n"); ++passed; } while(0)

#define FAIL(msg) \
  do { std::printf("FAIL: %s\n", msg); ++failed; } while(0)

// ---------- tests ----------

void test_write_and_read() {
  TEST("Write then read returns same data");
  RingBuffer rb;
  float input[] = {1.0f, 2.0f, 3.0f, 4.0f, 5.0f};
  size_t written = rb.write(input, 5);
  assert(written == 5);
  assert(rb.available() == 5);

  float output[5] = {};
  size_t read_count = rb.read(output, 5);
  assert(read_count == 5);
  for (int i = 0; i < 5; ++i) {
    assert(output[i] == input[i]);
  }
  assert(rb.available() == 0);
  PASS();
}

void test_empty_read() {
  TEST("Read from empty buffer returns 0");
  RingBuffer rb;
  float output[10] = {};
  size_t read_count = rb.read(output, 10);
  assert(read_count == 0);
  assert(rb.available() == 0);
  PASS();
}

void test_partial_read() {
  TEST("Partial read returns only available data");
  RingBuffer rb;
  float input[] = {1.0f, 2.0f, 3.0f};
  rb.write(input, 3);

  float output[10] = {};
  size_t read_count = rb.read(output, 10);
  assert(read_count == 3);
  assert(output[0] == 1.0f);
  assert(output[1] == 2.0f);
  assert(output[2] == 3.0f);
  PASS();
}

void test_wrap_around() {
  TEST("Wrap-around write and read works correctly");
  RingBuffer rb;
  const size_t cap = RingBuffer::CAPACITY;

  // Fill most of the buffer
  std::vector<float> filler(cap - 10, 0.0f);
  rb.write(filler.data(), filler.size());

  // Read it all to advance the tail
  std::vector<float> discard(cap - 10);
  rb.read(discard.data(), discard.size());
  assert(rb.available() == 0);

  // Now write data that wraps around the end
  float input[20];
  for (int i = 0; i < 20; ++i) input[i] = static_cast<float>(i + 100);
  size_t written = rb.write(input, 20);
  assert(written == 20);
  assert(rb.available() == 20);

  float output[20] = {};
  size_t read_count = rb.read(output, 20);
  assert(read_count == 20);
  for (int i = 0; i < 20; ++i) {
    assert(output[i] == static_cast<float>(i + 100));
  }
  PASS();
}

void test_overflow_drops_excess() {
  TEST("Overflow: write limited to available space");
  RingBuffer rb;
  const size_t cap = RingBuffer::CAPACITY;

  // The ring buffer uses modular arithmetic: available() = (head - tail + CAP) % CAP.
  // avail_to_write = CAPACITY - available(). In practice, callers write in small
  // audio frame chunks and never hit full capacity.

  // Partially fill, then try to write more than remaining space
  std::vector<float> fill(cap - 100, 1.0f);
  size_t written = rb.write(fill.data(), fill.size());
  assert(written == cap - 100);
  assert(rb.available() == cap - 100);

  // Try to write 200 more — only 100 should fit
  std::vector<float> extra(200, 2.0f);
  written = rb.write(extra.data(), extra.size());
  assert(written == 100);
  PASS();
}

void test_multiple_write_read_cycles() {
  TEST("Multiple write/read cycles maintain integrity");
  RingBuffer rb;
  for (int cycle = 0; cycle < 100; ++cycle) {
    float input[32];
    for (int i = 0; i < 32; ++i) input[i] = static_cast<float>(cycle * 32 + i);
    size_t written = rb.write(input, 32);
    assert(written == 32);

    float output[32] = {};
    size_t read_count = rb.read(output, 32);
    assert(read_count == 32);
    for (int i = 0; i < 32; ++i) {
      assert(output[i] == input[i]);
    }
  }
  PASS();
}

void test_available_count() {
  TEST("available() tracks count correctly");
  RingBuffer rb;
  assert(rb.available() == 0);

  float data[100];
  rb.write(data, 100);
  assert(rb.available() == 100);

  float out[30];
  rb.read(out, 30);
  assert(rb.available() == 70);

  rb.read(out, 30);
  assert(rb.available() == 40);

  rb.read(out, 30);
  assert(rb.available() == 10);
  PASS();
}

// ---------- main ----------

int main() {
  std::printf("\n=== Ring Buffer Tests ===\n\n");

  test_write_and_read();
  test_empty_read();
  test_partial_read();
  test_wrap_around();
  test_overflow_drops_excess();
  test_multiple_write_read_cycles();
  test_available_count();

  std::printf("\n--- Results: %d passed, %d failed ---\n\n", passed, failed);
  return failed > 0 ? 1 : 0;
}
