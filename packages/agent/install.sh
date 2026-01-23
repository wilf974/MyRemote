#!/bin/bash
# MyRemote Agent Installation Script for macOS and Linux
# Run with: sudo ./install.sh [SERVER_URL] [ENROLLMENT_TOKEN]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: This script must be run as root (use sudo)${NC}"
    exit 1
fi

echo -e "${CYAN}MyRemote Agent Installation${NC}"
echo -e "${CYAN}=============================${NC}"
echo ""

# Get parameters
SERVER_URL="${1:-http://localhost:3001}"
ENROLLMENT_TOKEN="${2:-}"

# Detect OS
OS=""
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
    INSTALL_DIR="/usr/local/bin"
    CONFIG_DIR="/Library/Application Support/MyRemote"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
    INSTALL_DIR="/usr/local/bin"
    CONFIG_DIR="/etc/myremote"
else
    echo -e "${RED}Error: Unsupported operating system${NC}"
    exit 1
fi

echo -e "${GREEN}Detected OS: $OS${NC}"

# Configuration
CONFIG_FILE="$CONFIG_DIR/config.toml"
SERVICE_NAME="myremote-agent"

# Build path
BUILD_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXECUTABLE="$BUILD_DIR/target/release/myremote-agent"

# Check if executable exists
if [ ! -f "$EXECUTABLE" ]; then
    echo -e "${RED}Error: Executable not found at: $EXECUTABLE${NC}"
    echo -e "${YELLOW}Please build the agent first: cargo build --release${NC}"
    exit 1
fi

# Stop existing service
echo -e "${GREEN}Checking for existing service...${NC}"
if [ "$OS" == "macos" ]; then
    if launchctl list | grep -q "com.myremote.agent"; then
        echo -e "${YELLOW}Stopping existing service...${NC}"
        launchctl unload /Library/LaunchDaemons/com.myremote.agent.plist 2>/dev/null || true
        rm -f /Library/LaunchDaemons/com.myremote.agent.plist
    fi
elif [ "$OS" == "linux" ]; then
    if systemctl is-active --quiet myremote-agent; then
        echo -e "${YELLOW}Stopping existing service...${NC}"
        systemctl stop myremote-agent || true
        systemctl disable myremote-agent || true
        rm -f /etc/systemd/system/myremote-agent.service
        systemctl daemon-reload
    fi
fi

# Create directories
echo -e "${GREEN}Creating directories...${NC}"
mkdir -p "$CONFIG_DIR"
mkdir -p "$(dirname "$INSTALL_DIR")"

# Copy executable
echo -e "${GREEN}Installing executable...${NC}"
cp "$EXECUTABLE" "$INSTALL_DIR/$SERVICE_NAME"
chmod +x "$INSTALL_DIR/$SERVICE_NAME"

# Create configuration file
echo -e "${GREEN}Creating configuration...${NC}"

cat > "$CONFIG_FILE" <<EOF
server_url = "$SERVER_URL"
enrollment_token = "$ENROLLMENT_TOKEN"
heartbeat_interval = 30
log_level = "info"
cert_path = "$CONFIG_DIR/agent_cert.pem"
EOF

chmod 600 "$CONFIG_FILE"

# Install service
echo -e "${GREEN}Installing service...${NC}"

if [ "$OS" == "macos" ]; then
    # Create launchd plist
    cat > /Library/LaunchDaemons/com.myremote.agent.plist <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.myremote.agent</string>

    <key>ProgramArguments</key>
    <array>
        <string>$INSTALL_DIR/$SERVICE_NAME</string>
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
    <string>$CONFIG_DIR</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>RUST_LOG</key>
        <string>info</string>
    </dict>
</dict>
</plist>
EOF

    chmod 644 /Library/LaunchDaemons/com.myremote.agent.plist
    chown root:wheel /Library/LaunchDaemons/com.myremote.agent.plist

    # Load the daemon
    launchctl load /Library/LaunchDaemons/com.myremote.agent.plist

elif [ "$OS" == "linux" ]; then
    # Create systemd service
    cat > /etc/systemd/system/myremote-agent.service <<EOF
[Unit]
Description=MyRemote Agent - Secure Remote Support Agent
After=network.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=$INSTALL_DIR/$SERVICE_NAME
Restart=always
RestartSec=10
User=root
Group=root

# Working directory
WorkingDirectory=$CONFIG_DIR

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=myremote-agent

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$CONFIG_DIR /var/log

# Environment
Environment="RUST_LOG=info"

[Install]
WantedBy=multi-user.target
EOF

    chmod 644 /etc/systemd/system/myremote-agent.service

    # Reload systemd and enable service
    systemctl daemon-reload
    systemctl enable myremote-agent
    systemctl start myremote-agent
fi

echo ""
echo -e "${GREEN}Installation completed successfully!${NC}"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo -e "${NC}1. Edit configuration if needed: $CONFIG_FILE${NC}"
echo -e "${NC}2. Add enrollment token to config file if not provided${NC}"

if [ "$OS" == "macos" ]; then
    echo ""
    echo -e "${CYAN}Service management commands:${NC}"
    echo -e "${NC}  Status:  sudo launchctl list | grep myremote${NC}"
    echo -e "${NC}  Logs:    tail -f /var/log/myremote-agent.log${NC}"
    echo -e "${NC}  Stop:    sudo launchctl unload /Library/LaunchDaemons/com.myremote.agent.plist${NC}"
    echo -e "${NC}  Start:   sudo launchctl load /Library/LaunchDaemons/com.myremote.agent.plist${NC}"
elif [ "$OS" == "linux" ]; then
    echo ""
    echo -e "${CYAN}Service management commands:${NC}"
    echo -e "${NC}  Status:  systemctl status myremote-agent${NC}"
    echo -e "${NC}  Logs:    journalctl -u myremote-agent -f${NC}"
    echo -e "${NC}  Stop:    systemctl stop myremote-agent${NC}"
    echo -e "${NC}  Start:   systemctl start myremote-agent${NC}"
    echo -e "${NC}  Restart: systemctl restart myremote-agent${NC}"
fi
echo ""
