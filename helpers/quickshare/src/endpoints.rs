use std::collections::HashMap;

use rqs_lib::{DeviceType, EndpointInfo};

use crate::protocol::EndpointEvent;

/// Receivers seen by discovery, keyed by the library's endpoint id
/// (`ip:port` for mDNS, `ble://<name>` for Bluetooth).
#[derive(Default)]
pub struct EndpointRegistry {
    endpoints: HashMap<String, EndpointInfo>,
}

impl EndpointRegistry {
    /// Records a discovery update and returns the event to emit, if the
    /// endpoint is new, changed its name or type, or disappeared.
    pub fn apply(&mut self, info: EndpointInfo) -> Option<EndpointEvent> {
        if info.present != Some(true) {
            let removed = self.endpoints.remove(&info.id)?;
            return Some(endpoint_event(&removed, false));
        }

        let is_new_or_renamed = match self.endpoints.get(&info.id) {
            None => true,
            Some(known) => known.name != info.name || known.rtype != info.rtype,
        };
        let event = endpoint_event(&info, true);
        self.endpoints.insert(info.id.clone(), info);
        if !is_new_or_renamed {
            return None;
        }
        Some(event)
    }

    pub fn get(&self, id: &str) -> Option<&EndpointInfo> {
        self.endpoints.get(id)
    }

    /// Forgets every endpoint and returns a `present: false` event for each.
    pub fn clear(&mut self) -> Vec<EndpointEvent> {
        self.endpoints
            .drain()
            .map(|(_, info)| endpoint_event(&info, false))
            .collect()
    }
}

fn endpoint_event(info: &EndpointInfo, present: bool) -> EndpointEvent {
    EndpointEvent {
        id: info.id.clone(),
        name: info.name.clone().unwrap_or_default(),
        device_type: device_type_name(info.rtype.as_ref()).to_string(),
        present,
    }
}

fn device_type_name(device_type: Option<&DeviceType>) -> &'static str {
    match device_type {
        Some(DeviceType::Phone) => "phone",
        Some(DeviceType::Tablet) => "tablet",
        Some(DeviceType::Laptop) => "laptop",
        Some(DeviceType::Unknown) | None => "unknown",
    }
}
