use serde::{Deserialize, Serialize};
use sysinfo::{System, Disks};
use anyhow::Result;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum OperatingSystem {
    Windows,
    Macos,
    Linux,
}

impl OperatingSystem {
    pub fn current() -> Self {
        if cfg!(windows) {
            OperatingSystem::Windows
        } else if cfg!(target_os = "macos") {
            OperatingSystem::Macos
        } else {
            OperatingSystem::Linux
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfo {
    pub hostname: String,
    pub os: OperatingSystem,
    pub os_version: String,
    pub architecture: String,
    pub ip_address: String,
    pub mac_address: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemMetrics {
    pub cpu_usage: f32,
    pub memory_usage: f32,
    pub disk_usage: f32,
    pub uptime_seconds: u64,
}

impl SystemInfo {
    /// Collect system information
    pub fn collect() -> Result<Self> {
        let hostname = hostname::get()?
            .to_string_lossy()
            .to_string();

        let os = OperatingSystem::current();

        let os_version = System::long_os_version()
            .unwrap_or_else(|| "Unknown".to_string());

        let architecture = if cfg!(target_arch = "x86_64") {
            "x86_64"
        } else if cfg!(target_arch = "aarch64") {
            "aarch64"
        } else if cfg!(target_arch = "x86") {
            "x86"
        } else {
            "unknown"
        }.to_string();

        // Get IP address
        let ip_address = Self::get_local_ip()?;

        // Get MAC address
        let mac_address = Self::get_mac_address()?;

        Ok(Self {
            hostname,
            os,
            os_version,
            architecture,
            ip_address,
            mac_address,
        })
    }

    /// Get local IP address
    fn get_local_ip() -> Result<String> {
        // Try to get local IP by connecting to a remote server
        // This doesn't actually send data, just determines which interface would be used
        let socket = std::net::UdpSocket::bind("0.0.0.0:0")?;
        socket.connect("8.8.8.8:80")?;
        let local_addr = socket.local_addr()?;
        Ok(local_addr.ip().to_string())
    }

    /// Get MAC address
    fn get_mac_address() -> Result<String> {
        if let Ok(Some(mac)) = mac_address::get_mac_address() {
            Ok(format!(
                "{:02X}:{:02X}:{:02X}:{:02X}:{:02X}:{:02X}",
                mac.bytes()[0],
                mac.bytes()[1],
                mac.bytes()[2],
                mac.bytes()[3],
                mac.bytes()[4],
                mac.bytes()[5]
            ))
        } else {
            Ok("00:00:00:00:00:00".to_string())
        }
    }
}

impl SystemMetrics {
    /// Collect system metrics
    pub fn collect() -> Result<Self> {
        let mut sys = System::new_all();
        sys.refresh_all();

        // CPU usage
        let cpu_usage = sys.global_cpu_info().cpu_usage();

        // Memory usage
        let total_memory = sys.total_memory() as f64;
        let used_memory = sys.used_memory() as f64;
        let memory_usage = if total_memory > 0.0 {
            ((used_memory / total_memory) * 100.0) as f32
        } else {
            0.0
        };

        // Disk usage (first disk)
        let disks = Disks::new_with_refreshed_list();
        let disk_usage = disks
            .list()
            .first()
            .map(|disk| {
                let total = disk.total_space() as f64;
                let available = disk.available_space() as f64;
                if total > 0.0 {
                    (((total - available) / total) * 100.0) as f32
                } else {
                    0.0
                }
            })
            .unwrap_or(0.0);

        // Uptime
        let uptime_seconds = System::uptime();

        Ok(Self {
            cpu_usage,
            memory_usage,
            disk_usage,
            uptime_seconds,
        })
    }
}
