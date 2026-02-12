#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCES_DIR="$ROOT_DIR/branding/icons/sources"
OUT_DIR="$ROOT_DIR/src-tauri/icons"
THEME="${1:-dark}"
# Optical sizing tweak so Dock / taskbar sizing matches neighboring apps.
ICON_CONTENT_SCALE="${ICON_CONTENT_SCALE:-84}"

make_master_icon() {
  local source_png="$1"
  local output_png="$2"

  magick "$source_png" \
    -resize 1024x1024 \
    -filter Lanczos \
    -resize "${ICON_CONTENT_SCALE}%" \
    -gravity center \
    -background none \
    -extent 1024x1024 \
    "$output_png"
}

build_icns_from_master() {
  local master_png="$1"
  local output_icns="$2"
  local iconset_parent
  local iconset_dir

  iconset_parent="$(mktemp -d "${TMPDIR:-/tmp}/subtrkr-iconset-XXXX")"
  iconset_dir="$iconset_parent/icon.iconset"
  mkdir -p "$iconset_dir"

  magick "$master_png" -resize 16x16 "$iconset_dir/icon_16x16.png"
  magick "$master_png" -resize 32x32 "$iconset_dir/icon_16x16@2x.png"
  magick "$master_png" -resize 32x32 "$iconset_dir/icon_32x32.png"
  magick "$master_png" -resize 64x64 "$iconset_dir/icon_32x32@2x.png"
  magick "$master_png" -resize 128x128 "$iconset_dir/icon_128x128.png"
  magick "$master_png" -resize 256x256 "$iconset_dir/icon_128x128@2x.png"
  magick "$master_png" -resize 256x256 "$iconset_dir/icon_256x256.png"
  magick "$master_png" -resize 512x512 "$iconset_dir/icon_256x256@2x.png"
  magick "$master_png" -resize 512x512 "$iconset_dir/icon_512x512.png"
  magick "$master_png" -resize 1024x1024 "$iconset_dir/icon_512x512@2x.png"

  iconutil -c icns "$iconset_dir" -o "$output_icns"
  rm -rf "$iconset_parent"
}

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
make_master_icon "$SOURCE_FILE" "$MASTER_ICON"

GEN_DIR="$TMP_DIR/generated"
mkdir -p "$GEN_DIR"
bunx tauri icon "$MASTER_ICON" -o "$GEN_DIR" >/dev/null

mkdir -p "$OUT_DIR"
rm -f "$OUT_DIR"/{32x32.png,64x64.png,128x128.png,128x128@2x.png,icon.png,icon.icns,icon.ico}
rm -f "$OUT_DIR"/{icon-16.png,icon-32.png,icon-48.png,icon-256.png}
rm -f "$OUT_DIR"/{icon-tinted-template-light.png,icon-tinted-template-dark.png}
rm -f "$OUT_DIR"/{icon-light.icns,icon-dark.icns,icon-tinted-dark.icns,icon-tinted-light.icns,icon-clear-dark.icns,icon-clear-light.icns}
rm -f "$OUT_DIR"/{Square30x30Logo.png,Square44x44Logo.png,Square71x71Logo.png,Square89x89Logo.png,Square107x107Logo.png,Square142x142Logo.png,Square150x150Logo.png,Square284x284Logo.png,Square310x310Logo.png,StoreLogo.png}
rm -rf "$OUT_DIR/android" "$OUT_DIR/ios" "$OUT_DIR/iconsets"

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

declare -a VARIANT_SPECS=(
  "subtrkr-default.png|icon-light.icns|light"
  "subtrkr-dark.png|icon-dark.icns|dark"
  "subtrkr-clear-light.png|icon-clear-light.icns|clear-light"
  "subtrkr-clear-dark.png|icon-clear-dark.icns|clear-dark"
  "subtrkr-tinted-template-light.png|icon-tinted-light.icns|tinted-light"
  "subtrkr-tinted-template-dark.png|icon-tinted-dark.icns|tinted-dark"
)

for spec in "${VARIANT_SPECS[@]}"; do
  IFS="|" read -r variant_source_name variant_output variant_key <<< "$spec"
  variant_source="$SOURCES_DIR/$variant_source_name"
  variant_master="$TMP_DIR/master-${variant_key}.png"

  if [[ -f "$variant_source" ]]; then
    make_master_icon "$variant_source" "$variant_master"
    build_icns_from_master "$variant_master" "$OUT_DIR/$variant_output"
  fi
done

for tone in light dark; do
  template_source="$SOURCES_DIR/subtrkr-tinted-template-${tone}.png"
  template_master="$TMP_DIR/master-tinted-template-${tone}.png"
  template_output="$OUT_DIR/icon-tinted-template-${tone}.png"
  if [[ -f "$template_source" ]]; then
    make_master_icon "$template_source" "$template_master"
    cp "$template_master" "$template_output"
  fi
done

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

for maybe_resources in \
  "$ROOT_DIR/src-tauri/target/debug/bundle/macos/subtrkr.app/Contents/Resources" \
  "$ROOT_DIR/src-tauri/target/release/bundle/macos/subtrkr.app/Contents/Resources"
do
  if [[ -d "$maybe_resources" ]]; then
    mkdir -p "$maybe_resources/icons"
    cp "$OUT_DIR/icon-light.icns" "$maybe_resources/icons/icon-light.icns"
    cp "$OUT_DIR/icon-dark.icns" "$maybe_resources/icons/icon-dark.icns"
    cp "$OUT_DIR/icon-clear-light.icns" "$maybe_resources/icons/icon-clear-light.icns"
    cp "$OUT_DIR/icon-clear-dark.icns" "$maybe_resources/icons/icon-clear-dark.icns"
    cp "$OUT_DIR/icon-tinted-light.icns" "$maybe_resources/icons/icon-tinted-light.icns"
    cp "$OUT_DIR/icon-tinted-dark.icns" "$maybe_resources/icons/icon-tinted-dark.icns"
    cp "$OUT_DIR/icon-tinted-template-light.png" "$maybe_resources/icons/icon-tinted-template-light.png"
    cp "$OUT_DIR/icon-tinted-template-dark.png" "$maybe_resources/icons/icon-tinted-template-dark.png"
  fi
done

echo "Generated SubTrkr icons"
echo "Theme: $THEME"
echo "Source: $SOURCE_FILE"
echo "Content scale: ${ICON_CONTENT_SCALE}%"
