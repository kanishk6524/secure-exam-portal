#!/usr/bin/env bash
# Puts the face-detection runtime and model under public/mediapipe so the exam does not depend on a CDN.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p public/mediapipe
# 1. WASM runtime: copied from the installed package, so it always matches the JavaScript version.
rm -rf public/mediapipe/wasm
cp -R node_modules/@mediapipe/tasks-vision/wasm public/mediapipe/wasm
echo "wasm runtime copied ($(ls public/mediapipe/wasm | wc -l | tr -d ' ') files)"
# 2. Face landmarker model (about 4 MB)
if [ ! -s public/mediapipe/face_landmarker.task ]; then
  curl -fL --retry 3 -o public/mediapipe/face_landmarker.task \
    https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task
fi
ls -la public/mediapipe/face_landmarker.task
echo "Done. Reload the exam page."
