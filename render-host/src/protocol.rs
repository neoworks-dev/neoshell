//! Control protocol between the Go core and this render host.
//!
//! Newline-delimited JSON over a unix socket. The Go mirror of these types lives
//! in `internal/renderhost`. Keep both sides in sync — see MIGRATION.md.

use serde::{Deserialize, Serialize};

/// A layer-shell layer. Mirrors `zwlr_layer_shell_v1::Layer`.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Layer {
    Background,
    Bottom,
    Top,
    Overlay,
}

/// A screen edge, used for anchors and exclusive-zone reservation.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Edge {
    Top,
    Bottom,
    Left,
    Right,
}

/// Keyboard interactivity for a surface. Mirrors the layer-shell modes.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Keyboard {
    None,
    OnDemand,
    Exclusive,
}

/// A rectangle in surface-local coordinates (input regions).
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct Rect {
    pub x: i32,
    pub y: i32,
    pub w: i32,
    pub h: i32,
}

/// Commands sent Go core -> render host. The `role` is the stable surface key
/// (e.g. "bar", "dock", "notch", "launcher").
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "cmd")]
pub enum Command {
    #[serde(rename = "surface.create")]
    Create {
        role: String,
        /// URL the Ultralight view loads, e.g. "http://localhost:9876/bar".
        url: String,
        /// Monitor connector name (e.g. "HDMI-A-1"); empty = default output.
        #[serde(default)]
        monitor: String,
        layer: Layer,
        /// Edges the surface anchors to.
        anchors: Vec<Edge>,
        keyboard: Keyboard,
        /// Exclusive zone: reserve `exclusive_size` px along `exclusive_edge`.
        /// Size 0 reserves nothing.
        #[serde(default)]
        exclusive_edge: Option<Edge>,
        #[serde(default)]
        exclusive_size: i32,
    },

    #[serde(rename = "surface.exclusive")]
    Exclusive {
        role: String,
        edge: Edge,
        size: i32,
    },

    #[serde(rename = "surface.region")]
    Region {
        role: String,
        /// Empty = whole surface accepts input.
        rects: Vec<Rect>,
    },

    #[serde(rename = "surface.show")]
    Show { role: String },

    #[serde(rename = "surface.hide")]
    Hide { role: String },

    #[serde(rename = "surface.destroy")]
    Destroy { role: String },
}

/// Events sent render host -> Go core. Wired up in stage 5.
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "event")]
pub enum Event {
    #[serde(rename = "ready")]
    Ready { role: String },

    #[serde(rename = "log")]
    Log { level: String, msg: String },
}
