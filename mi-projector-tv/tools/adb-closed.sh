#!/usr/bin/env bash
# Check that network ADB is closed: only "connection refused" proves it.
# Usage: bash tools/adb-closed.sh [tv ip] [port]
HOST="${1:-${TV_HOST:-192.168.1.43}}"; PORT="${2:-5555}"
if ! ping -n 1 -w 1000 "$HOST" >/dev/null 2>&1 && ! ping -c 1 -W 1 "$HOST" >/dev/null 2>&1; then
  echo "UNKNOWN: $HOST does not answer ping (TV off or unreachable) - this proves nothing"; exit 2
fi
err=$(timeout 4 bash -c "exec 3<>/dev/tcp/$HOST/$PORT" 2>&1); rc=$?
if [ $rc -eq 0 ]; then echo "OPEN: $HOST:$PORT accepts connections - network ADB is still on"; exit 1; fi
if echo "$err" | grep -qi refused; then echo "CLOSED: $HOST:$PORT refused the connection"; exit 0; fi
echo "UNKNOWN: $HOST:$PORT gave no answer ($err) - a timeout is not proof"; exit 2
