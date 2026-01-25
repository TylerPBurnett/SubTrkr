// On macOS with titleBarStyle: "Overlay", this component just provides spacing
// The native traffic lights are handled by the OS
export default function TitleBar() {
  // Don't render in browser dev mode
  if (!('__TAURI_INTERNALS__' in window)) {
    return null;
  }

  // Just a clean minimal bar for macOS - traffic lights are native
  // On Windows/Linux, Tauri handles the default decorations
  return null;
}
