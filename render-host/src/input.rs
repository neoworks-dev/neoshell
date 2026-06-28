//! Translate Wayland seat events into CEF input.
//!
//! Pointer (move/button/wheel) is mapped fully. Keyboard maps keysyms to Windows
//! virtual key codes for RawKeyDown/KeyUp and uses the compositor-provided utf8
//! for Char events (which drive text input, already case/layout-resolved so no
//! modifier bookkeeping is needed for text). IME and key repeat are follow-ups.

use cef::MouseButtonType;
use smithay_client_toolkit::seat::keyboard::Keysym;

/// Linux button codes (linux/input-event-codes.h).
const BTN_LEFT: u32 = 0x110;
const BTN_RIGHT: u32 = 0x111;
const BTN_MIDDLE: u32 = 0x112;

pub fn map_button(code: u32) -> Option<MouseButtonType> {
    match code {
        BTN_LEFT => Some(MouseButtonType::LEFT),
        BTN_RIGHT => Some(MouseButtonType::RIGHT),
        BTN_MIDDLE => Some(MouseButtonType::MIDDLE),
        _ => None,
    }
}

/// Map an xkb keysym to a Windows virtual key code (what CEF's KeyEvent wants),
/// or 0 if unmapped (text still arrives via the Char event built from utf8).
pub fn windows_key_code(keysym: Keysym) -> i32 {
    if let Some(code) = named_vk(keysym) {
        return code;
    }
    let raw = keysym.raw();
    // a-z / A-Z -> VK_A..VK_Z (0x41..0x5A)
    if (0x61..=0x7a).contains(&raw) {
        return (raw - 0x20) as i32;
    }
    if (0x41..=0x5a).contains(&raw) {
        return raw as i32;
    }
    // 0-9 -> VK_0..VK_9 (0x30..0x39)
    if (0x30..=0x39).contains(&raw) {
        return raw as i32;
    }
    0
}

fn named_vk(keysym: Keysym) -> Option<i32> {
    let code = match keysym {
        Keysym::Return | Keysym::KP_Enter => 0x0D,
        Keysym::BackSpace => 0x08,
        Keysym::Tab => 0x09,
        Keysym::Escape => 0x1B,
        Keysym::space => 0x20,
        Keysym::Left => 0x25,
        Keysym::Up => 0x26,
        Keysym::Right => 0x27,
        Keysym::Down => 0x28,
        Keysym::Delete => 0x2E,
        Keysym::Home => 0x24,
        Keysym::End => 0x23,
        Keysym::Page_Up => 0x21,
        Keysym::Page_Down => 0x22,
        Keysym::Shift_L | Keysym::Shift_R => 0x10,
        Keysym::Control_L | Keysym::Control_R => 0x11,
        Keysym::Alt_L | Keysym::Alt_R => 0x12,
        _ => return None,
    };
    Some(code)
}

/// True if utf8 text from a key event should produce a Char event (i.e. real
/// text, not a control character like Enter/Tab/Escape).
pub fn is_text(utf8: &str) -> bool {
    !utf8.is_empty() && !utf8.chars().all(|c| c.is_control())
}
