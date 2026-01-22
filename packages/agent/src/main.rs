// MyRemote Agent - Entry Point
// Multi-OS remote support agent (Windows, macOS, Linux)

use std::error::Error;
use tokio;
use tracing::{info, error};
use tracing_subscriber;

mod config;
mod enrollment;
mod heartbeat;
mod inventory;
mod session;
mod websocket;
mod storage;

use config::Config;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .with_target(false)
        .with_thread_ids(true)
        .init();

    info!("MyRemote Agent starting...");

    // Load configuration
    let config = Config::load()?;
    info!("Configuration loaded: server={}", config.server.url);

    // Initialize local storage (SQLite)
    let storage = storage::Storage::init(&config.local.database_path).await?;
    info!("Local storage initialized");

    // Check if device is enrolled
    let device_id = storage.get_device_id().await?;

    let device_id = match device_id {
        Some(id) => {
            info!("Device already enrolled: {}", id);
            id
        }
        None => {
            info!("Device not enrolled, starting enrollment...");

            // Enrollment
            let enrollment_token = config.enrollment.token
                .ok_or("Enrollment token not configured")?;

            let device_id = enrollment::enroll(
                &config.server.url,
                &enrollment_token,
                &storage,
            ).await?;

            info!("Device enrolled successfully: {}", device_id);
            device_id
        }
    };

    // Get device secret (JWT long-lived)
    let device_secret = storage.get_device_secret().await?
        .ok_or("Device secret not found in storage")?;

    // Collect system inventory
    let inventory = inventory::collect().await?;
    info!("System inventory collected: CPU={}, RAM={} GB",
          inventory.cpu.model, inventory.ram.total_gb);

    // Connect WebSocket
    info!("Connecting to WebSocket...");
    let ws_client = websocket::WsClient::connect(
        &config.server.url,
        &device_id,
        &device_secret,
    ).await?;
    info!("WebSocket connected");

    // Start heartbeat loop
    let heartbeat_interval = config.server.heartbeat_interval_seconds;
    tokio::spawn(async move {
        heartbeat::start_loop(&ws_client, heartbeat_interval).await;
    });

    // Main event loop (handle incoming messages from server)
    loop {
        match ws_client.recv().await {
            Ok(msg) => {
                match msg {
                    websocket::WsMessage::SessionRequest(req) => {
                        info!("Session request received: type={}, mode={}",
                              req.session_type, req.access_mode);
                        session::handle_request(req).await;
                    }
                    websocket::WsMessage::PolicyUpdate(policy) => {
                        info!("Policy update received");
                        // TODO: Apply policy (auto-update, etc.)
                    }
                    websocket::WsMessage::Ping => {
                        ws_client.send(websocket::WsMessage::Pong).await?;
                    }
                    _ => {}
                }
            }
            Err(e) => {
                error!("WebSocket error: {}", e);
                // Reconnect logic
                tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
                // TODO: Implement reconnection
            }
        }
    }
}
