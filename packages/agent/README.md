# MyRemote Agent

Cross-platform agent for MyRemote secure remote support system. Written in Rust for Windows, macOS, and Linux.

## Features

- **Automatic Enrollment**: Self-enrollment with RSA 2048-bit key generation
- **Heartbeat Monitoring**: Regular status updates with system metrics
- **System Metrics**: CPU, memory, disk usage, and uptime monitoring
- **Service Installation**: Native service installation for all platforms
  - Windows: Windows Service
  - macOS: LaunchDaemon
  - Linux: systemd service
- **Secure Communication**: RSA key-based authentication
- **Auto-reconnect**: Resilient connection with retry logic

## Prerequisites

- Rust 1.70 or later
- Cargo
- Administrator/root privileges for service installation

## Building

```bash
# Debug build
cargo build

# Release build (optimized)
cargo build --release
```

The executable will be in `target/release/myremote-agent` (or `.exe` on Windows).

## Configuration

Configuration file location:
- **Windows**: `C:\ProgramData\MyRemote\config.toml`
- **macOS**: `/Library/Application Support/MyRemote/config.toml`
- **Linux**: `/etc/myremote/config.toml`

Example configuration:

```toml
server_url = "https://api.myremote.example.com"
enrollment_token = "your-enrollment-token-here"
heartbeat_interval = 30
log_level = "info"
cert_path = "/etc/myremote/agent_cert.pem"
```

### Configuration Options

- `server_url`: API server URL (required)
- `enrollment_token`: Token for initial enrollment (required for first run)
- `agent_id`: Agent ID (automatically set after enrollment)
- `heartbeat_interval`: Heartbeat interval in seconds (default: 30)
- `cert_path`: Path to store agent certificate (platform-specific default)
- `log_level`: Log level - trace, debug, info, warn, error (default: info)

## Installation

### Windows

```powershell
# Build the agent
cargo build --release

# Run installer as Administrator
powershell -ExecutionPolicy Bypass -File install.ps1 -ServerUrl "https://api.myremote.example.com" -EnrollmentToken "your-token"
```

### macOS

```bash
# Build the agent
cargo build --release

# Run installer with sudo
sudo ./install.sh "https://api.myremote.example.com" "your-token"
```

### Linux

```bash
# Build the agent
cargo build --release

# Run installer with sudo
sudo ./install.sh "https://api.myremote.example.com" "your-token"
```

## Service Management

### Windows

```powershell
# Start service
sc.exe start MyRemoteAgent

# Stop service
sc.exe stop MyRemoteAgent

# Query status
sc.exe query MyRemoteAgent

# View logs
Get-EventLog -LogName Application -Source MyRemoteAgent -Newest 50
```

### macOS

```bash
# Check status
sudo launchctl list | grep myremote

# View logs
tail -f /var/log/myremote-agent.log

# Stop service
sudo launchctl unload /Library/LaunchDaemons/com.myremote.agent.plist

# Start service
sudo launchctl load /Library/LaunchDaemons/com.myremote.agent.plist
```

### Linux

```bash
# Check status
systemctl status myremote-agent

# View logs
journalctl -u myremote-agent -f

# Stop service
systemctl stop myremote-agent

# Start service
systemctl start myremote-agent

# Restart service
systemctl restart myremote-agent

# Enable on boot
systemctl enable myremote-agent

# Disable on boot
systemctl disable myremote-agent
```

## Manual Enrollment

If you need to enroll manually (not using the service):

```bash
# 1. Create configuration file
mkdir -p /etc/myremote
cat > /etc/myremote/config.toml <<EOF
server_url = "https://api.myremote.example.com"
enrollment_token = "your-enrollment-token-here"
heartbeat_interval = 30
log_level = "info"
EOF

# 2. Run the agent (it will auto-enroll)
./myremote-agent
```

The agent will:
1. Generate RSA 2048-bit key pair
2. Send enrollment request to server with system information
3. Save agent ID and private key
4. Start sending heartbeats

## Uninstallation

### Windows

```powershell
# Stop and remove service
sc.exe stop MyRemoteAgent
sc.exe delete MyRemoteAgent

# Remove files
Remove-Item -Recurse -Force "C:\Program Files\MyRemote"
Remove-Item -Recurse -Force "C:\ProgramData\MyRemote"  # Optional: removes config
```

### macOS / Linux

```bash
# Run uninstaller with sudo
sudo ./uninstall.sh
```

## Development

### Running in Development Mode

```bash
# Set log level
export RUST_LOG=debug

# Run directly
cargo run

# Or with specific config
cargo run -- --config /path/to/config.toml
```

### Testing

```bash
# Run tests
cargo test

# Run with output
cargo test -- --nocapture
```

### Code Structure

```
src/
├── main.rs           # Entry point
├── config/           # Configuration management
│   └── mod.rs
├── system/           # System information collection
│   └── mod.rs
├── enrollment/       # Agent enrollment
│   └── mod.rs
├── heartbeat/        # Heartbeat service
│   └── mod.rs
└── service/          # Service installation
    ├── mod.rs
    ├── installer.rs
    ├── windows.rs
    ├── macos.rs
    └── linux.rs
```

## Troubleshooting

### Agent Won't Start

1. Check configuration file exists and is valid TOML
2. Verify enrollment token is set (for first run)
3. Check server URL is accessible
4. Review logs for specific errors

### Service Installation Fails

- **Windows**: Ensure running PowerShell as Administrator
- **macOS/Linux**: Ensure using sudo
- Check if existing service needs to be stopped first

### Enrollment Fails

1. Verify enrollment token is valid
2. Check server is accessible: `curl -I https://api.myremote.example.com/health`
3. Review agent logs for detailed error message
4. Ensure firewall allows outbound HTTPS traffic

### Heartbeat Not Working

1. Check agent is enrolled: verify `agent_id` in config
2. Verify server URL is correct
3. Check network connectivity
4. Review server logs for errors

## Security

- **RSA 2048-bit encryption** for agent authentication
- **Private keys stored with restricted permissions** (0600 on Unix)
- **HTTPS/TLS recommended** for production deployments
- **Principle of least privilege** for service accounts

## License

Copyright (c) 2024 MyRemote Team. All rights reserved.
