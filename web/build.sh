#!/bin/sh
set -e;

BASE_DIR="$(cd "$(dirname "$0")/.."; pwd)";

echo "Cleaning build...";
rm -r "$BASE_DIR/build" 2>/dev/null || true;

echo "Copying static web files...";
mkdir -p "$BASE_DIR/build";
cp -r "$BASE_DIR/web/posts" "$BASE_DIR/build/static";
find "$BASE_DIR/build/static" -type f -name "content.md" -delete;
cp -r "$BASE_DIR/web/static/"* "$BASE_DIR/build/static";
cp "$BASE_DIR/web/config.json" "$BASE_DIR/build/config.json";

echo "Building static pages...";
HOST="$HOST" "$BASE_DIR/web/render-all.mjs";
