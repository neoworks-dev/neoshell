use std::collections::{HashMap, HashSet};
use std::path::Path;
use std::time::{Duration, Instant};

use rqs_lib::TransferState;
use rqs_lib::channel::{ChannelMessage, Message, MessageClient, TransferKind};
use rqs_lib::hdl::info::{TransferMetadata, TransferPayload, TransferPayloadKind};

use crate::protocol::{Direction, TransferEvent};

/// Minimum spacing of progress-only events per transfer (~10/s).
pub const PROGRESS_INTERVAL: Duration = Duration::from_millis(100);

struct TrackedTransfer {
    state: TransferState,
    latest: TransferEvent,
    last_emitted_at: Option<Instant>,
    has_pending_progress: bool,
}

/// Folds the library's per-transfer channel messages into protocol events,
/// throttling updates that only advance the byte counters.
#[derive(Default)]
pub struct TransferRegistry {
    transfers: HashMap<String, TrackedTransfer>,
    /// The library sends a trailing `Disconnected` after some terminal states;
    /// those are dropped instead of resurrecting the transfer.
    ended: HashSet<String>,
}

impl TransferRegistry {
    /// Seeds an outgoing transfer so its first event already carries the peer
    /// and file names (a failed connect reports `Disconnected` without metadata).
    pub fn expect_outgoing(&mut self, id: &str, peer: &str, files: &[String]) {
        self.ended.remove(id);
        let mut latest = empty_event(id, Direction::Outgoing);
        latest.peer = peer.to_string();
        latest.files = files.iter().map(|file| file_name(file)).collect();
        let tracked = TrackedTransfer {
            state: TransferState::Initial,
            latest,
            last_emitted_at: None,
            has_pending_progress: false,
        };
        self.transfers.insert(id.to_string(), tracked);
    }

    pub fn contains(&self, id: &str) -> bool {
        self.transfers.contains_key(id)
    }

    pub fn has_active(&self) -> bool {
        !self.transfers.is_empty()
    }

    /// Applies a channel message and returns the event to emit right away;
    /// throttled progress is picked up later by [`Self::take_due_progress`].
    pub fn apply(&mut self, message: ChannelMessage) -> Option<TransferEvent> {
        let Message::Client(client) = message.msg else {
            return None;
        };
        if self.ended.contains(&message.id) {
            return None;
        }

        let tracked = self
            .transfers
            .entry(message.id.clone())
            .or_insert_with(|| new_tracked(&message.id, &client));
        let state_changed = update_tracked(tracked, client);
        if !state_changed && !is_due(tracked) {
            tracked.has_pending_progress = true;
            return None;
        }

        let event = mark_emitted(tracked);
        if is_terminal(&tracked.state) {
            self.transfers.remove(&message.id);
            self.ended.insert(message.id);
        }
        Some(event)
    }

    pub fn take_due_progress(&mut self) -> Vec<TransferEvent> {
        self.transfers
            .values_mut()
            .filter(|tracked| tracked.has_pending_progress && is_due(tracked))
            .map(mark_emitted)
            .collect()
    }
}

fn new_tracked(id: &str, client: &MessageClient) -> TrackedTransfer {
    let direction = match client.kind {
        TransferKind::Inbound => Direction::Incoming,
        TransferKind::Outbound => Direction::Outgoing,
    };
    TrackedTransfer {
        state: TransferState::Initial,
        latest: empty_event(id, direction),
        last_emitted_at: None,
        has_pending_progress: false,
    }
}

/// Returns whether the transfer state changed (or was never emitted).
fn update_tracked(tracked: &mut TrackedTransfer, client: MessageClient) -> bool {
    let mut state_changed = tracked.last_emitted_at.is_none();
    if let Some(state) = client.state {
        state_changed |= state != tracked.state;
        tracked.latest.state = lower_camel_case(&format!("{state:?}"));
        tracked.state = state;
    }
    if let Some(metadata) = client.metadata {
        apply_metadata(&mut tracked.latest, metadata);
    }
    state_changed
}

fn apply_metadata(event: &mut TransferEvent, metadata: TransferMetadata) {
    if let Some(source) = metadata.source {
        event.peer = source.name;
    }
    if let Some(pin) = metadata.pin_code {
        event.pin = pin;
    }
    event.text_kind = text_kind_name(&metadata.payload_kind).to_string();
    if let Some(preview) = metadata.payload_preview {
        event.text = preview;
    }
    if let Some(payload) = metadata.payload {
        apply_payload(event, payload);
    }
    if let Some(destination) = metadata.destination {
        event.destination = destination;
    }
    if let Some(saved_paths) = metadata.saved_paths {
        event.saved_paths = saved_paths;
    }
    event.bytes_total = metadata.total_bytes;
    event.bytes_done = metadata.ack_bytes;
}

fn apply_payload(event: &mut TransferEvent, payload: TransferPayload) {
    match payload {
        TransferPayload::Files(files) => {
            event.files = files.iter().map(|file| file_name(file)).collect();
        }
        TransferPayload::Text(text) | TransferPayload::Url(text) => event.text = text,
        TransferPayload::Wifi { ssid, .. } => event.text = ssid,
    }
}

fn text_kind_name(kind: &TransferPayloadKind) -> &'static str {
    match kind {
        TransferPayloadKind::Files => "",
        TransferPayloadKind::Text => "text",
        TransferPayloadKind::Url => "url",
        TransferPayloadKind::WiFi => "wifi",
    }
}

fn is_due(tracked: &TrackedTransfer) -> bool {
    match tracked.last_emitted_at {
        None => true,
        Some(emitted_at) => emitted_at.elapsed() >= PROGRESS_INTERVAL,
    }
}

fn mark_emitted(tracked: &mut TrackedTransfer) -> TransferEvent {
    tracked.last_emitted_at = Some(Instant::now());
    tracked.has_pending_progress = false;
    tracked.latest.clone()
}

fn is_terminal(state: &TransferState) -> bool {
    matches!(
        state,
        TransferState::Finished
            | TransferState::Cancelled
            | TransferState::Rejected
            | TransferState::Disconnected
    )
}

fn empty_event(id: &str, direction: Direction) -> TransferEvent {
    TransferEvent {
        id: id.to_string(),
        direction,
        state: lower_camel_case(&format!("{:?}", TransferState::Initial)),
        peer: String::new(),
        pin: String::new(),
        files: Vec::new(),
        text: String::new(),
        text_kind: String::new(),
        bytes_total: 0,
        bytes_done: 0,
        destination: String::new(),
        saved_paths: Vec::new(),
    }
}

/// Outgoing payloads carry absolute paths; the protocol reports names only.
fn file_name(path: &str) -> String {
    match Path::new(path).file_name() {
        Some(name) => name.to_string_lossy().into_owned(),
        None => path.to_string(),
    }
}

fn lower_camel_case(variant_name: &str) -> String {
    let mut characters = variant_name.chars();
    match characters.next() {
        Some(first) => first.to_lowercase().chain(characters).collect(),
        None => String::new(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn client_message(id: &str, state: TransferState, bytes_done: u64) -> ChannelMessage {
        let metadata = TransferMetadata {
            id: id.to_string(),
            source: None,
            pin_code: Some("1234".to_string()),
            payload_kind: TransferPayloadKind::Files,
            payload_preview: None,
            payload: Some(TransferPayload::Files(vec!["/tmp/photo.jpg".to_string()])),
            destination: Some("/home/user/Downloads".to_string()),
            saved_paths: None,
            total_bytes: 1000,
            ack_bytes: bytes_done,
        };
        ChannelMessage {
            id: id.to_string(),
            msg: Message::Client(MessageClient {
                kind: TransferKind::Inbound,
                state: Some(state),
                metadata: Some(metadata),
            }),
        }
    }

    #[test]
    fn state_changes_emit_and_progress_is_throttled() {
        let mut registry = TransferRegistry::default();
        let first = registry.apply(client_message("a", TransferState::ReceivingFiles, 0));
        let event = first.expect("first message is emitted");
        assert_eq!(event.state, "receivingFiles");
        assert_eq!(event.files, vec!["photo.jpg".to_string()]);
        assert_eq!(event.pin, "1234");

        let progress = registry.apply(client_message("a", TransferState::ReceivingFiles, 10));
        assert!(progress.is_none());
        assert!(registry.take_due_progress().is_empty());

        std::thread::sleep(PROGRESS_INTERVAL);
        let due = registry.take_due_progress();
        assert_eq!(due.len(), 1);
        assert_eq!(due[0].bytes_done, 10);
    }

    #[test]
    fn terminal_state_ends_transfer_and_drops_trailing_messages() {
        let mut registry = TransferRegistry::default();
        registry.apply(client_message("a", TransferState::ReceivingFiles, 0));
        let finished = registry.apply(client_message("a", TransferState::Finished, 1000));
        assert_eq!(
            finished.expect("terminal state is emitted").state,
            "finished"
        );
        assert!(!registry.contains("a"));
        assert!(
            registry
                .apply(client_message("a", TransferState::Disconnected, 0))
                .is_none()
        );
    }
}
