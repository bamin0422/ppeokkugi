#!/bin/bash
# 렌더 결과 음량을 -16 LUFS(true peak -1.5dB)로 맞추고 메타데이터를 제목만 남긴다.
set -e
cd "$(dirname "$0")/.."
norm() {
  IN=$1; OUT=$2; TITLE=$3
  J=$(ffmpeg -hide_banner -i "$IN" -vn -af loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
  g() { echo "$J" | python3 -c "import json,sys; print(json.load(sys.stdin)['$1'])"; }
  ffmpeg -v error -y -i "$IN" -map 0:v -map 0:a -c:v copy \
    -af "loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true,aresample=48000" \
    -c:a aac -b:a 192k -ar 48000 -map_metadata -1 -map_chapters -1 -fflags +bitexact -flags:v +bitexact -flags:a +bitexact \
    -metadata title="$TITLE" -movflags +faststart "$OUT"
  echo "$OUT"
}
norm out/wide.mp4 ../뻐꾸기_소개영상.mp4 "뻐꾸기 소개 영상"
norm out/short.mp4 ../뻐꾸기_숏폼.mp4 "뻐꾸기 숏폼"
