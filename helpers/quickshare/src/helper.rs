use std::path::Path;
use std::time::Duration;

use anyhow::{Context, anyhow, bail};
use rqs_lib::channel::{ChannelMessage, Message, TransferAction};
use rqs_lib::{EndpointInfo, OutboundPayload, RQS, SendInfo, Visibility};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::signal::unix::{SignalKind, signal};
use tokio::sync::broadcast::error::RecvError;
use tokio::sync::{broadcast, mpsc};

use crate::arguments::{Arguments, existing_directory};
use crate::endpoints::EndpointRegistry;
use crate::protocol::{Command, Event, VisibilityName, emit, emit_error};
use crate::transfers::{PROGRESS_INTERVAL, TransferRegistry};

/// The mDNS and BlueZ teardown inside `RQS::stop` can hang; give up after this.
const STOP_TIMEOUT: Duration = Duration::from_secs(8);

pub struct Helper {
    service: RQS,
    file_sender: mpsc::Sender<SendInfo>,
    nearby_sharing: broadcast::Receiver<()>,
    endpoint_sender: broadcast::Sender<EndpointInfo>,
    discovering: bool,
    endpoints: EndpointRegistry,
    transfers: TransferRegistry,
}

impl Helper {
    pub async fn start(arguments: Arguments) -> anyhow::Result<Self> {
        let mut service = RQS::new(
            arguments.visibility.to_library(),
            None,
            arguments.download_directory,
            arguments.device_name,
        );
        let (file_sender, nearby_sharing) = service.run().await?;
        let (endpoint_sender, _) = broadcast::channel(32);
        Ok(Helper {
            service,
            file_sender,
            nearby_sharing,
            endpoint_sender,
            discovering: false,
            endpoints: EndpointRegistry::default(),
            transfers: TransferRegistry::default(),
        })
    }

    /// Serves stdin commands and library events until stdin closes or the
    /// process is asked to terminate, then stops the service.
    pub async fn run(mut self) -> anyhow::Result<()> {
        let mut command_lines = BufReader::new(tokio::io::stdin()).lines();
        let mut transfer_messages = self.service.message_sender.subscribe();
        let mut endpoint_messages = self.endpoint_sender.subscribe();
        let mut nearby_sharing = self.nearby_sharing.resubscribe();
        let mut visibility_changes = self.visibility_receiver();
        let mut progress_ticker = tokio::time::interval(PROGRESS_INTERVAL);
        let mut terminate = signal(SignalKind::terminate())?;
        let mut interrupt = signal(SignalKind::interrupt())?;

        emit(&Event::Ready);
        emit_visibility(*visibility_changes.borrow_and_update());

        loop {
            tokio::select! {
                line = command_lines.next_line() => match line {
                    Ok(Some(line)) => self.handle_line(&line).await,
                    Ok(None) => break,
                    Err(error) => {
                        log::error!("reading stdin failed: {error}");
                        break;
                    }
                },
                message = transfer_messages.recv() => self.handle_transfer_message(message),
                endpoint = endpoint_messages.recv() => self.handle_endpoint(endpoint),
                nearby = nearby_sharing.recv() => handle_nearby_sharing(nearby),
                changed = visibility_changes.changed() => {
                    if changed.is_err() {
                        break;
                    }
                    emit_visibility(*visibility_changes.borrow_and_update());
                },
                _ = progress_ticker.tick() => self.emit_due_progress(),
                _ = terminate.recv() => break,
                _ = interrupt.recv() => break,
            }
        }

        self.shutdown().await;
        Ok(())
    }

    fn visibility_receiver(&self) -> tokio::sync::watch::Receiver<Visibility> {
        let visibility_sender = match self.service.visibility_sender.lock() {
            Ok(guard) => guard,
            Err(poisoned) => poisoned.into_inner(),
        };
        visibility_sender.subscribe()
    }

    async fn handle_line(&mut self, line: &str) {
        let line = line.trim();
        if line.is_empty() {
            return;
        }
        let command = match serde_json::from_str::<Command>(line) {
            Ok(command) => command,
            Err(error) => return emit_error(format!("invalid command {line:?}: {error}")),
        };
        if let Err(error) = self.handle_command(command).await {
            emit_error(format!("{error:#}"));
        }
    }

    async fn handle_command(&mut self, command: Command) -> anyhow::Result<()> {
        match command {
            Command::Visibility { value } => self.service.change_visibility(value.to_library()),
            Command::Discover { on: true } => self.start_discovery()?,
            Command::Discover { on: false } => self.stop_discovery(),
            Command::Send { endpoint, files } => self.send(&endpoint, files)?,
            Command::Accept { id } => self.act_on_transfer(id, TransferAction::ConsentAccept)?,
            Command::Reject { id } => self.act_on_transfer(id, TransferAction::ConsentDecline)?,
            Command::Cancel { id } => self.act_on_transfer(id, TransferAction::TransferCancel)?,
            Command::DownloadDir { path } => self.set_download_directory(&path)?,
            Command::DeviceName { name } => self.set_device_name(name).await?,
        }
        Ok(())
    }

    fn start_discovery(&mut self) -> anyhow::Result<()> {
        if self.discovering {
            return Ok(());
        }
        self.service.discovery(self.endpoint_sender.clone())?;
        self.discovering = true;
        Ok(())
    }

    /// Bluetooth discovery never reports a receiver as gone, so stopping
    /// discovery retracts every endpoint instead of leaving stale ones.
    fn stop_discovery(&mut self) {
        self.service.stop_discovery();
        self.discovering = false;
        for event in self.endpoints.clear() {
            emit(&Event::Endpoint(event));
        }
    }

    fn send(&mut self, endpoint_id: &str, files: Vec<String>) -> anyhow::Result<()> {
        validate_files(&files)?;
        let endpoint = self
            .endpoints
            .get(endpoint_id)
            .ok_or_else(|| anyhow!("unknown endpoint {endpoint_id:?}"))?;
        if self.transfers.contains(endpoint_id) {
            bail!("a transfer to {endpoint_id:?} is already running");
        }
        let send_info = send_info_for(endpoint, files.clone());
        let peer_name = send_info.name.clone();
        self.file_sender
            .try_send(send_info)
            .context("the send queue is not accepting transfers")?;
        self.transfers
            .expect_outgoing(endpoint_id, &peer_name, &files);
        Ok(())
    }

    fn act_on_transfer(&mut self, id: String, action: TransferAction) -> anyhow::Result<()> {
        if !self.transfers.contains(&id) {
            bail!("unknown transfer {id:?}");
        }
        let message = ChannelMessage {
            id,
            msg: Message::Lib { action },
        };
        self.service
            .message_sender
            .send(message)
            .map_err(|_| anyhow!("no transfer is listening for actions"))?;
        Ok(())
    }

    fn set_download_directory(&mut self, path: &str) -> anyhow::Result<()> {
        let directory = existing_directory(path).map_err(|message| anyhow!(message))?;
        self.service.set_download_path(Some(directory));
        Ok(())
    }

    /// The advertised name is baked into the mDNS and BLE adverts at service
    /// start, so renaming restarts the service.
    async fn set_device_name(&mut self, name: String) -> anyhow::Result<()> {
        let name = name.trim();
        if name.is_empty() {
            bail!("device name must not be empty");
        }
        if self.transfers.has_active() {
            bail!("cannot rename while a transfer is running");
        }
        self.service.set_device_name(name.to_string());
        self.restart_service().await
    }

    async fn restart_service(&mut self) -> anyhow::Result<()> {
        stop_service(&mut self.service).await;
        let (file_sender, _) = self
            .service
            .run()
            .await
            .context("restarting the Quick Share service failed")?;
        self.file_sender = file_sender;
        if self.discovering {
            self.service.discovery(self.endpoint_sender.clone())?;
        }
        Ok(())
    }

    fn handle_transfer_message(&mut self, message: Result<ChannelMessage, RecvError>) {
        let message = match message {
            Ok(message) => message,
            Err(error) => return log::warn!("transfer channel: {error}"),
        };
        if let Some(event) = self.transfers.apply(message) {
            emit(&Event::Transfer(event));
        }
    }

    fn handle_endpoint(&mut self, endpoint: Result<EndpointInfo, RecvError>) {
        let endpoint = match endpoint {
            Ok(endpoint) => endpoint,
            Err(error) => return log::warn!("discovery channel: {error}"),
        };
        if let Some(event) = self.endpoints.apply(endpoint) {
            emit(&Event::Endpoint(event));
        }
    }

    fn emit_due_progress(&mut self) {
        for event in self.transfers.take_due_progress() {
            emit(&Event::Transfer(event));
        }
    }

    async fn shutdown(&mut self) {
        log::info!("shutting down");
        self.service.stop_discovery();
        stop_service(&mut self.service).await;
    }
}

async fn stop_service(service: &mut RQS) {
    if tokio::time::timeout(STOP_TIMEOUT, service.stop())
        .await
        .is_err()
    {
        log::warn!("stopping the Quick Share service timed out");
    }
}

fn handle_nearby_sharing(nearby: Result<(), RecvError>) {
    match nearby {
        Ok(()) | Err(RecvError::Lagged(_)) => emit(&Event::NearbySharing),
        Err(RecvError::Closed) => {}
    }
}

fn emit_visibility(visibility: Visibility) {
    emit(&Event::Visibility {
        value: VisibilityName::from_library(visibility),
    });
}

fn validate_files(files: &[String]) -> anyhow::Result<()> {
    if files.is_empty() {
        bail!("send needs at least one file");
    }
    for file in files {
        let path = Path::new(file);
        if !path.is_absolute() || !path.is_file() {
            bail!("{file:?} is not an absolute path to a file");
        }
    }
    Ok(())
}

/// Mirrors the Tauri app: Bluetooth receivers are dialled by name (their LE
/// address rotates), Wi-Fi receivers by `ip:port`.
fn send_info_for(endpoint: &EndpointInfo, files: Vec<String>) -> SendInfo {
    let is_bluetooth = endpoint.ble_addr.is_some();
    let address = match (&endpoint.ip, &endpoint.port) {
        (Some(ip), Some(port)) => format!("{ip}:{port}"),
        _ => String::new(),
    };
    SendInfo {
        id: endpoint.id.clone(),
        name: endpoint
            .name
            .clone()
            .unwrap_or_else(|| "Unknown".to_string()),
        addr: address,
        ob: OutboundPayload::Files(files),
        ble: is_bluetooth,
    }
}
