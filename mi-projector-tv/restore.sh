#!/usr/bin/env bash
# Re-enable every package this project disabled and give Home back to the stock launcher.
# Usage: bash restore.sh            (TV_HOST / TV_PORT / ADB env vars as in tools/tv.sh)
cd "$(dirname "$0")"
T="bash tools/tv.sh shell"
LIST=backup/disabled-by-us.txt
[ -f "$LIST" ] || { echo "nothing to restore ($LIST missing)"; exit 0; }
# Stock launcher first, so Home works even if the rest fails.
$T pm enable com.google.android.tvlauncher
$T cmd package set-home-activity com.google.android.tvlauncher/.MainActivity
while read -r pkg; do
  [ -z "$pkg" ] && continue
  case "$pkg" in \#*) continue;; esac
  echo "enabling $pkg"
  $T pm enable "$pkg"
done < "$LIST"
# Undo optional extras (harmless if they were never set)
$T settings put global private_dns_mode opportunistic
echo "Done. Packages still disabled:"
$T pm list packages -d
echo "(backup/packages-disabled-before.txt lists the ones that were disabled before we started)"
