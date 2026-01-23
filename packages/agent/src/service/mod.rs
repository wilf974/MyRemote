pub mod installer;

#[cfg(windows)]
pub mod windows;

#[cfg(target_os = "macos")]
pub mod macos;

#[cfg(target_os = "linux")]
pub mod linux;

use anyhow::Result;

/// Install the agent as a system service
pub fn install() -> Result<()> {
    #[cfg(windows)]
    {
        windows::install_service()
    }

    #[cfg(target_os = "macos")]
    {
        macos::install_daemon()
    }

    #[cfg(target_os = "linux")]
    {
        linux::install_systemd_service()
    }

    #[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
    {
        anyhow::bail!("Service installation not supported on this platform")
    }
}

/// Uninstall the agent service
pub fn uninstall() -> Result<()> {
    #[cfg(windows)]
    {
        windows::uninstall_service()
    }

    #[cfg(target_os = "macos")]
    {
        macos::uninstall_daemon()
    }

    #[cfg(target_os = "linux")]
    {
        linux::uninstall_systemd_service()
    }

    #[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
    {
        anyhow::bail!("Service uninstallation not supported on this platform")
    }
}
