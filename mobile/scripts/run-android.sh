#!/usr/bin/env bash
set -euo pipefail

export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v adb >/dev/null 2>&1; then
  echo "adb not found. Set ANDROID_HOME to your Android SDK (usually ~/Library/Android/sdk)."
  exit 1
fi

echo "Checking for Android devices..."
adb start-server >/dev/null 2>&1 || true
DEVICES="$(adb devices | awk 'NR>1 && $2=="device" {print $1}')"

if [ -z "$DEVICES" ]; then
  echo ""
  echo "No emulator/device connected yet."
  echo "1. Open Android Studio → Device Manager"
  echo "2. Start the Pixel_8 (or any) AVD and wait for the home screen"
  echo "3. Run: adb devices"
  echo "   You should see: emulator-5554   device"
  echo ""
  adb devices -l
  exit 1
fi

echo "Connected: $(echo "$DEVICES" | tr '\n' ' ')"

if lsof -i :8081 >/dev/null 2>&1; then
  echo "Metro already running on :8081 — wiring Android to it..."
  adb reverse tcp:8081 tcp:8081
  CI=1 npx expo start --android --port 8081
else
  npx expo start --android
fi
