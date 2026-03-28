#!/bin/bash
# Build and run FretNinja on the Android emulator
# Usage: ./run-android.sh [--rebuild]
#   --rebuild  Force a clean Gradle build before launching

set -e

export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"

AVD_NAME="FretNinja_Test"
APK="android/app/build/outputs/apk/debug/app-debug.apk"
PORT=8081

# ── Preflight checks ────────────────────────────────────────────────────

if ! "$JAVA_HOME/bin/java" -version 2>&1 | grep -q "17\."; then
  echo "JDK 17 not found. Run: brew install openjdk@17"
  exit 1
fi

if [ ! -f "$ANDROID_HOME/platform-tools/adb" ]; then
  echo "Android SDK not found. Run: brew install --cask android-commandlinetools"
  exit 1
fi

# ── Build APK if needed ─────────────────────────────────────────────────

if [ "$1" = "--rebuild" ] || [ ! -f "$APK" ]; then
  echo "Building debug APK..."
  cd android && ./gradlew assembleDebug && cd ..
  echo "Build complete."
else
  echo "Using existing APK (pass --rebuild to force)."
fi

# ── Start emulator if not already running ────────────────────────────────

if ! adb devices 2>/dev/null | grep -q "emulator.*device"; then
  echo "Starting emulator ($AVD_NAME)..."
  emulator -avd "$AVD_NAME" -gpu swiftshader_indirect -no-boot-anim &>/tmp/emulator.log &
  echo "Waiting for emulator to boot..."
  adb wait-for-device
  # Wait for full boot
  while [ "$(adb shell getprop sys.boot_completed 2>/dev/null)" != "1" ]; do
    sleep 2
  done
  echo "Emulator ready."
else
  echo "Emulator already running."
fi

# ── Install and launch ───────────────────────────────────────────────────

echo "Installing APK..."
adb install -r "$APK"

# Forward Metro port so the emulator can reach localhost
adb reverse tcp:$PORT tcp:$PORT

# Kill any existing Metro on the port
if lsof -i :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "Killing existing process on port $PORT..."
  kill -9 $(lsof -i :$PORT -sTCP:LISTEN -t) 2>/dev/null || true
  sleep 1
fi

# Start Metro + open on Android
echo "Starting Metro and launching app..."
npx expo start --android --port $PORT
