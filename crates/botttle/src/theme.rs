//! Colors, typography, and spacing for the whole app.
//!
//! The theme lives as a gpui [`Global`] so any view can read it without threading
//! it through constructors, and so a future settings file can swap it at runtime.

use gpui::{px, rgb, App, Global, Hsla, Pixels, Rgba, SharedString};

/// Monospace families we look for, in order, before falling back to whatever the
/// platform calls "monospace".
const FONT_CANDIDATES: &[&str] = &[
    "JetBrains Mono",
    "Berkeley Mono",
    "SF Mono",
    "Menlo",
    "DejaVu Sans Mono",
    "Consolas",
];

#[derive(Clone)]
pub struct Theme {
    /// Window background, behind everything else.
    pub background: Hsla,
    /// Chrome surfaces: tab strip, status bar.
    pub surface: Hsla,
    /// Raised surfaces: the active tab, hovered controls.
    pub elevated: Hsla,
    pub border: Hsla,
    pub border_active: Hsla,
    pub text: Hsla,
    pub text_muted: Hsla,
    pub accent: Hsla,
    pub danger: Hsla,

    pub terminal_background: Hsla,
    pub terminal_foreground: Hsla,
    pub cursor: Hsla,
    pub selection: Hsla,
    /// The 16 ANSI colors: 0-7 normal, 8-15 bright.
    pub ansi: [Hsla; 16],

    pub font_family: SharedString,
    pub ui_font_family: SharedString,
    pub font_size: Pixels,
    /// Multiplied by the font size to get the height of a terminal row.
    pub line_height_factor: f32,
}

impl Global for Theme {}

impl Theme {
    pub fn line_height(&self) -> Pixels {
        px((f32::from(self.font_size) * self.line_height_factor).round())
    }

    /// Clamped so a stray key repeat can't make the grid unusable.
    pub fn set_font_size(&mut self, size: Pixels) {
        self.font_size = px(f32::from(size).clamp(8.0, 32.0));
    }

    fn dark(font_family: SharedString, ui_font_family: SharedString) -> Self {
        Self {
            background: color(0x0d0f14),
            surface: color(0x121520),
            elevated: color(0x1b2030),
            border: color(0x232838),
            border_active: color(0x39415c),
            text: color(0xd8dcea),
            text_muted: color(0x7b8399),
            accent: color(0x7c8cf8),
            danger: color(0xf2727b),

            terminal_background: color(0x0d0f14),
            terminal_foreground: color(0xd8dcea),
            cursor: color(0x7c8cf8),
            selection: color(0x2b3350),
            ansi: [
                color(0x15181e), // black
                color(0xf2777a), // red
                color(0x7fd88f), // green
                color(0xe6c07b), // yellow
                color(0x7aa2f7), // blue
                color(0xbb9af7), // magenta
                color(0x56c6d6), // cyan
                color(0xc3c9d5), // white
                color(0x4c5262), // bright black
                color(0xff9098), // bright red
                color(0x9be7a9), // bright green
                color(0xf5d08a), // bright yellow
                color(0x96b7ff), // bright blue
                color(0xd0b4ff), // bright magenta
                color(0x79ddec), // bright cyan
                color(0xedf0f6), // bright white
            ],

            font_family,
            ui_font_family,
            font_size: px(13.0),
            line_height_factor: 1.4,
        }
    }
}

fn color(hex: u32) -> Hsla {
    let rgba: Rgba = rgb(hex);
    rgba.into()
}

/// Picks the best available fonts and installs the theme as a global.
pub fn init(cx: &mut App) {
    let installed = cx.text_system().all_font_names();
    let mono = FONT_CANDIDATES
        .iter()
        .find(|candidate| installed.iter().any(|name| name == *candidate))
        .map(|name| SharedString::from(name.to_string()))
        .unwrap_or_else(|| SharedString::from("monospace"));

    let ui = if installed.iter().any(|name| name == "Inter") {
        SharedString::from("Inter")
    } else if cfg!(target_os = "macos") {
        SharedString::from("SF Pro Text")
    } else {
        mono.clone()
    };

    cx.set_global(Theme::dark(mono, ui));
}
