#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCES_DIR="$ROOT_DIR/branding/icons/sources"
OUT_DIR="$ROOT_DIR/src-tauri/icons"
THEME="${1:-dark}"
# Optical sizing tweak so Dock / taskbar sizing matches neighboring apps.
ICON_CONTENT_SCALE="${ICON_CONTENT_SCALE:-84}"

case "$THEME" in
  dark | default | clear-dark | clear-light | tinted-dark | tinted-light) ;;
  *)
    echo "Unsupported theme: $THEME"
    echo "Supported themes: dark, default, clear-dark, clear-light, tinted-dark, tinted-light"
    exit 1
    ;;
esac

SOURCE_FILE="$SOURCES_DIR/subtrkr-${THEME}.png"
if [[ ! -f "$SOURCE_FILE" ]]; then
  echo "Missing source file: $SOURCE_FILE"
  exit 1
fi

if ! command -v magick >/dev/null 2>&1; then
  echo "ImageMagick (magick) is required."
  exit 1
fi

if ! command -v bunx >/dev/null 2>&1; then
  echo "bunx is required."
  exit 1
fi

if ! command -v iconutil >/dev/null 2>&1; then
  echo "iconutil is required (macOS)."
  exit 1
fi

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/subtrkr-icons-XXXX")"
trap 'rm -rf "$TMP_DIR"' EXIT

MASTER_ICON="$TMP_DIR/master-1024.png"
magick "$SOURCE_FILE" \
  -resize 1024x1024 \
  -filter Lanczos \
  -resize "${ICON_CONTENT_SCALE}%" \
  -gravity center \
  -background none \
  -extent 1024x1024 \
  "$MASTER_ICON"

GEN_DIR="$TMP_DIR/generated"
mkdir -p "$GEN_DIR"
bunx tauri icon "$MASTER_ICON" -o "$GEN_DIR" >/dev/null

mkdir -p "$OUT_DIR"
rm -f "$OUT_DIR"/{32x32.png,64x64.png,128x128.png,128x128@2x.png,icon.png,icon.icns,icon.ico}
rm -f "$OUT_DIR"/{icon-16.png,icon-32.png,icon-48.png,icon-256.png}
rm -f "$OUT_DIR"/{icon-dark.icns,icon-clear-dark.icns,icon-clear-light.icns,icon-tinted-dark.icns,icon-tinted-light.icns}
rm -f "$OUT_DIR"/{Square30x30Logo.png,Square44x44Logo.png,Square71x71Logo.png,Square89x89Logo.png,Square107x107Logo.png,Square142x142Logo.png,Square150x150Logo.png,Square284x284Logo.png,Square310x310Logo.png,StoreLogo.png}
rm -rf "$OUT_DIR/android" "$OUT_DIR/ios"

cp "$GEN_DIR/icon.png" "$OUT_DIR/icon.png"
cp "$GEN_DIR/icon.icns" "$OUT_DIR/icon.icns"
cp "$GEN_DIR/icon.ico" "$OUT_DIR/icon.ico"
cp "$GEN_DIR/32x32.png" "$OUT_DIR/32x32.png"
cp "$GEN_DIR/64x64.png" "$OUT_DIR/64x64.png"
cp "$GEN_DIR/128x128.png" "$OUT_DIR/128x128.png"
cp "$GEN_DIR/128x128@2x.png" "$OUT_DIR/128x128@2x.png"

cp "$GEN_DIR/Square30x30Logo.png" "$OUT_DIR/Square30x30Logo.png"
cp "$GEN_DIR/Square44x44Logo.png" "$OUT_DIR/Square44x44Logo.png"
cp "$GEN_DIR/Square71x71Logo.png" "$OUT_DIR/Square71x71Logo.png"
cp "$GEN_DIR/Square89x89Logo.png" "$OUT_DIR/Square89x89Logo.png"
cp "$GEN_DIR/Square107x107Logo.png" "$OUT_DIR/Square107x107Logo.png"
cp "$GEN_DIR/Square142x142Logo.png" "$OUT_DIR/Square142x142Logo.png"
cp "$GEN_DIR/Square150x150Logo.png" "$OUT_DIR/Square150x150Logo.png"
cp "$GEN_DIR/Square284x284Logo.png" "$OUT_DIR/Square284x284Logo.png"
cp "$GEN_DIR/Square310x310Logo.png" "$OUT_DIR/Square310x310Logo.png"
cp "$GEN_DIR/StoreLogo.png" "$OUT_DIR/StoreLogo.png"

magick "$MASTER_ICON" -resize 16x16 "$OUT_DIR/icon-16.png"
magick "$MASTER_ICON" -resize 32x32 "$OUT_DIR/icon-32.png"
magick "$MASTER_ICON" -resize 48x48 "$OUT_DIR/icon-48.png"
magick "$MASTER_ICON" -resize 256x256 "$OUT_DIR/icon-256.png"

ICONSET_DIR="$OUT_DIR/iconsets/icon.iconset"
rm -rf "$ICONSET_DIR"
mkdir -p "$ICONSET_DIR"

magick "$MASTER_ICON" -resize 16x16 "$ICONSET_DIR/icon_16x16.png"
magick "$MASTER_ICON" -resize 32x32 "$ICONSET_DIR/icon_16x16@2x.png"
magick "$MASTER_ICON" -resize 32x32 "$ICONSET_DIR/icon_32x32.png"
magick "$MASTER_ICON" -resize 64x64 "$ICONSET_DIR/icon_32x32@2x.png"
magick "$MASTER_ICON" -resize 128x128 "$ICONSET_DIR/icon_128x128.png"
magick "$MASTER_ICON" -resize 256x256 "$ICONSET_DIR/icon_128x128@2x.png"
magick "$MASTER_ICON" -resize 256x256 "$ICONSET_DIR/icon_256x256.png"
magick "$MASTER_ICON" -resize 512x512 "$ICONSET_DIR/icon_256x256@2x.png"
magick "$MASTER_ICON" -resize 512x512 "$ICONSET_DIR/icon_512x512.png"
magick "$MASTER_ICON" -resize 1024x1024 "$ICONSET_DIR/icon_512x512@2x.png"

# Keep already-built local bundles in sync so tauri dev doesn't show stale icons.
for maybe_icon in \
  "$ROOT_DIR/src-tauri/target/debug/bundle/macos/subtrkr.app/Contents/Resources/icon.icns" \
  "$ROOT_DIR/src-tauri/target/release/bundle/macos/subtrkr.app/Contents/Resources/icon.icns" \
  "$ROOT_DIR/src-tauri/target/debug/bundle/dmg/icon.icns" \
  "$ROOT_DIR/src-tauri/target/release/bundle/dmg/icon.icns"
do
  if [[ -f "$maybe_icon" ]]; then
    cp "$OUT_DIR/icon.icns" "$maybe_icon"
  fi
done

echo "Generated SubTrkr icons"
echo "Theme: $THEME"
echo "Source: $SOURCE_FILE"
echo "Content scale: ${ICON_CONTENT_SCALE}%"
