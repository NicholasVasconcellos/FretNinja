#pragma once

#include <atomic>
#include <cstddef>
#include <cstring>
#include <algorithm>

class RingBuffer {
public:
  static constexpr size_t CAPACITY = 16384;

  RingBuffer() : head_(0), tail_(0) {
    std::memset(buffer_, 0, sizeof(buffer_));
  }

  // Returns number of samples actually written
  size_t write(const float* data, size_t count) {
    size_t avail = CAPACITY - available();
    size_t to_write = std::min(count, avail);

    size_t h = head_.load(std::memory_order_relaxed);
    for (size_t i = 0; i < to_write; ++i) {
      buffer_[(h + i) % CAPACITY] = data[i];
    }
    head_.store((h + to_write) % CAPACITY, std::memory_order_release);
    return to_write;
  }

  // Returns number of samples actually read
  size_t read(float* data, size_t count) {
    size_t avail = available();
    size_t to_read = std::min(count, avail);

    size_t t = tail_.load(std::memory_order_relaxed);
    for (size_t i = 0; i < to_read; ++i) {
      data[i] = buffer_[(t + i) % CAPACITY];
    }
    tail_.store((t + to_read) % CAPACITY, std::memory_order_release);
    return to_read;
  }

  size_t available() const {
    size_t h = head_.load(std::memory_order_acquire);
    size_t t = tail_.load(std::memory_order_acquire);
    return (h - t + CAPACITY) % CAPACITY;
  }

private:
  float buffer_[CAPACITY];
  std::atomic<size_t> head_;
  std::atomic<size_t> tail_;
};
