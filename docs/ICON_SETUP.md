# Icon Setup Documentation

## Generated Icons

All icon variants have been generated from your Mono1 designs:

### macOS Icons (.icns)
- `icon.icns` - Default variant (light green)
- `icon-dark.icns` - Dark mode variant (dark background)
- `icon-clear-light.icns` - Clear light variant
- `icon-clear-dark.icns` - Clear dark variant
- `icon-tinted-light.icns` - Tinted light (for menu bar)
- `icon-tinted-dark.icns` - Tinted dark (for menu bar)

### Windows Icons
- `icon.ico` - Multi-size Windows icon (16, 32, 48, 256px)

### Standard PNGs
- `32x32.png`, `128x128.png`, `128x128@2x.png` - Standard sizes for various uses

## Current Configuration

The app is configured to use the default icon (`icon.icns`) which works across light and dark modes.

## Appearance-Aware Icon Options

### Option 1: Use Dark Variant (Recommended for cross-appearance)
If you want an icon that looks better in both light and dark modes:

```json
// In tauri.conf.json, change the icons array:
"icon": [
  "icons/32x32.png",
  "icons/128x128.png",
  "icons/128x128@2x.png",
  "icons/icon-dark.icns",  // Use dark variant
  "icons/icon.ico"
]
```

### Option 2: Menu Bar / Tray Icon with Template Support
For a menu bar icon that automatically adapts to system appearance:

Add to `src-tauri/src/lib.rs`:

```rust
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{TrayIconBuilder, TrayIconEvent};
use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            // Create menu for tray
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&quit])?;

            // Create tray icon with template support
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .menu_on_left_click(true)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

Then use the tinted variants for menu bar icons.

### Option 3: Asset Catalog (Advanced - Full macOS Support)
For complete appearance-aware icons like Apple apps, you need to:

1. Create an Asset Catalog (`.xcassets`)
2. Add appearance variants to the catalog
3. Configure Tauri to use the Asset Catalog during build

This requires custom build scripts and is more advanced.

## Testing Your Icons

1. **Build the app**: `bun tauri build`
2. **Check Dock icon**: Look in macOS Dock
3. **Test dark mode**: System Settings → Appearance → Dark
4. **Test light mode**: System Settings → Appearance → Light

## Icon Files Location

All icons are in: `src-tauri/icons/`

- Main app uses: `icon.icns` (currently the default variant)
- Windows uses: `icon.ico`
- macOS also uses the PNG sizes for various contexts
