//! Translates the emulator's color model into gpui colors.

use alacritty_terminal::term::color::Colors;
use alacritty_terminal::vte::ansi::{Color as AnsiColor, NamedColor, Rgb};
use gpui::Hsla;

use crate::theme::Theme;

/// Resolves a cell color, honoring any palette entries the program set with OSC 4.
pub fn resolve(color: AnsiColor, colors: &Colors, theme: &Theme) -> Hsla {
    match color {
        AnsiColor::Spec(rgb) => from_rgb(rgb),
        AnsiColor::Indexed(index) => indexed(index, colors, theme),
        AnsiColor::Named(named) => self::named(named, colors, theme),
    }
}

fn named(color: NamedColor, colors: &Colors, theme: &Theme) -> Hsla {
    if let Some(rgb) = colors[color as usize] {
        return from_rgb(rgb);
    }

    match color {
        NamedColor::Foreground | NamedColor::BrightForeground => theme.terminal_foreground,
        NamedColor::Background => theme.terminal_background,
        NamedColor::Cursor => theme.cursor,
        NamedColor::DimForeground => dim(theme.terminal_foreground),
        // Dim variants sit directly after the named ANSI colors in the enum, so
        // they map back onto the same 16 slots with the brightness pulled down.
        NamedColor::DimBlack
        | NamedColor::DimRed
        | NamedColor::DimGreen
        | NamedColor::DimYellow
        | NamedColor::DimBlue
        | NamedColor::DimMagenta
        | NamedColor::DimCyan
        | NamedColor::DimWhite => {
            let offset = color as usize - NamedColor::DimBlack as usize;
            dim(theme.ansi[offset])
        }
        other => theme.ansi[(other as usize).min(15)],
    }
}

fn indexed(index: u8, colors: &Colors, theme: &Theme) -> Hsla {
    if let Some(rgb) = colors[index as usize] {
        return from_rgb(rgb);
    }

    match index {
        0..=15 => theme.ansi[index as usize],
        // 6x6x6 color cube.
        16..=231 => {
            let index = index as u16 - 16;
            let steps = [0u8, 95, 135, 175, 215, 255];
            from_rgb(Rgb {
                r: steps[(index / 36) as usize],
                g: steps[((index % 36) / 6) as usize],
                b: steps[(index % 6) as usize],
            })
        }
        // 24-step grayscale ramp.
        232..=255 => {
            let level = 8 + (index as u16 - 232) * 10;
            let level = level.min(255) as u8;
            from_rgb(Rgb {
                r: level,
                g: level,
                b: level,
            })
        }
    }
}

pub fn from_rgb(rgb: Rgb) -> Hsla {
    gpui::Rgba {
        r: rgb.r as f32 / 255.0,
        g: rgb.g as f32 / 255.0,
        b: rgb.b as f32 / 255.0,
        a: 1.0,
    }
    .into()
}

/// The SGR "faint" attribute, applied by pulling lightness toward the background.
pub fn dim(color: Hsla) -> Hsla {
    Hsla {
        l: color.l * 0.7,
        ..color
    }
}

/// The inverse of [`from_rgb`], for answering a program's color queries.
pub fn to_rgb(color: Hsla) -> Rgb {
    let rgba: gpui::Rgba = color.into();
    Rgb {
        r: (rgba.r * 255.0).round() as u8,
        g: (rgba.g * 255.0).round() as u8,
        b: (rgba.b * 255.0).round() as u8,
    }
}
