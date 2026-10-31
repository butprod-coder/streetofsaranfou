#!/usr/bin/env bash
# Usage: tools/tv.sh [--screenshot out.png] [KEY ...]   |   tools/tv.sh shell 'cmd'
# Env: TV_HOST (default 192.168.1.43), TV_PORT (default 5555), ADB (path to adb)
export MSYS_NO_PATHCONV=1
ADB="${ADB:-$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe}"
DEV="${TV_HOST:-192.168.1.43}:${TV_PORT:-5555}"
"$ADB" connect "$DEV" >/dev/null 2>&1
if [ "$1" = shell ]; then shift; exec "$ADB" -s "$DEV" shell "$@"; fi
OUT=""
if [ "$1" = --screenshot ]; then OUT="$2"; shift 2; fi
for k in "$@"; do "$ADB" -s "$DEV" shell input keyevent "KEYCODE_${k#KEYCODE_}"; sleep 0.6; done
if [ -n "$OUT" ]; then
  sleep 1
  "$ADB" -s "$DEV" shell screencap -p /sdcard/_shot.png
  "$ADB" -s "$DEV" pull /sdcard/_shot.png "$OUT" >/dev/null
  "$ADB" -s "$DEV" shell rm /sdcard/_shot.png
  if [ ! -s "$OUT" ]; then echo "empty screenshot (protected content / live TV / HDMI): check topResumedActivity"; exit 1; fi
  echo "saved $OUT"
fi
