# How FretNinja Detects Pitch

FretNinja uses the **YIN algorithm** to figure out what note you're playing. YIN is a time-domain method — it works by looking at the shape of the sound wave directly, not by converting it to a frequency spectrum (like FFT). This makes it fast, accurate, and well-suited for real-time guitar tuning.

Here's what happens from the moment you pluck a string to seeing a note on screen.

---

## 1. Capture the Sound

The microphone records audio at 44,100 samples per second (CD quality). Each sample is a number representing air pressure at that instant.

A **high-pass filter** at 60 Hz immediately strips out low-frequency rumble — things like air conditioning hum or handling noise that would confuse the detector.

Samples flow into a **ring buffer** (a circular queue) so the audio thread and the analysis thread never block each other.

## 2. Collect a Frame

The algorithm works on chunks called **frames** — 2,048 samples at a time (~46 ms of audio). Frames overlap by 50%, so a new analysis runs every ~23 ms. This overlap means we never miss a note transition that falls between frames.

## 3. Check if Anyone's Playing

Before doing any heavy math, we compute the **RMS** (root mean square) — basically the average loudness of the frame. If it's below a threshold (default 0.01), we skip everything and report silence. No point analyzing a quiet room.

We also flag **clipping** — if any sample hits near the maximum (|value| >= 0.99), the signal is distorted and the user should turn down their input.

## 4. The YIN Algorithm (The Core)

This is where pitch detection actually happens. It has four steps.

### Step 1 — Difference Function

The key insight: a periodic sound wave repeats. If you slide a copy of the wave over the original by exactly one period, the two copies line up perfectly and the difference is zero.

YIN exploits this. For each possible "lag" (shift amount), it computes how different the original and shifted signals are:

```
d(lag) = sum of (original[i] - original[i + lag])^2
```

When the lag equals the true period of the note, `d(lag)` drops to near zero. For a 440 Hz A note at 44,100 Hz sample rate, the period is ~100 samples, so `d(100)` would dip.

### Step 2 — Normalize the Dips

Raw difference values have a problem: `d(0)` is always zero (comparing the signal to itself), so the algorithm would always "detect" a lag of 0. The fix is **cumulative mean normalization**:

```
cmnd(lag) = d(lag) / average of d(1..lag)
```

This divides each value by the running average, producing a normalized curve where genuine periodic dips stand out below 1.0, while the trivial zero-lag gets normalized to 1.0.

### Step 3 — Find the First Dip

Scan the normalized curve from the minimum lag (set by the max detectable frequency, 4,200 Hz) to the maximum lag (set by the min detectable frequency, 65 Hz). The first value that drops below the **threshold** (0.15) is our candidate.

Once a dip is found, we walk forward to its lowest point — this avoids picking the edge of a dip instead of its center.

If nothing dips below the threshold, there's no clear pitch and we report nothing.

### Step 4 — Parabolic Interpolation

The lag from Step 3 is an integer (whole number of samples), which limits precision. To get sub-sample accuracy, we fit a parabola through three points — the lag and its two neighbors — and find the vertex. This shifts the estimate by a fraction of a sample, enough to bring accuracy to within ~1 cent across the guitar range.

## 5. Lag to Frequency

Converting is simple:

```
frequency = 44,100 / refined_lag
```

If the lag is 100.3 samples, the frequency is ~439.7 Hz.

## 6. Confidence Score

How sure are we? The normalized value at the detected lag tells us:

```
confidence = 1.0 - cmnd(lag)
```

A deeper dip (closer to 0) means a more periodic, cleaner signal — higher confidence. A shallow dip (closer to the 0.15 threshold) means a noisier or less periodic signal — lower confidence.

Results below a minimum confidence (0.5 native, 0.85 in the UI) are discarded.

## 7. Smoothing

Raw frame-by-frame frequencies jitter slightly — the detected pitch might bounce between 439.8 and 440.2 Hz even on a steady note. An **exponential moving average** (EMA) smooths this:

```
smoothed = 0.35 * new_frequency + 0.65 * previous_smoothed
```

But there's a twist: if the frequency jumps by more than a semitone (ratio > 2^(1/12) ~ 1.059), the smoother **snaps instantly** to the new value. This prevents the display from sluggishly sliding between notes when you play a new one.

## 8. Map to a Note

Standard music math converts frequency to a note name:

```
midi_number = 12 * log2(frequency / 440) + 69
cents_off   = (fractional part) * 100
```

Round to the nearest MIDI number to get the note name (C, C#, D, ... B) and octave. The fractional remainder tells you how many cents sharp or flat you are.

---

## The Full Pipeline at a Glance

```
Microphone
  |
  v
High-pass filter (remove rumble below 60 Hz)
  |
  v
Ring buffer (decouple audio and analysis threads)
  |
  v
Frame buffer (collect 2048 samples, 50% overlap)
  |
  v
RMS check (silent? skip everything)
  |
  v
YIN Step 1: Difference function (how self-similar at each lag?)
  |
  v
YIN Step 2: Normalize (remove zero-lag bias)
  |
  v
YIN Step 3: Threshold search (find first clean dip)
  |
  v
YIN Step 4: Parabolic interpolation (sub-sample precision)
  |
  v
Frequency = sample_rate / refined_lag
  |
  v
Confidence = 1 - normalized_dip_value
  |
  v
EMA smoothing (reduce jitter, snap on note changes)
  |
  v
Note mapping (frequency -> note name + cents offset)
  |
  v
Display
```

## Key Numbers

| Parameter | Value | Why |
|---|---|---|
| Sample rate | 44,100 Hz | Standard audio; Nyquist limit at 22 kHz |
| Frame size | 2,048 samples (~46 ms) | Long enough to capture ~3 cycles of the lowest note (65 Hz) |
| Hop size | 1,024 samples (~23 ms) | 50% overlap; analysis runs ~43 times/sec |
| YIN threshold | 0.15 | Lower = stricter (fewer false positives, may miss weak notes) |
| Frequency range | 65 – 4,200 Hz | Covers C2 through C8 (full guitar range and beyond) |
| EMA alpha | 0.35 | Moderate smoothing; responds in ~3 frames |
| End-to-end latency | ~50–80 ms | Capture + analysis + UI poll; fast enough to feel instant |
