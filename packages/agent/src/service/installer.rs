use anyhow::Result;

/// Install the agent as a system service/daemon
pub fn install() -> Result<()> {
    log::info!("Installing MyRemote Agent...");

    // Check if running as admin/root
    if !is_elevated() {
        anyhow::bail!("Service installation requires administrator/root privileges");
    }

    #[cfg(windows)]
    {
        super::windows::install_service()?;
    }

    #[cfg(target_os = "macos")]
    {
        super::macos::install_daemon()?;
    }

    #[cfg(target_os = "linux")]
    {
        super::linux::install_systemd_service()?;
    }

    #[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
    {
        anyhow::bail!("Service installation not supported on this platform");
    }

    Ok(())
}

/// Uninstall the agent service/daemon
pub fn uninstall() -> Result<()> {
    log::info!("Uninstalling MyRemote Agent...");

    // Check if running as admin/root
    if !is_elevated() {
        anyhow::bail!("Service uninstallation requires administrator/root privileges");
    }

    #[cfg(windows)]
    {
        super::windows::uninstall_service()?;
    }

    #[cfg(target_os = "macos")]
    {
        super::macos::uninstall_daemon()?;
    }

    #[cfg(target_os = "linux")]
    {
        super::linux::uninstall_systemd_service()?;
    }

    #[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
    {
        anyhow::bail!("Service uninstallation not supported on this platform");
    }

    Ok(())
}

/// Check if running with elevated privileges
fn is_elevated() -> bool {
    #[cfg(windows)]
    {
        // On Windows, check if running as administrator
        use std::process::Command;
        Command::new("net")
            .args(&["session"])
            .output()
            .map(|output| output.status.success())
            .unwrap_or(false)
    }

    #[cfg(unix)]
    {
        // On Unix, check if running as root (UID 0)
        unsafe { libc::geteuid() == 0 }
    }

    #[cfg(not(any(windows, unix)))]
    {
        false
    }
}

/// Check if service is installed
pub fn is_installed() -> bool {
    #[cfg(windows)]
    {
        use std::process::Command;
        Command::new("sc.exe")
            .args(&["query", "MyRemoteAgent"])
            .output()
            .map(|output| output.status.success())
            .unwrap_or(false)
    }

    #[cfg(target_os = "macos")]
    {
        super::macos::is_daemon_running().unwrap_or(false)
    }

    #[cfg(target_os = "linux")]
    {
        use std::path::Path;
        Path::new("/etc/systemd/system/myremote-agent.service").exists()
    }

    #[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
    {
        false
    }
}
