//! Translate Wayland seat events into Ultralight input.
//!
//! STAGE 4 target: `wl_pointer` motion/button/axis and `wl_keyboard` key/modifier
//! events mapped to Ultralight's `fireMouseEvent` / `fireScrollEvent` /
//! `fireKeyEvent`. IME (`zwp_text_input_v3`) comes last — it is the painful part.
//!
//! Click-through: a surface only receives pointer events inside its input region
//! (set via `surface.region`). Most right-sized role surfaces need no region at
//! all; the bar+notch strip is the main case that does.

// TODO(stage 4): implement.
//
// Mapping notes:
//   wl_pointer.motion  -> MouseEvent { MouseMoved, x, y }
//   wl_pointer.button  -> MouseEvent { MouseDown/MouseUp, button }
//   wl_pointer.axis    -> ScrollEvent { ScrollByPixel, dx, dy }
//   wl_keyboard.key    -> KeyEvent { RawKeyDown/KeyUp, virtual_key, native_key }
//   wl_keyboard.key (text) -> KeyEvent { Char, text }  // from xkb compose
//
// Keyboard needs xkb (smithay-client-toolkit provides an xkb helper) to turn
// keycodes into both virtual key codes and composed UTF-8 text for Char events.
