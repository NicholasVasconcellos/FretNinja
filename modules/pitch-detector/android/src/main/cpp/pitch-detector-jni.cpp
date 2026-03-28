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
  // Returns [frequency, confidence, cents, octave, noteName0, noteName1, noteName2]
  // as a float array (note chars encoded as float codepoints)
  jfloatArray result = env->NewFloatArray(7);
  if (!result) return nullptr;

  float frequency = 0.0f, confidence = 0.0f, cents = 0.0f;
  int octave = 0;
  char noteName[4] = {'\0'};

  if (g_capture) {
    g_capture->getLatestPitch(frequency, confidence, cents, octave, noteName);
  }

  float data[7];
  data[0] = frequency;
  data[1] = confidence;
  data[2] = cents;
  data[3] = static_cast<float>(octave);
  data[4] = static_cast<float>(noteName[0]);
  data[5] = static_cast<float>(noteName[1]);
  data[6] = static_cast<float>(noteName[2]);

  env->SetFloatArrayRegion(result, 0, 7, data);
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
