use anyhow::{Result, Context};
use std::fs;
use std::path::PathBuf;
use std::process::Command;

const DAEMON_LABEL: &str = "com.myremote.agent";
const DAEMON_PLIST_PATH: &str = "/Library/LaunchDaemons/com.myremote.agent.plist";

/// Install the macOS daemon using launchd
pub fn install_daemon() -> Result<()> {
    log::info!("Installing MyRemote Agent as macOS daemon...");

    // Get the current executable path
    let exe_path = std::env::current_exe()
        .context("Failed to get current executable path")?;

    // Create the plist content
    let plist_content = format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>{}</string>

    <key>ProgramArguments</key>
    <array>
        <string>{}</string>
    </array>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <true/>

    <key>StandardOutPath</key>
    <string>/var/log/myremote-agent.log</string>

    <key>StandardErrorPath</key>
    <string>/var/log/myremote-agent.error.log</string>

    <key>WorkingDirectory</key>
    <string>/Library/Application Support/MyRemote</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>RUST_LOG</key>
        <string>info</string>
    </dict>
</dict>
</plist>
"#,
        DAEMON_LABEL,
        exe_path.display()
    );

    // Write the plist file
    fs::write(DAEMON_PLIST_PATH, plist_content)
        .context("Failed to write plist file")?;

    log::info!("Daemon plist created at: {}", DAEMON_PLIST_PATH);

    // Set correct permissions
    Command::new("chmod")
        .args(&["644", DAEMON_PLIST_PATH])
        .output()
        .context("Failed to set plist permissions")?;

    Command::new("chown")
        .args(&["root:wheel", DAEMON_PLIST_PATH])
        .output()
        .context("Failed to set plist ownership")?;

    // Load the daemon
    let output = Command::new("launchctl")
        .args(&["load", DAEMON_PLIST_PATH])
        .output()
        .context("Failed to load daemon")?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        anyhow::bail!("Failed to load daemon: {}", error);
    }

    log::info!("macOS daemon installed and started successfully!");
    log::info!("Check logs at: /var/log/myremote-agent.log");

    Ok(())
}

/// Uninstall the macOS daemon
pub fn uninstall_daemon() -> Result<()> {
    log::info!("Uninstalling MyRemote Agent macOS daemon...");

    // Unload the daemon
    let output = Command::new("launchctl")
        .args(&["unload", DAEMON_PLIST_PATH])
        .output()
        .context("Failed to unload daemon")?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        log::warn!("Warning while unloading daemon: {}", error);
    }

    // Remove the plist file
    if PathBuf::from(DAEMON_PLIST_PATH).exists() {
        fs::remove_file(DAEMON_PLIST_PATH)
            .context("Failed to remove plist file")?;
    }

    log::info!("macOS daemon uninstalled successfully!");

    Ok(())
}

/// Check if daemon is running
pub fn is_daemon_running() -> Result<bool> {
    let output = Command::new("launchctl")
        .args(&["list", DAEMON_LABEL])
        .output()
        .context("Failed to check daemon status")?;

    Ok(output.status.success())
}

/// Start the daemon
pub fn start_daemon() -> Result<()> {
    let output = Command::new("launchctl")
        .args(&["start", DAEMON_LABEL])
        .output()
        .context("Failed to start daemon")?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        anyhow::bail!("Failed to start daemon: {}", error);
    }

    log::info!("Daemon started successfully");
    Ok(())
}

/// Stop the daemon
pub fn stop_daemon() -> Result<()> {
    let output = Command::new("launchctl")
        .args(&["stop", DAEMON_LABEL])
        .output()
        .context("Failed to stop daemon")?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        anyhow::bail!("Failed to stop daemon: {}", error);
    }

    log::info!("Daemon stopped successfully");
    Ok(())
}
