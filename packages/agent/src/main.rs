mod config;
mod system;
mod enrollment;
mod heartbeat;
mod service;

use anyhow::{Result, Context};

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logger
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info"))
        .init();

    log::info!("MyRemote Agent v{}", env!("CARGO_PKG_VERSION"));

    // Get config path
    let config_path = config::AgentConfig::default_path();
    log::info!("Using config file: {:?}", config_path);

    // Load or create configuration
    let mut config = if config_path.exists() {
        log::info!("Loading configuration from file...");
        config::AgentConfig::load(&config_path)
            .context("Failed to load configuration")?
    } else {
        log::warn!("Configuration file not found, creating default...");
        let config = config::AgentConfig::default();
        config.save(&config_path)
            .context("Failed to save default configuration")?;
        config
    };

    // Check if agent is enrolled
    if !config.is_enrolled() {
        log::info!("Agent is not enrolled. Starting enrollment...");
        
        if config.enrollment_token.is_none() {
            log::error!("Enrollment token not found in configuration.");
            log::error!("Please set enrollment_token in {:?}", config_path);
            std::process::exit(1);
        }

        // Enroll the agent
        let enroller = enrollment::Enrollment::new(config.clone());
        let agent_id = enroller.enroll().await
            .context("Enrollment failed")?;

        // Update configuration
        config.agent_id = Some(agent_id.clone());
        config.save(&config_path)
            .context("Failed to save updated configuration")?;

        log::info!("Enrollment completed successfully!");
        log::info!("Agent ID: {}", agent_id);
    }

    let agent_id = config.agent_id.as_ref().unwrap().clone();
    log::info!("Agent ID: {}", agent_id);
    log::info!("Starting MyRemote Agent...");

    // Create heartbeat service
    let heartbeat = heartbeat::HeartbeatService::new(config.clone(), agent_id);

    // Start heartbeat loop
    heartbeat.start().await
        .context("Heartbeat service stopped unexpectedly")?;

    Ok(())
}
