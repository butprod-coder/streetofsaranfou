#!/usr/bin/env bash
# Disable packages for user 0, one pm call each, logging to backup/disabled-by-us.txt.
# Refuses Android core packages that can stop the TV from booting.
cd "$(dirname "$0")/.."
T="bash tools/tv.sh shell"
LOG=backup/disabled-by-us.txt
for pkg in "$@"; do
  case "$pkg" in
    android|com.android.systemui|com.android.shell|com.android.phone|com.android.settings|com.android.tv.settings|\
    *permissioncontroller*|*packageinstaller*|*ext.services*|*ext.shared*|*modulemetadata*|com.google.android.overlay.modules*|\
    com.android.vending|com.google.android.gms|com.google.android.gsf|com.google.android.inputmethod.*|com.droidlogic*|com.fengmi.*)
      echo "REFUSED (load-bearing): $pkg"; continue;;
    com.android.providers.calendar|com.android.providers.contacts|com.android.providers.userdictionary|com.android.providers.blockednumber) ;;
    com.android.providers.*) echo "REFUSED (core provider): $pkg"; continue;;
  esac
  out=$($T pm disable-user --user 0 "$pkg" 2>&1)
  echo "$pkg: $out"
  if $T pm list packages -d | grep -qx "package:$pkg"; then
    grep -qx "$pkg" "$LOG" 2>/dev/null || echo "$pkg" >> "$LOG"
  else
    echo "  !! $pkg is NOT in the disabled list"
  fi
done
