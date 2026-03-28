#!/bin/bash
# Build and run FretNinja on a physical iOS device over Wi-Fi
# Usage: ./run-device.sh

set -e

PORT=8081

# 1. Get Mac's local IP
IP=$(ipconfig getifaddr en0 2>/dev/null)
if [ -z "$IP" ]; then
  echo "❌ Not connected to Wi-Fi (en0). Connect and retry."
  exit 1
fi
echo "✅ Mac IP: $IP"

# 2. Kill any existing Metro process on the port
if lsof -i :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "⚠️  Killing existing process on port $PORT..."
  kill -9 $(lsof -i :$PORT -sTCP:LISTEN -t) 2>/dev/null || true
  sleep 1
fi

# 3. Build and run on device — this starts Metro and deploys the app
echo "🚀 Building and deploying to device..."
RCT_METRO_HOST="$IP" npx expo run:ios --device --port $PORT
