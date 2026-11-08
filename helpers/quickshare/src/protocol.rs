use std::io::Write;
use std::str::FromStr;

use rqs_lib::Visibility;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum VisibilityName {
    Visible,
    Invisible,
    Temporarily,
}

impl VisibilityName {
    pub fn to_library(self) -> Visibility {
        match self {
            VisibilityName::Visible => Visibility::Visible,
            VisibilityName::Invisible => Visibility::Invisible,
            VisibilityName::Temporarily => Visibility::Temporarily,
        }
    }

    pub fn from_library(visibility: Visibility) -> Self {
        match visibility {
            Visibility::Visible => VisibilityName::Visible,
            Visibility::Invisible => VisibilityName::Invisible,
            Visibility::Temporarily => VisibilityName::Temporarily,
        }
    }
}

impl FromStr for VisibilityName {
    type Err = String;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        match value {
            "visible" => Ok(VisibilityName::Visible),
            "invisible" => Ok(VisibilityName::Invisible),
            "temporarily" => Ok(VisibilityName::Temporarily),
            other => Err(format!(
                "unknown visibility {other:?}, expected visible, invisible or temporarily"
            )),
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(tag = "cmd", rename_all = "camelCase")]
pub enum Command {
    Visibility {
        value: VisibilityName,
    },
    Discover {
        on: bool,
    },
    Send {
        endpoint: String,
        files: Vec<String>,
    },
    Accept {
        id: String,
    },
    Reject {
        id: String,
    },
    Cancel {
        id: String,
    },
    DownloadDir {
        path: String,
    },
    DeviceName {
        name: String,
    },
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Direction {
    Incoming,
    Outgoing,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EndpointEvent {
    pub id: String,
    pub name: String,
    pub device_type: String,
    pub present: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TransferEvent {
    pub id: String,
    pub direction: Direction,
    pub state: String,
    pub peer: String,
    pub pin: String,
    pub files: Vec<String>,
    pub text: String,
    pub text_kind: String,
    pub bytes_total: u64,
    pub bytes_done: u64,
    pub destination: String,
    pub saved_paths: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(tag = "event", rename_all = "camelCase")]
pub enum Event {
    Ready,
    Visibility { value: VisibilityName },
    Endpoint(EndpointEvent),
    Transfer(TransferEvent),
    NearbySharing,
    Error { message: String },
}

/// Writes one protocol line to stdout. A closed stdout is ignored: the shell
/// going away also closes stdin, which ends the helper.
pub fn emit(event: &Event) {
    let line = match serde_json::to_string(event) {
        Ok(line) => line,
        Err(error) => {
            log::error!("could not serialize {event:?}: {error}");
            return;
        }
    };
    let mut stdout = std::io::stdout().lock();
    let _ = writeln!(stdout, "{line}");
    let _ = stdout.flush();
}

pub fn emit_error(message: impl Into<String>) {
    emit(&Event::Error {
        message: message.into(),
    });
}
