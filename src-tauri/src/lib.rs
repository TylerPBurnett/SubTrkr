#[cfg(target_os = "macos")]
mod macos_icon {
    use std::{collections::HashSet, fs, io::Cursor, path::PathBuf, process::Command};

    use image::DynamicImage;
    use tauri::{AppHandle, Manager, Runtime};

    #[derive(Clone, Copy)]
    enum IconVariant {
        Light,
        Dark,
        ClearLight,
        ClearDark,
        TintedLight,
        TintedDark,
    }

    #[derive(Clone, Copy)]
    struct RgbColor {
        r: u8,
        g: u8,
        b: u8,
    }

    impl RgbColor {
        const fn new(r: u8, g: u8, b: u8) -> Self {
            Self { r, g, b }
        }
    }

    fn read_global_default(key: &str) -> Option<String> {
        let output = Command::new("defaults")
            .args(["read", "-g", key])
            .output()
            .ok()?;

        if !output.status.success() {
            return None;
        }

        let value = String::from_utf8(output.stdout).ok()?;
        let trimmed = value.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_string())
        }
    }

    fn uses_dark_interface() -> bool {
        read_global_default("AppleInterfaceStyle").as_deref() == Some("Dark")
    }

    fn selected_icon_variant() -> IconVariant {
        let theme = read_global_default("AppleIconAppearanceTheme")
            .unwrap_or_default()
            .to_ascii_lowercase()
            .replace([' ', '-', '_'], "");
        let dark = uses_dark_interface();

        if theme.contains("clear") {
            if theme.contains("dark") {
                IconVariant::ClearDark
            } else if theme.contains("light") {
                IconVariant::ClearLight
            } else if dark {
                IconVariant::ClearDark
            } else {
                IconVariant::ClearLight
            }
        } else if theme.contains("tinted") {
            if dark {
                IconVariant::TintedDark
            } else {
                IconVariant::TintedLight
            }
        } else if theme.contains("dark") {
            IconVariant::Dark
        } else if theme.contains("light") || theme.contains("regular") {
            IconVariant::Light
        } else if dark {
            IconVariant::Dark
        } else {
            IconVariant::Light
        }
    }

    fn variant_resource(variant: IconVariant) -> &'static str {
        match variant {
            IconVariant::Light => "icons/icon-light.icns",
            IconVariant::Dark => "icons/icon-dark.icns",
            IconVariant::ClearLight => "icons/icon-clear-light.icns",
            IconVariant::ClearDark => "icons/icon-clear-dark.icns",
            IconVariant::TintedLight => "icons/icon-tinted-light.icns",
            IconVariant::TintedDark => "icons/icon-tinted-dark.icns",
        }
    }

    fn tinted_template_resource(variant: IconVariant) -> Option<&'static str> {
        match variant {
            IconVariant::TintedLight => Some("icons/icon-tinted-template-light.png"),
            IconVariant::TintedDark => Some("icons/icon-tinted-template-dark.png"),
            _ => None,
        }
    }

    fn candidate_resource_paths<R: Runtime>(app: &AppHandle<R>, resource: &str) -> Vec<PathBuf> {
        let mut paths = Vec::new();

        if let Ok(resource_dir) = app.path().resource_dir() {
            paths.push(resource_dir.join(resource));

            if let Some(stripped) = resource.strip_prefix("icons/") {
                paths.push(resource_dir.join("icons").join(stripped));
            }

            if let Some(parent) = resource_dir.parent() {
                paths.push(parent.join("Resources").join(resource));
            }
        }

        // In `tauri dev`, bundled resources can be absent. Read directly from src-tauri/icons.
        let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        paths.push(manifest_dir.join(resource));
        if let Some(stripped) = resource.strip_prefix("icons/") {
            paths.push(manifest_dir.join("icons").join(stripped));
        }

        let mut seen = HashSet::new();
        paths
            .into_iter()
            .filter(|path| seen.insert(path.clone()))
            .collect()
    }

    fn read_resource_bytes<R: Runtime>(app: &AppHandle<R>, resource: &str) -> Option<Vec<u8>> {
        candidate_resource_paths(app, resource)
            .into_iter()
            .find_map(|path| fs::read(path).ok())
    }

    fn set_application_icon(icon_bytes: &[u8]) -> Result<(), String> {
        use objc2::AllocAnyThread;
        use objc2_app_kit::{NSApplication, NSImage};
        use objc2_foundation::{MainThreadMarker, NSData};

        let mtm = unsafe { MainThreadMarker::new_unchecked() };
        let app = NSApplication::sharedApplication(mtm);
        let data = NSData::with_bytes(icon_bytes);
        let app_icon = NSImage::initWithData(NSImage::alloc(), &data)
            .ok_or_else(|| "failed to decode icon bytes".to_string())?;
        unsafe { app.setApplicationIconImage(Some(&app_icon)) };
        Ok(())
    }

    fn parse_hex_color(value: &str) -> Option<RgbColor> {
        let trimmed = value.trim().trim_matches('"');
        let hex = trimmed.strip_prefix('#').unwrap_or(trimmed);
        let rgb_hex = match hex.len() {
            6 => hex,
            8 => &hex[..6],
            _ => return None,
        };

        let red = u8::from_str_radix(&rgb_hex[0..2], 16).ok()?;
        let green = u8::from_str_radix(&rgb_hex[2..4], 16).ok()?;
        let blue = u8::from_str_radix(&rgb_hex[4..6], 16).ok()?;
        Some(RgbColor::new(red, green, blue))
    }

    fn parse_named_tint(value: &str) -> Option<RgbColor> {
        let normalized = value
            .trim()
            .to_ascii_lowercase()
            .replace([' ', '-', '_'], "");

        match normalized.as_str() {
            "red" => Some(RgbColor::new(255, 69, 58)),
            "orange" => Some(RgbColor::new(255, 149, 0)),
            "yellow" => Some(RgbColor::new(255, 214, 10)),
            "green" => Some(RgbColor::new(48, 209, 88)),
            "mint" => Some(RgbColor::new(0, 199, 190)),
            "teal" => Some(RgbColor::new(100, 210, 255)),
            "cyan" => Some(RgbColor::new(50, 173, 230)),
            "blue" => Some(RgbColor::new(10, 132, 255)),
            "indigo" => Some(RgbColor::new(94, 92, 230)),
            "purple" => Some(RgbColor::new(191, 90, 242)),
            "pink" => Some(RgbColor::new(255, 55, 95)),
            "brown" => Some(RgbColor::new(172, 142, 104)),
            "gray" | "grey" | "graphite" => Some(RgbColor::new(142, 142, 147)),
            _ => None,
        }
    }

    fn parse_numeric_rgb(value: &str) -> Option<RgbColor> {
        let components: Vec<f32> = value
            .split(|char: char| !(char.is_ascii_digit() || char == '.' || char == '-'))
            .filter(|component| !component.is_empty())
            .filter_map(|component| component.parse::<f32>().ok())
            .collect();

        if components.len() < 3 {
            return None;
        }

        let (r, g, b) = (components[0], components[1], components[2]);
        let scale = if r <= 1.0 && g <= 1.0 && b <= 1.0 {
            255.0
        } else {
            1.0
        };

        Some(RgbColor::new(
            (r * scale).clamp(0.0, 255.0).round() as u8,
            (g * scale).clamp(0.0, 255.0).round() as u8,
            (b * scale).clamp(0.0, 255.0).round() as u8,
        ))
    }

    fn parse_accent_index(value: &str) -> Option<RgbColor> {
        let accent = value.trim().parse::<i32>().ok()?;
        match accent {
            -1 => Some(RgbColor::new(142, 142, 147)),
            0 => Some(RgbColor::new(255, 69, 58)),
            1 => Some(RgbColor::new(255, 149, 0)),
            2 => Some(RgbColor::new(255, 204, 0)),
            3 => Some(RgbColor::new(48, 209, 88)),
            4 => Some(RgbColor::new(10, 132, 255)),
            5 => Some(RgbColor::new(191, 90, 242)),
            6 => Some(RgbColor::new(255, 55, 95)),
            _ => None,
        }
    }

    fn current_tint_color() -> RgbColor {
        read_global_default("AppleIconAppearanceTintColor")
            .and_then(|value| {
                parse_hex_color(&value)
                    .or_else(|| parse_named_tint(&value))
                    .or_else(|| parse_numeric_rgb(&value))
            })
            .or_else(|| {
                read_global_default("AppleAccentColor").and_then(|value| {
                    parse_accent_index(&value).or_else(|| parse_numeric_rgb(&value))
                })
            })
            .unwrap_or_else(|| RgbColor::new(10, 132, 255))
    }

    fn render_tinted_icon(template_bytes: &[u8], tint: RgbColor) -> Result<Vec<u8>, String> {
        let mut icon = image::load_from_memory(template_bytes)
            .map_err(|error| format!("failed to decode tint template: {error}"))?
            .to_rgba8();

        for pixel in icon.pixels_mut() {
            let [red, green, blue, alpha] = pixel.0;
            if alpha == 0 {
                continue;
            }

            let intensity = (u16::from(red) + u16::from(green) + u16::from(blue)) / 3;
            let tinted_alpha = ((u16::from(alpha) * intensity) / 255) as u8;
            pixel.0 = [tint.r, tint.g, tint.b, tinted_alpha];
        }

        let mut output = Cursor::new(Vec::new());
        DynamicImage::ImageRgba8(icon)
            .write_to(&mut output, image::ImageFormat::Png)
            .map_err(|error| format!("failed to encode tinted icon: {error}"))?;
        Ok(output.into_inner())
    }

    fn apply_tinted_icon<R: Runtime>(app: &AppHandle<R>, variant: IconVariant) -> bool {
        let Some(template_resource) = tinted_template_resource(variant) else {
            return false;
        };

        let Some(template_bytes) = read_resource_bytes(app, template_resource) else {
            return false;
        };

        let tint = current_tint_color();
        let Ok(tinted_bytes) = render_tinted_icon(&template_bytes, tint) else {
            return false;
        };

        set_application_icon(&tinted_bytes).is_ok()
    }

    pub fn sync_with_system<R: Runtime>(app: &AppHandle<R>) {
        let variant = selected_icon_variant();
        if matches!(variant, IconVariant::TintedLight | IconVariant::TintedDark)
            && apply_tinted_icon(app, variant)
        {
            return;
        }

        let preferred = variant_resource(variant);
        let candidates = [
            preferred,
            "icons/icon-tinted-dark.icns",
            "icons/icon-tinted-light.icns",
            "icons/icon-clear-dark.icns",
            "icons/icon-clear-light.icns",
            "icons/icon-dark.icns",
            "icons/icon-light.icns",
            "icon.icns",
        ];

        for resource in candidates {
            let Some(bytes) = read_resource_bytes(app, resource) else {
                continue;
            };

            if set_application_icon(&bytes).is_ok() {
                return;
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| {
        #[cfg(target_os = "macos")]
        match event {
            tauri::RunEvent::Ready | tauri::RunEvent::Resumed => {
                macos_icon::sync_with_system(app_handle);
            }
            tauri::RunEvent::WindowEvent { event, .. } => {
                if matches!(event, tauri::WindowEvent::Focused(true)) {
                    macos_icon::sync_with_system(app_handle);
                }
            }
            _ => {}
        }
    });
}
