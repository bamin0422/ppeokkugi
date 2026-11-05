#!/bin/sh
# 뻐꾸기 시연 영상·숏폼 다시 만들기
# 1) 촬영(선택, 이미 raw/ 가 있으면 건너뜀): 서버(server 에서 npx wrangler dev --port 8792)와 에뮬레이터가 켜진 상태에서
#      node docs/video/src/shoot.mjs  docs/video/src/raw/take1   # 시연 모드·봇 3대·휴대폰 웹
#      node docs/video/src/shoot2.mjs docs/video/src/raw/take2   # 코드로 참여·대장 콜·투표·경유지
# 2) 편집: 이 스크립트. 결과는 docs/video/뻐꾸기_시연영상.mp4, 뻐꾸기_숏폼.mp4
set -e
cd "$(dirname "$0")/../../.."
rm -rf docs/video/src/build
python3 docs/video/src/build_video.py
