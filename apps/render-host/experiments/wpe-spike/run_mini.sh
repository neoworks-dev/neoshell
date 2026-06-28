#!/bin/bash
# $1 = label, $2 = feature arg (empty or "-F -PreferPageRenderingUpdatesNear60FPS")
LABEL="$1"; shift
LOG="/tmp/wpe_mini_${LABEL}.log"; : > "$LOG"
MB=/usr/lib/wpe-webkit-2.0/MiniBrowser
URL="file://$PWD/raf-counter.html"
$MB "$@" "$URL" >/dev/null 2>&1 &
MBPID=$!
echo "[$LABEL] MiniBrowser pid=$MBPID args=$*" >> "$LOG"
for i in $(seq 1 12); do
  sleep 1
  TITLE=$(hyprctl clients -j 2>/dev/null | jq -r '.[] | select(.class|test("MiniBrowser";"i")) | .title' 2>/dev/null | head -1)
  echo "[$LABEL] t=${i}s title=${TITLE}" >> "$LOG"
done
kill $MBPID 2>/dev/null
