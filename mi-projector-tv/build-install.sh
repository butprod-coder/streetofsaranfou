#!/usr/bin/env bash
# Build the launcher (debug APK), install it on the TV and make it the default Home.
# Usage: bash build-install.sh [--no-build]
# Env: TV_HOST / TV_PORT (see tools/tv.sh), JAVA_HOME (defaults to Android Studio's JDK),
#      GRADLE (defaults to the cached Gradle 8.13 distribution).
set -e
cd "$(dirname "$0")"
export MSYS_NO_PATHCONV=1
export JAVA_HOME="${JAVA_HOME:-/c/Program Files/Android/Android Studio/jbr}"
GRADLE="${GRADLE:-$(ls -d ~/.gradle/wrapper/dists/gradle-8.13-bin/*/gradle-8.13/bin/gradle 2>/dev/null | head -1)}"
ADB="${ADB:-$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe}"
DEV="${TV_HOST:-192.168.1.43}:${TV_PORT:-5555}"
APK=launcher/app/build/outputs/apk/debug/app-debug.apk
PKG=tv.clean.home

if [ "$1" != --no-build ]; then
  (cd launcher && "$GRADLE" --console=plain -q assembleDebug)
fi
"$ADB" connect "$DEV" >/dev/null
# push + pm install avoids adb install waiting on an on-screen confirmation
"$ADB" -s "$DEV" push "$APK" /data/local/tmp/cleanhome.apk >/dev/null
"$ADB" -s "$DEV" shell pm install -r /data/local/tmp/cleanhome.apk
"$ADB" -s "$DEV" shell rm /data/local/tmp/cleanhome.apk
# Wi-Fi network name needs location permission on Android 9+
"$ADB" -s "$DEV" shell pm grant $PKG android.permission.ACCESS_FINE_LOCATION || true
"$ADB" -s "$DEV" shell cmd package set-home-activity $PKG/.HomeActivity
"$ADB" -s "$DEV" shell input keyevent KEYCODE_HOME
sleep 2
"$ADB" -s "$DEV" shell dumpsys activity activities | grep -E 'mFocusedApp|mResumedActivity' | head -2
