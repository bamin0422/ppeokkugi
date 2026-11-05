#!/bin/bash
# 장면마다 프레임 두 장(진입 직후 +40%, +80%)을 뽑아 한 장으로 붙인다. 사용: scripts/sheet.sh <영상> <wide|short> <출력.png>
set -e
V=$(cd "$(dirname "$1")" && pwd)/$(basename "$1"); KIND=$2; OUT=$3
cd "$(dirname "$0")/.."
D=$(mktemp -d)
node -e '
const c=require("./src/scenes.json"); const T=c.transition; let t=0;
c[process.argv[1]].forEach(([id,d],i)=>{ for (const f of [0.4,0.8]) console.log((t+d*f).toFixed(2), id); t+=d-T; });' "$KIND" |
while read ts id; do
  n=$(printf "%07.2f" "$ts")
  ffmpeg -nostdin -v error -y -ss "$ts" -i "$V" -frames:v 1 -vf "scale=$([ "$KIND" = wide ] && echo 480:270 || echo 270:480),drawtext=fontfile=/System/Library/Fonts/Supplemental/Arial.ttf:text=$ts ${id/f:/}:fontsize=16:fontcolor=yellow:box=1:boxcolor=black@0.6:x=4:y=4" "$D/$n.png"
done
COLS=$([ "$KIND" = wide ] && echo 6 || echo 8)
ffmpeg -v error -y -pattern_type glob -i "$D/*.png" -vf "tile=${COLS}x$(( ($(ls $D | wc -l) + COLS - 1) / COLS ))" -frames:v 1 "$OUT"
rm -rf "$D"; echo "$OUT"
