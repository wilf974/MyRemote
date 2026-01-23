use anyhow::{Result, Context};
use std::fs;
use std::path::PathBuf;
use std::process::Command;

const SERVICE_NAME: &str = "myremote-agent";
const SERVICE_FILE_PATH: &str = "/etc/systemd/system/myremote-agent.service";

/// Install the Linux systemd service
pub fn install_systemd_service() -> Result<()> {
    log::info!("Installing MyRemote Agent as systemd service...");

    // Get the current executable path
    let exe_path = std::env::current_exe()
        .context("Failed to get current executable path")?;

    // Create the service file content
    let service_content = format!(
        r#"[Unit]
Description=MyRemote Agent - Secure Remote Support Agent
After=network.target
Wants=network-online.target

[Service]
Type=simple
ExecStart={}
Restart=always
RestartSec=10
User=root
Group=root

# Working directory
WorkingDirectory=/etc/myremote

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=myremote-agent

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/etc/myremote /var/log

# Environment
Environment="RUST_LOG=info"

[Install]
WantedBy=multi-user.target
"#,
        exe_path.display()
    );

    // Write the service file
    fs::write(SERVICE_FILE_PATH, service_content)
        .context("Failed to write service file")?;

    log::info!("Service file created at: {}", SERVICE_FILE_PATH);

    // Set correct permissions
    Command::new("chmod")
        .args(&["644", SERVICE_FILE_PATH])
        .output()
        .context("Failed to set service file permissions")?;

    // Reload systemd daemon
    let output = Command::new("systemctl")
        .args(&["daemon-reload"])
        .output()
        .context("Failed to reload systemd daemon")?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        anyhow::bail!("Failed to reload systemd: {}", error);
    }

    // Enable the service
    let output = Command::new("systemctl")
        .args(&["enable", SERVICE_NAME])
        .output()
        .context("Failed to enable service")?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        anyhow::bail!("Failed to enable service: {}", error);
    }

    log::info!("systemd service installed successfully!");
    log::info!("Start the service with: systemctl start {}", SERVICE_NAME);
    log::info!("Check status with: systemctl status {}", SERVICE_NAME);
    log::info!("View logs with: journalctl -u {} -f", SERVICE_NAME);

    Ok(())
}

/// Uninstall the Linux systemd service
pub fn uninstall_systemd_service() -> Result<()> {
    log::info!("Uninstalling MyRemote Agent systemd service...");

    // Stop the service
    let _ = Command::new("systemctl")
        .args(&["stop", SERVICE_NAME])
        .output();

    // Disable the service
    let _ = Command::new("systemctl")
        .args(&["disable", SERVICE_NAME])
        .output();

    // Remove the service file
    if PathBuf::from(SERVICE_FILE_PATH).exists() {
        fs::remove_file(SERVICE_FILE_PATH)
            .context("Failed to remove service file")?;
    }

    // Reload systemd daemon
    let output = Command::new("systemctl")
        .args(&["daemon-reload"])
        .output()
        .context("Failed to reload systemd daemon")?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        log::warn!("Warning while reloading systemd: {}", error);
    }

    log::info!("systemd service uninstalled successfully!");

    Ok(())
}

/// Check if service is running
pub fn is_service_running() -> Result<bool> {
    let output = Command::new("systemctl")
        .args(&["is-active", SERVICE_NAME])
        .output()
        .context("Failed to check service status")?;

    Ok(output.status.success())
}

/// Start the service
pub fn start_service() -> Result<()> {
    let output = Command::new("systemctl")
        .args(&["start", SERVICE_NAME])
        .output()
        .context("Failed to start service")?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        anyhow::bail!("Failed to start service: {}", error);
    }

    log::info!("Service started successfully");
    Ok(())
}

/// Stop the service
pub fn stop_service() -> Result<()> {
    let output = Command::new("systemctl")
        .args(&["stop", SERVICE_NAME])
        .output()
        .context("Failed to stop service")?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        anyhow::bail!("Failed to stop service: {}", error);
    }

    log::info!("Service stopped successfully");
    Ok(())
}

/// Restart the service
pub fn restart_service() -> Result<()> {
    let output = Command::new("systemctl")
        .args(&["restart", SERVICE_NAME])
        .output()
        .context("Failed to restart service")?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        anyhow::bail!("Failed to restart service: {}", error);
    }

    log::info!("Service restarted successfully");
    Ok(())
}

/// Show service status
pub fn show_service_status() -> Result<String> {
    let output = Command::new("systemctl")
        .args(&["status", SERVICE_NAME])
        .output()
        .context("Failed to get service status")?;

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}
