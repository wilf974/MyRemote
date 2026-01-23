use anyhow::{Result, Context};
use serde::Serialize;
use tokio::time::{interval, Duration};

use crate::config::AgentConfig;
use crate::system::SystemMetrics;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct HeartbeatRequest {
    agent_id: String,
    status: String,
    ip_address: String,
    cpu_usage: f32,
    memory_usage: f32,
    disk_usage: f32,
    uptime_seconds: u64,
}

pub struct HeartbeatService {
    config: AgentConfig,
    http_client: reqwest::Client,
    agent_id: String,
}

impl HeartbeatService {
    pub fn new(config: AgentConfig, agent_id: String) -> Self {
        let http_client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .build()
            .expect("Failed to create HTTP client");

        Self {
            config,
            http_client,
            agent_id,
        }
    }

    /// Start heartbeat loop
    pub async fn start(&self) -> Result<()> {
        log::info!("Starting heartbeat service with interval: {}s", self.config.heartbeat_interval);

        let mut ticker = interval(Duration::from_secs(self.config.heartbeat_interval));

        loop {
            ticker.tick().await;

            if let Err(e) = self.send_heartbeat().await {
                log::error!("Failed to send heartbeat: {}", e);
                // Continue loop even if heartbeat fails
            }
        }
    }

    /// Send a single heartbeat
    async fn send_heartbeat(&self) -> Result<()> {
        // Collect system metrics
        let metrics = SystemMetrics::collect()
            .context("Failed to collect system metrics")?;

        // Get current IP
        let ip_address = Self::get_local_ip()
            .unwrap_or_else(|_| "0.0.0.0".to_string());

        // Prepare heartbeat request
        let request = HeartbeatRequest {
            agent_id: self.agent_id.clone(),
            status: "ONLINE".to_string(),
            ip_address,
            cpu_usage: metrics.cpu_usage,
            memory_usage: metrics.memory_usage,
            disk_usage: metrics.disk_usage,
            uptime_seconds: metrics.uptime_seconds,
        };

        // Send heartbeat
        let url = format!("{}/agents/heartbeat", self.config.server_url);

        let response = self.http_client
            .post(&url)
            .json(&request)
            .send()
            .await
            .context("Failed to send heartbeat request")?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            anyhow::bail!("Heartbeat failed with status {}: {}", status, error_text);
        }

        log::debug!(
            "Heartbeat sent successfully (CPU: {:.1}%, Memory: {:.1}%, Disk: {:.1}%)",
            metrics.cpu_usage,
            metrics.memory_usage,
            metrics.disk_usage
        );

        Ok(())
    }

    /// Get local IP address
    fn get_local_ip() -> Result<String> {
        let socket = std::net::UdpSocket::bind("0.0.0.0:0")?;
        socket.connect("8.8.8.8:80")?;
        let local_addr = socket.local_addr()?;
        Ok(local_addr.ip().to_string())
    }
}
