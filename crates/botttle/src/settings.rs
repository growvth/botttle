//! User settings: what they are, where they live, and how they reach the UI.
//!
//! [`Settings`] is the source of truth and is persisted as JSON. The [`Theme`]
//! global is derived from it, so every change goes through [`Settings::update`],
//! which re-resolves the theme and redraws.

use std::path::PathBuf;

use gpui::{App, BorrowAppContext, Global, Hsla, Rgba};
use serde::{Deserialize, Serialize};

use crate::theme;

pub const DEFAULT_FONT_SIZE: f32 = 13.0;
pub const DEFAULT_UI_FONT_SIZE: f32 = 12.0;
pub const DEFAULT_LINE_HEIGHT: f32 = 1.4;
pub const DEFAULT_SCROLLBACK: usize = 10_000;

/// How the cursor is drawn in a focused terminal.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CursorShape {
    Block,
    Bar,
    Underline,
}

impl CursorShape {
    pub const ALL: [CursorShape; 3] = [Self::Block, Self::Bar, Self::Underline];

    pub fn label(self) -> &'static str {
        match self {
            Self::Block => "Block",
            Self::Bar => "Bar",
            Self::Underline => "Underline",
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default)]
pub struct Settings {
    /// A theme name from [`theme::all`], e.g. "Gruvbox Dark".
    pub theme: String,
    /// `None` means "pick the best monospace font installed".
    pub terminal_font_family: Option<String>,
    pub terminal_font_size: f32,
    /// Multiplied by the font size to get the height of a terminal row.
    pub line_height: f32,
    /// Programming ligatures, where the font provides them.
    pub ligatures: bool,
    pub ui_font_family: Option<String>,
    pub ui_font_size: f32,
    /// Overrides the theme's background, as `#rrggbb`.
    pub background: Option<String>,
    pub cursor_shape: CursorShape,
    /// Applies to panes opened from now on.
    pub scrollback_lines: usize,
}

impl Global for Settings {}

impl Default for Settings {
    fn default() -> Self {
        Self {
            theme: theme::DEFAULT_THEME.to_string(),
            terminal_font_family: None,
            terminal_font_size: DEFAULT_FONT_SIZE,
            line_height: DEFAULT_LINE_HEIGHT,
            ligatures: true,
            ui_font_family: None,
            ui_font_size: DEFAULT_UI_FONT_SIZE,
            background: None,
            cursor_shape: CursorShape::Block,
            scrollback_lines: DEFAULT_SCROLLBACK,
        }
    }
}

impl Settings {
    /// Reads the settings file, falling back to defaults if it is missing or
    /// unreadable. A malformed file is left on disk rather than overwritten.
    pub fn load() -> Self {
        let Some(path) = Self::path() else {
            return Self::default();
        };
        let Ok(contents) = std::fs::read_to_string(&path) else {
            return Self::default();
        };
        match serde_json::from_str(&contents) {
            Ok(settings) => settings,
            Err(error) => {
                eprintln!("botttle: ignoring {}: {error}", path.display());
                Self::default()
            }
        }
    }

    pub fn save(&self) {
        let Some(path) = Self::path() else {
            return;
        };
        if let Some(parent) = path.parent() {
            if std::fs::create_dir_all(parent).is_err() {
                return;
            }
        }
        match serde_json::to_string_pretty(self) {
            Ok(json) => {
                if let Err(error) = std::fs::write(&path, json) {
                    eprintln!("botttle: could not write {}: {error}", path.display());
                }
            }
            Err(error) => eprintln!("botttle: could not serialize settings: {error}"),
        }
    }

    pub fn path() -> Option<PathBuf> {
        let base = std::env::var_os("XDG_CONFIG_HOME")
            .map(PathBuf::from)
            .or_else(|| std::env::var_os("HOME").map(|home| PathBuf::from(home).join(".config")))?;
        Some(base.join("botttle").join("settings.json"))
    }

    /// The background override, if it parses.
    pub fn background_color(&self) -> Option<Hsla> {
        self.background.as_deref().and_then(parse_hex)
    }

    /// Applies an edit: saves it, re-resolves the theme, and redraws every window.
    pub fn update(cx: &mut App, edit: impl FnOnce(&mut Settings)) {
        cx.update_global::<Settings, _>(|settings, _| edit(settings));
        let settings = cx.global::<Settings>().clone();
        settings.save();
        theme::apply(&settings, cx);
        cx.refresh_windows();
    }
}

/// Parses `#rrggbb` or `rrggbb`.
pub fn parse_hex(hex: &str) -> Option<Hsla> {
    let hex = hex.trim().trim_start_matches('#');
    if hex.len() != 6 {
        return None;
    }
    let value = u32::from_str_radix(hex, 16).ok()?;
    Some(
        Rgba {
            r: ((value >> 16) & 0xff) as f32 / 255.0,
            g: ((value >> 8) & 0xff) as f32 / 255.0,
            b: (value & 0xff) as f32 / 255.0,
            a: 1.0,
        }
        .into(),
    )
}

/// Formats a color as `#rrggbb`, for storing a swatch choice.
pub fn to_hex(color: Hsla) -> String {
    let rgba: Rgba = color.into();
    format!(
        "#{:02x}{:02x}{:02x}",
        (rgba.r * 255.0).round() as u8,
        (rgba.g * 255.0).round() as u8,
        (rgba.b * 255.0).round() as u8
    )
}

/// Initializes settings before anything reads the theme.
pub fn init(cx: &mut App) {
    cx.set_global(Settings::load());
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hex_round_trips() {
        let color = parse_hex("#1e2030").expect("valid hex");
        assert_eq!(to_hex(color), "#1e2030");
    }

    #[test]
    fn malformed_hex_is_rejected() {
        assert!(parse_hex("nope").is_none());
        assert!(parse_hex("#12345").is_none());
    }

    #[test]
    fn defaults_round_trip_through_json() {
        let json = serde_json::to_string(&Settings::default()).expect("serializes");
        let parsed: Settings = serde_json::from_str(&json).expect("parses");
        assert_eq!(parsed.theme, Settings::default().theme);
        assert_eq!(parsed.cursor_shape, CursorShape::Block);
    }

    #[test]
    fn unknown_and_missing_fields_fall_back_to_defaults() {
        let parsed: Settings =
            serde_json::from_str(r#"{"terminal_font_size": 15.0}"#).expect("parses");
        assert_eq!(parsed.terminal_font_size, 15.0);
        assert_eq!(parsed.line_height, DEFAULT_LINE_HEIGHT);
    }
}
