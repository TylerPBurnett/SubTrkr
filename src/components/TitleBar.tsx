import type { CSSProperties } from "react";

export default function TitleBar() {
  const isTauriWindow = "__TAURI_INTERNALS__" in window;
  const dragStyle = isTauriWindow
    ? ({ WebkitAppRegion: "drag" } as CSSProperties)
    : undefined;

  return (
    <div
      aria-hidden="true"
      className="window-chrome"
      data-tauri-drag-region={isTauriWindow ? "" : undefined}
      style={dragStyle}
    />
  );
}
