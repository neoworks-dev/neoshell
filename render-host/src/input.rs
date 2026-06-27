//! Translate Wayland seat events into Ultralight input.
//!
//! Pointer (motion/button/axis) is mapped fully. Keyboard maps a useful set of
//! keysyms to Ultralight virtual key codes for RawKeyDown/KeyUp (nav, editing,
//! letters, digits) and relies on the compositor-provided utf8 for Char events,
//! which is what actually drives text input. IME (`zwp_text_input_v3`) and key
//! repeat are follow-ups.

use smithay_client_toolkit::seat::keyboard::{Keysym, Modifiers};
use ul_next::event::{KeyEventModifiers, MouseButton};
use ul_next::key_code::VirtualKeyCode;

/// Linux button codes (linux/input-event-codes.h).
const BTN_LEFT: u32 = 0x110;
const BTN_RIGHT: u32 = 0x111;
const BTN_MIDDLE: u32 = 0x112;

pub fn map_button(code: u32) -> MouseButton {
    match code {
        BTN_LEFT => MouseButton::Left,
        BTN_RIGHT => MouseButton::Right,
        BTN_MIDDLE => MouseButton::Middle,
        _ => MouseButton::None,
    }
}

pub fn to_ul_modifiers(modifiers: Modifiers) -> KeyEventModifiers {
    KeyEventModifiers {
        alt: modifiers.alt,
        ctrl: modifiers.ctrl,
        meta: modifiers.logo,
        shift: modifiers.shift,
    }
}

/// Map an xkb keysym to an Ultralight virtual key code. Covers nav/editing keys,
/// letters and digits; everything else is `Unknown` (text still arrives via the
/// Char event built from utf8).
pub fn map_keysym(keysym: Keysym) -> VirtualKeyCode {
    if let Some(code) = named_key(keysym) {
        return code;
    }
    let raw = keysym.raw();
    if let Some(code) = letter_key(raw) {
        return code;
    }
    if let Some(code) = digit_key(raw) {
        return code;
    }
    VirtualKeyCode::Unknown
}

fn named_key(keysym: Keysym) -> Option<VirtualKeyCode> {
    let code = match keysym {
        Keysym::Return | Keysym::KP_Enter => VirtualKeyCode::Return,
        Keysym::BackSpace => VirtualKeyCode::Back,
        Keysym::Tab => VirtualKeyCode::Tab,
        Keysym::Escape => VirtualKeyCode::Escape,
        Keysym::space => VirtualKeyCode::Space,
        Keysym::Left => VirtualKeyCode::Left,
        Keysym::Up => VirtualKeyCode::Up,
        Keysym::Right => VirtualKeyCode::Right,
        Keysym::Down => VirtualKeyCode::Down,
        Keysym::Delete => VirtualKeyCode::Delete,
        Keysym::Home => VirtualKeyCode::Home,
        Keysym::End => VirtualKeyCode::End,
        Keysym::Page_Up => VirtualKeyCode::Prior,
        Keysym::Page_Down => VirtualKeyCode::Next,
        Keysym::Shift_L | Keysym::Shift_R => VirtualKeyCode::Shift,
        Keysym::Control_L | Keysym::Control_R => VirtualKeyCode::Control,
        Keysym::Alt_L | Keysym::Alt_R => VirtualKeyCode::Menu,
        _ => return None,
    };
    Some(code)
}

/// xkb keysyms for a-z (0x61-0x7a) and A-Z (0x41-0x5a) map to the same code.
/// (VirtualKeyCode derives nothing, so the variant is built per call.)
fn letter_key(raw: u32) -> Option<VirtualKeyCode> {
    let index = match raw {
        0x61..=0x7a => raw - 0x61,
        0x41..=0x5a => raw - 0x41,
        _ => return None,
    };
    let code = match index {
        0 => VirtualKeyCode::A,
        1 => VirtualKeyCode::B,
        2 => VirtualKeyCode::C,
        3 => VirtualKeyCode::D,
        4 => VirtualKeyCode::E,
        5 => VirtualKeyCode::F,
        6 => VirtualKeyCode::G,
        7 => VirtualKeyCode::H,
        8 => VirtualKeyCode::I,
        9 => VirtualKeyCode::J,
        10 => VirtualKeyCode::K,
        11 => VirtualKeyCode::L,
        12 => VirtualKeyCode::M,
        13 => VirtualKeyCode::N,
        14 => VirtualKeyCode::O,
        15 => VirtualKeyCode::P,
        16 => VirtualKeyCode::Q,
        17 => VirtualKeyCode::R,
        18 => VirtualKeyCode::S,
        19 => VirtualKeyCode::T,
        20 => VirtualKeyCode::U,
        21 => VirtualKeyCode::V,
        22 => VirtualKeyCode::W,
        23 => VirtualKeyCode::X,
        24 => VirtualKeyCode::Y,
        _ => VirtualKeyCode::Z,
    };
    Some(code)
}

fn digit_key(raw: u32) -> Option<VirtualKeyCode> {
    let code = match raw {
        0x30 => VirtualKeyCode::Key0,
        0x31 => VirtualKeyCode::Key1,
        0x32 => VirtualKeyCode::Key2,
        0x33 => VirtualKeyCode::Key3,
        0x34 => VirtualKeyCode::Key4,
        0x35 => VirtualKeyCode::Key5,
        0x36 => VirtualKeyCode::Key6,
        0x37 => VirtualKeyCode::Key7,
        0x38 => VirtualKeyCode::Key8,
        0x39 => VirtualKeyCode::Key9,
        _ => return None,
    };
    Some(code)
}

/// True if utf8 text from a key event should produce a Char event (i.e. it is
/// real text, not a control character like Enter/Tab/Escape).
pub fn is_text(utf8: &str) -> bool {
    !utf8.is_empty() && !utf8.chars().all(|c| c.is_control())
}
