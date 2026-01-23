use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use anyhow::Result;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfig {
    /// API server URL
    pub server_url: String,

    /// Enrollment token (only used during first run)
    pub enrollment_token: Option<String>,

    /// Agent ID (set after enrollment)
    pub agent_id: Option<String>,

    /// Heartbeat interval in seconds
    #[serde(default = "default_heartbeat_interval")]
    pub heartbeat_interval: u64,

    /// Path to store agent certificate
    #[serde(default = "default_cert_path")]
    pub cert_path: PathBuf,

    /// Log level
    #[serde(default = "default_log_level")]
    pub log_level: String,
}

fn default_heartbeat_interval() -> u64 {
    30 // 30 seconds
}

fn default_cert_path() -> PathBuf {
    if cfg!(windows) {
        PathBuf::from("C:\\ProgramData\\MyRemote\\agent_cert.pem")
    } else {
        PathBuf::from("/etc/myremote/agent_cert.pem")
    }
}

fn default_log_level() -> String {
    "info".to_string()
}

impl Default for AgentConfig {
    fn default() -> Self {
        Self {
            server_url: "http://localhost:3001".to_string(),
            enrollment_token: None,
            agent_id: None,
            heartbeat_interval: default_heartbeat_interval(),
            cert_path: default_cert_path(),
            log_level: default_log_level(),
        }
    }
}

impl AgentConfig {
    /// Load configuration from file
    pub fn load(path: &PathBuf) -> Result<Self> {
        let content = std::fs::read_to_string(path)?;
        let config: AgentConfig = toml::from_str(&content)?;
        Ok(config)
    }

    /// Save configuration to file
    pub fn save(&self, path: &PathBuf) -> Result<()> {
        let content = toml::to_string_pretty(self)?;

        // Create parent directory if it doesn't exist
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        std::fs::write(path, content)?;
        Ok(())
    }

    /// Get default config path
    pub fn default_path() -> PathBuf {
        if cfg!(windows) {
            PathBuf::from("C:\\ProgramData\\MyRemote\\config.toml")
        } else if cfg!(target_os = "macos") {
            PathBuf::from("/Library/Application Support/MyRemote/config.toml")
        } else {
            PathBuf::from("/etc/myremote/config.toml")
        }
    }

    /// Check if agent is enrolled
    pub fn is_enrolled(&self) -> bool {
        self.agent_id.is_some()
    }
}
