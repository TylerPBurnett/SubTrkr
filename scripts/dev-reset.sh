#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VITE_CACHE_DIR="$ROOT_DIR/node_modules/.vite"
STAMP="$(date +%s)"

echo "Resetting local Vite/esbuild state..."

# Stop stale processes scoped to this workspace only.
pkill -f "$ROOT_DIR/node_modules/.bin/vite" 2>/dev/null || true
pkill -f "$ROOT_DIR/node_modules/@esbuild/.*/bin/esbuild --service" 2>/dev/null || true
pkill -f "$ROOT_DIR/src-tauri/target/debug/SubTrkr" 2>/dev/null || true

# Move cache out of the way instead of deleting so recovery is reversible.
if [[ -d "$VITE_CACHE_DIR" ]]; then
  mv "$VITE_CACHE_DIR" "/tmp/subtrkr-vite-cache-$STAMP"
fi
mkdir -p "$VITE_CACHE_DIR"

echo "Starting Tauri dev..."
bun tauri dev
