use anyhow::{Result, Context};
use std::ffi::OsString;
use std::time::Duration;
use windows_service::{
    define_windows_service,
    service::{
        ServiceControl, ServiceControlAccept, ServiceExitCode, ServiceState, ServiceStatus,
        ServiceType,
    },
    service_control_handler::{self, ServiceControlHandlerResult},
    service_dispatcher,
};

const SERVICE_NAME: &str = "MyRemoteAgent";
const SERVICE_DISPLAY_NAME: &str = "MyRemote Agent";
const SERVICE_DESCRIPTION: &str = "MyRemote secure remote support agent";

define_windows_service!(ffi_service_main, service_main);

/// Install the Windows service
pub fn install_service() -> Result<()> {
    use std::process::Command;

    log::info!("Installing MyRemote Agent as Windows service...");

    // Get the current executable path
    let exe_path = std::env::current_exe()
        .context("Failed to get current executable path")?;

    // Create the service using sc.exe
    let output = Command::new("sc.exe")
        .args(&[
            "create",
            SERVICE_NAME,
            format!("binPath= \"{}\"", exe_path.display()).as_str(),
            format!("DisplayName= \"{}\"", SERVICE_DISPLAY_NAME).as_str(),
            "start= auto",
        ])
        .output()
        .context("Failed to create Windows service")?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        anyhow::bail!("Failed to create service: {}", error);
    }

    // Set service description
    let _ = Command::new("sc.exe")
        .args(&[
            "description",
            SERVICE_NAME,
            SERVICE_DESCRIPTION,
        ])
        .output();

    log::info!("Windows service installed successfully!");
    log::info!("Start the service with: sc.exe start {}", SERVICE_NAME);

    Ok(())
}

/// Uninstall the Windows service
pub fn uninstall_service() -> Result<()> {
    use std::process::Command;

    log::info!("Uninstalling MyRemote Agent Windows service...");

    // Stop the service if running
    let _ = Command::new("sc.exe")
        .args(&["stop", SERVICE_NAME])
        .output();

    // Wait a bit for service to stop
    std::thread::sleep(Duration::from_secs(2));

    // Delete the service
    let output = Command::new("sc.exe")
        .args(&["delete", SERVICE_NAME])
        .output()
        .context("Failed to delete Windows service")?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        anyhow::bail!("Failed to delete service: {}", error);
    }

    log::info!("Windows service uninstalled successfully!");

    Ok(())
}

/// Run the Windows service
pub fn run_service() -> Result<()> {
    service_dispatcher::start(SERVICE_NAME, ffi_service_main)
        .context("Failed to start service dispatcher")?;
    Ok(())
}

/// Service main function
fn service_main(_arguments: Vec<OsString>) {
    if let Err(e) = run_service_impl() {
        log::error!("Service error: {}", e);
    }
}

fn run_service_impl() -> Result<()> {
    // Create a channel to receive service control events
    let (shutdown_tx, shutdown_rx) = std::sync::mpsc::channel();

    // Define service control handler
    let event_handler = move |control_event| -> ServiceControlHandlerResult {
        match control_event {
            ServiceControl::Stop | ServiceControl::Shutdown => {
                log::info!("Received service stop signal");
                let _ = shutdown_tx.send(());
                ServiceControlHandlerResult::NoError
            }
            ServiceControl::Interrogate => ServiceControlHandlerResult::NoError,
            _ => ServiceControlHandlerResult::NotImplemented,
        }
    };

    // Register service control handler
    let status_handle = service_control_handler::register(SERVICE_NAME, event_handler)
        .context("Failed to register service control handler")?;

    // Tell Windows that service is running
    status_handle.set_service_status(ServiceStatus {
        service_type: ServiceType::OWN_PROCESS,
        current_state: ServiceState::Running,
        controls_accepted: ServiceControlAccept::STOP | ServiceControlAccept::SHUTDOWN,
        exit_code: ServiceExitCode::Win32(0),
        checkpoint: 0,
        wait_hint: Duration::default(),
        process_id: None,
    })?;

    log::info!("MyRemote Agent service started");

    // Run the agent in a separate tokio runtime
    let runtime = tokio::runtime::Runtime::new()
        .context("Failed to create tokio runtime")?;

    runtime.block_on(async {
        // Load configuration
        let config_path = crate::config::AgentConfig::default_path();
        let config = if config_path.exists() {
            crate::config::AgentConfig::load(&config_path)?
        } else {
            log::error!("Configuration file not found at {:?}", config_path);
            anyhow::bail!("Configuration file not found");
        };

        // Check enrollment
        if !config.is_enrolled() {
            log::error!("Agent is not enrolled. Please enroll the agent first.");
            anyhow::bail!("Agent not enrolled");
        }

        let agent_id = config.agent_id.as_ref().unwrap().clone();

        // Start heartbeat service
        let heartbeat = crate::heartbeat::HeartbeatService::new(config, agent_id);

        // Run heartbeat in a separate task
        let heartbeat_handle = tokio::spawn(async move {
            if let Err(e) = heartbeat.start().await {
                log::error!("Heartbeat service error: {}", e);
            }
        });

        // Wait for shutdown signal
        let _ = shutdown_rx.recv();

        log::info!("Shutting down agent...");
        heartbeat_handle.abort();

        Ok::<(), anyhow::Error>(())
    })?;

    // Tell Windows that service is stopped
    status_handle.set_service_status(ServiceStatus {
        service_type: ServiceType::OWN_PROCESS,
        current_state: ServiceState::Stopped,
        controls_accepted: ServiceControlAccept::empty(),
        exit_code: ServiceExitCode::Win32(0),
        checkpoint: 0,
        wait_hint: Duration::default(),
        process_id: None,
    })?;

    log::info!("MyRemote Agent service stopped");

    Ok(())
}
