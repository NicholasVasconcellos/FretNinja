#!/usr/bin/env bash
# verify-android-build.sh — Automated Android build verification for FretNinja
# Fails loudly on any error. Exit code 0 = all checks passed.

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0

pass() { ((PASS++)); echo -e "${GREEN}[PASS]${NC} $1"; }
fail() { ((FAIL++)); echo -e "${RED}[FAIL]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
info() { echo -e "      $1"; }

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_DIR="$PROJECT_ROOT/android"
APK_PATH="$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"

# ── Environment checks ──────────────────────────────────────────────────

echo ""
echo "=== FretNinja Android Build Verification ==="
echo ""

# Java
if [ -z "${JAVA_HOME:-}" ]; then
  export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
fi
if "$JAVA_HOME/bin/java" -version 2>&1 | grep -q "17\."; then
  pass "JDK 17 available at JAVA_HOME"
else
  fail "JDK 17 not found (JAVA_HOME=$JAVA_HOME)"
fi

# Android SDK
if [ -z "${ANDROID_HOME:-}" ]; then
  export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
fi
if [ -f "$ANDROID_HOME/platform-tools/adb" ]; then
  pass "Android SDK found at ANDROID_HOME"
else
  fail "Android SDK not found (ANDROID_HOME=$ANDROID_HOME)"
fi

# NDK
NDK_DIR=$(ls -d "$ANDROID_HOME/ndk/"* 2>/dev/null | head -1)
if [ -n "$NDK_DIR" ]; then
  pass "Android NDK found: $(basename "$NDK_DIR")"
else
  fail "Android NDK not found"
fi

# ── Gradle build ─────────────────────────────────────────────────────────

echo ""
echo "--- Gradle assembleDebug ---"
echo ""

cd "$ANDROID_DIR"

BUILD_LOG=$(mktemp)
if ./gradlew assembleDebug 2>&1 | tee "$BUILD_LOG" | tail -5; then
  if grep -q "BUILD SUCCESSFUL" "$BUILD_LOG"; then
    pass "Gradle assembleDebug succeeded"
  else
    fail "Gradle build did not report SUCCESS"
    cat "$BUILD_LOG"
  fi
else
  fail "Gradle assembleDebug exited with error"
  tail -30 "$BUILD_LOG"
fi
rm -f "$BUILD_LOG"

# ── APK verification ────────────────────────────────────────────────────

echo ""
echo "--- APK Checks ---"
echo ""

if [ -f "$APK_PATH" ]; then
  APK_SIZE=$(stat -f%z "$APK_PATH" 2>/dev/null || stat --printf="%s" "$APK_PATH" 2>/dev/null)
  APK_SIZE_MB=$((APK_SIZE / 1048576))
  pass "Debug APK exists ($APK_SIZE_MB MB)"
else
  fail "Debug APK not found at $APK_PATH"
fi

# Dump APK file listing to temp file (avoids pipefail/SIGPIPE issues)
APK_LIST=$(mktemp)
unzip -l "$APK_PATH" > "$APK_LIST" 2>/dev/null || true

apk_contains() { grep -q "$1" "$APK_LIST"; }

# Check that the native library is in the APK
if apk_contains "libpitch-detector.so"; then
  pass "libpitch-detector.so present in APK"
else
  fail "libpitch-detector.so missing from APK"
fi

# Check for all expected ABIs
for ABI in arm64-v8a armeabi-v7a x86 x86_64; do
  if apk_contains "lib/$ABI/libpitch-detector.so"; then
    pass "Native lib present for $ABI"
  else
    fail "Native lib missing for $ABI"
  fi
done

# Check for Oboe
if apk_contains "liboboe.so"; then
  pass "Oboe native library present in APK"
else
  warn "liboboe.so not found as separate library (may be statically linked)"
fi

rm -f "$APK_LIST"

# ── Summary ──────────────────────────────────────────────────────────────

echo ""
echo "=== Summary ==="
echo -e "  ${GREEN}Passed: $PASS${NC}"
if [ "$FAIL" -gt 0 ]; then
  echo -e "  ${RED}Failed: $FAIL${NC}"
  echo ""
  echo -e "${RED}BUILD VERIFICATION FAILED${NC}"
  exit 1
else
  echo -e "  ${RED}Failed: $FAIL${NC}"
  echo ""
  echo -e "${GREEN}BUILD VERIFICATION PASSED${NC}"
  exit 0
fi
