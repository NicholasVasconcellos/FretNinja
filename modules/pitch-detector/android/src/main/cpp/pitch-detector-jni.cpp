#include <jni.h>
#include "OboeAudioCapture.h"

static OboeAudioCapture* g_capture = nullptr;

extern "C" {

JNIEXPORT jboolean JNICALL
Java_expo_modules_pitchdetector_PitchDetectorModule_nativeStart(
    JNIEnv* /*env*/, jobject /*thiz*/) {
  if (!g_capture) {
    g_capture = new OboeAudioCapture();
  }
  return static_cast<jboolean>(g_capture->start());
}

JNIEXPORT void JNICALL
Java_expo_modules_pitchdetector_PitchDetectorModule_nativeStop(
    JNIEnv* /*env*/, jobject /*thiz*/) {
  if (g_capture) {
    g_capture->stop();
    delete g_capture;
    g_capture = nullptr;
  }
}

JNIEXPORT jfloatArray JNICALL
Java_expo_modules_pitchdetector_PitchDetectorModule_nativeGetLatestPitch(
    JNIEnv* env, jobject /*thiz*/) {
  // Returns [frequency, confidence, cents, octave, noteName0..2, bufferCount, detectCount, rms]
  jfloatArray result = env->NewFloatArray(10);
  if (!result) return nullptr;

  float frequency = 0.0f, confidence = 0.0f, cents = 0.0f;
  int octave = 0;
  char noteName[4] = {'\0'};
  int bufferCount = 0, detectCount = 0;
  float rms = 0.0f;

  if (g_capture) {
    g_capture->getLatestPitch(frequency, confidence, cents, octave, noteName);
    bufferCount = g_capture->getDebugBufferCount();
    detectCount = g_capture->getDebugDetectCount();
    rms = g_capture->getDebugRms();
  }

  float data[10];
  data[0] = frequency;
  data[1] = confidence;
  data[2] = cents;
  data[3] = static_cast<float>(octave);
  data[4] = static_cast<float>(noteName[0]);
  data[5] = static_cast<float>(noteName[1]);
  data[6] = static_cast<float>(noteName[2]);
  data[7] = static_cast<float>(bufferCount);
  data[8] = static_cast<float>(detectCount);
  data[9] = rms;

  env->SetFloatArrayRegion(result, 0, 10, data);
  return result;
}

JNIEXPORT void JNICALL
Java_expo_modules_pitchdetector_PitchDetectorModule_nativeConfigure(
    JNIEnv* /*env*/, jobject /*thiz*/, jfloat rmsThreshold,
    jfloat nativeConfidence) {
  if (g_capture) {
    g_capture->configure(rmsThreshold, nativeConfidence);
  }
}

JNIEXPORT jdouble JNICALL
Java_expo_modules_pitchdetector_PitchDetectorModule_nativeGetLatencyMs(
    JNIEnv* /*env*/, jobject /*thiz*/) {
  if (g_capture) {
    return static_cast<jdouble>(g_capture->getLatencyMs());
  }
  return 0.0;
}

} // extern "C"
