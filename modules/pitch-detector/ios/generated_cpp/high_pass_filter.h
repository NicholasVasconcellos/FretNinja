#pragma once

// First-order IIR high-pass filter.
// y[n] = alpha * (y[n-1] + x[n] - x[n-1])
// Rejects DC offset and low-frequency rumble below the cutoff frequency.
class HighPassFilter {
public:
    HighPassFilter() : HighPassFilter(60.0f, 44100.0f) {}

    HighPassFilter(float cutoff_hz, float sample_rate) {
        constexpr float PI = 3.14159265358979f;
        float rc = 1.0f / (2.0f * PI * cutoff_hz);
        float dt = 1.0f / sample_rate;
        alpha_ = rc / (rc + dt);
    }

    void process(const float* input, float* output, int length) {
        for (int i = 0; i < length; ++i) {
            float filtered = alpha_ * (prev_output_ + input[i] - prev_input_);
            prev_input_ = input[i];
            prev_output_ = filtered;
            output[i] = filtered;
        }
    }

    void process(float* buffer, int length) {
        for (int i = 0; i < length; ++i) {
            float x = buffer[i];
            float y = alpha_ * (prev_output_ + x - prev_input_);
            prev_input_ = x;
            prev_output_ = y;
            buffer[i] = y;
        }
    }

    void reset() {
        prev_input_ = 0.0f;
        prev_output_ = 0.0f;
    }

private:
    float alpha_;
    float prev_input_ = 0.0f;
    float prev_output_ = 0.0f;
};
