//! Turns gpui keystrokes into the byte sequences a terminal program expects.
//!
//! Only keys that are not bound to an application action reach here; anything
//! carrying the platform modifier (cmd on macOS) is deliberately left alone so it
//! can stay available for window and pane commands.

use alacritty_terminal::term::TermMode;
use gpui::{Keystroke, Modifiers};

pub fn to_bytes(keystroke: &Keystroke, mode: TermMode) -> Option<Vec<u8>> {
    let modifiers = keystroke.modifiers;
    if modifiers.platform || modifiers.function {
        return None;
    }

    let app_cursor = mode.contains(TermMode::APP_CURSOR);
    let key = keystroke.key.as_str();

    let bytes = match key {
        "enter" => alt_prefixed(b"\r".to_vec(), modifiers),
        "escape" => alt_prefixed(b"\x1b".to_vec(), modifiers),
        "tab" if modifiers.shift => b"\x1b[Z".to_vec(),
        "tab" => alt_prefixed(b"\t".to_vec(), modifiers),
        "backspace" if modifiers.control => b"\x08".to_vec(),
        "backspace" => alt_prefixed(b"\x7f".to_vec(), modifiers),
        "space" if modifiers.control => vec![0x00],

        "up" => cursor_key(b'A', app_cursor, modifiers),
        "down" => cursor_key(b'B', app_cursor, modifiers),
        "right" => cursor_key(b'C', app_cursor, modifiers),
        "left" => cursor_key(b'D', app_cursor, modifiers),
        "home" => cursor_key(b'H', app_cursor, modifiers),
        "end" => cursor_key(b'F', app_cursor, modifiers),

        "insert" => tilde_key(2, modifiers),
        "delete" => tilde_key(3, modifiers),
        "pageup" => tilde_key(5, modifiers),
        "pagedown" => tilde_key(6, modifiers),

        "f1" => function_key(b'P', 11, modifiers),
        "f2" => function_key(b'Q', 12, modifiers),
        "f3" => function_key(b'R', 13, modifiers),
        "f4" => function_key(b'S', 14, modifiers),
        "f5" => tilde_key(15, modifiers),
        "f6" => tilde_key(17, modifiers),
        "f7" => tilde_key(18, modifiers),
        "f8" => tilde_key(19, modifiers),
        "f9" => tilde_key(20, modifiers),
        "f10" => tilde_key(21, modifiers),
        "f11" => tilde_key(23, modifiers),
        "f12" => tilde_key(24, modifiers),

        _ if modifiers.control => control_sequence(key, modifiers)?,
        _ => {
            let typed = keystroke
                .key_char
                .clone()
                .filter(|text| !text.is_empty())
                .or_else(|| (key.chars().count() == 1).then(|| key.to_string()))?;
            alt_prefixed(typed.into_bytes(), modifiers)
        }
    };

    Some(bytes)
}

/// Arrow and home/end keys, in either normal or application cursor mode.
fn cursor_key(final_byte: u8, app_cursor: bool, modifiers: Modifiers) -> Vec<u8> {
    let code = modifier_code(modifiers);
    if code > 1 {
        return format!("\x1b[1;{}{}", code, final_byte as char).into_bytes();
    }
    if app_cursor {
        vec![0x1b, b'O', final_byte]
    } else {
        vec![0x1b, b'[', final_byte]
    }
}

/// Keys encoded as `CSI <number> ~`, such as page up and delete.
fn tilde_key(number: u8, modifiers: Modifiers) -> Vec<u8> {
    let code = modifier_code(modifiers);
    if code > 1 {
        format!("\x1b[{};{}~", number, code).into_bytes()
    } else {
        format!("\x1b[{}~", number).into_bytes()
    }
}

/// F1-F4, which use SS3 unless a modifier is held.
fn function_key(ss3: u8, csi_number: u8, modifiers: Modifiers) -> Vec<u8> {
    let code = modifier_code(modifiers);
    if code > 1 {
        format!("\x1b[{};{}~", csi_number, code).into_bytes()
    } else {
        vec![0x1b, b'O', ss3]
    }
}

/// Control combinations that map to the C0 range.
fn control_sequence(key: &str, modifiers: Modifiers) -> Option<Vec<u8>> {
    let mut chars = key.chars();
    let c = chars.next()?;
    if chars.next().is_some() {
        return None;
    }

    let byte = match c {
        'a'..='z' => (c as u8) - b'a' + 1,
        'A'..='Z' => (c as u8) - b'A' + 1,
        '@' => 0x00,
        '[' => 0x1b,
        '\\' => 0x1c,
        ']' => 0x1d,
        '^' => 0x1e,
        '_' | '/' | '?' => 0x1f,
        _ => return None,
    };

    Some(alt_prefixed(vec![byte], modifiers))
}

/// Alt is sent as an ESC prefix, which is what shells and readline expect.
fn alt_prefixed(mut bytes: Vec<u8>, modifiers: Modifiers) -> Vec<u8> {
    if modifiers.alt {
        let mut prefixed = vec![0x1b];
        prefixed.append(&mut bytes);
        prefixed
    } else {
        bytes
    }
}

/// The xterm modifier parameter: 1 + shift + 2*alt + 4*ctrl.
fn modifier_code(modifiers: Modifiers) -> u8 {
    1 + u8::from(modifiers.shift) + 2 * u8::from(modifiers.alt) + 4 * u8::from(modifiers.control)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn keystroke(source: &str) -> Keystroke {
        Keystroke::parse(source).expect("valid keystroke")
    }

    fn encode(source: &str, mode: TermMode) -> Option<Vec<u8>> {
        to_bytes(&keystroke(source), mode)
    }

    #[test]
    fn plain_characters_are_sent_as_typed() {
        assert_eq!(encode("a", TermMode::empty()), Some(b"a".to_vec()));
    }

    #[test]
    fn control_letters_map_to_the_c0_range() {
        assert_eq!(encode("ctrl-c", TermMode::empty()), Some(vec![0x03]));
        assert_eq!(encode("ctrl-d", TermMode::empty()), Some(vec![0x04]));
    }

    #[test]
    fn alt_is_an_escape_prefix() {
        assert_eq!(encode("alt-b", TermMode::empty()), Some(b"\x1bb".to_vec()));
    }

    #[test]
    fn arrows_follow_the_cursor_key_mode() {
        assert_eq!(encode("up", TermMode::empty()), Some(b"\x1b[A".to_vec()));
        assert_eq!(encode("up", TermMode::APP_CURSOR), Some(b"\x1bOA".to_vec()));
        assert_eq!(
            encode("shift-up", TermMode::APP_CURSOR),
            Some(b"\x1b[1;2A".to_vec())
        );
    }

    #[test]
    fn enter_sends_carriage_return_not_newline() {
        assert_eq!(encode("enter", TermMode::empty()), Some(b"\r".to_vec()));
    }

    #[test]
    fn platform_shortcuts_are_left_for_actions() {
        assert_eq!(encode("cmd-t", TermMode::empty()), None);
    }
}
