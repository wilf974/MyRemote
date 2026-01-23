#!/bin/bash
# MyRemote Agent Uninstallation Script for macOS and Linux
# Run with: sudo ./uninstall.sh

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

echo -e "${CYAN}MyRemote Agent Uninstallation${NC}"
echo -e "${CYAN}==============================${NC}"
echo ""

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

SERVICE_NAME="myremote-agent"

# Stop and remove service
echo -e "${GREEN}Stopping and removing service...${NC}"

if [ "$OS" == "macos" ]; then
    if [ -f "/Library/LaunchDaemons/com.myremote.agent.plist" ]; then
        launchctl unload /Library/LaunchDaemons/com.myremote.agent.plist 2>/dev/null || true
        rm -f /Library/LaunchDaemons/com.myremote.agent.plist
        echo -e "${GREEN}LaunchDaemon removed${NC}"
    else
        echo -e "${YELLOW}Service not found${NC}"
    fi

    # Remove log files
    rm -f /var/log/myremote-agent.log
    rm -f /var/log/myremote-agent.error.log

elif [ "$OS" == "linux" ]; then
    if systemctl is-active --quiet myremote-agent; then
        systemctl stop myremote-agent || true
    fi

    if systemctl is-enabled --quiet myremote-agent 2>/dev/null; then
        systemctl disable myremote-agent || true
    fi

    if [ -f "/etc/systemd/system/myremote-agent.service" ]; then
        rm -f /etc/systemd/system/myremote-agent.service
        systemctl daemon-reload
        echo -e "${GREEN}Systemd service removed${NC}"
    else
        echo -e "${YELLOW}Service not found${NC}"
    fi
fi

# Remove executable
echo -e "${GREEN}Removing executable...${NC}"
if [ -f "$INSTALL_DIR/$SERVICE_NAME" ]; then
    rm -f "$INSTALL_DIR/$SERVICE_NAME"
    echo -e "${GREEN}Executable removed${NC}"
else
    echo -e "${YELLOW}Executable not found${NC}"
fi

# Ask before removing configuration
echo ""
read -p "Do you want to remove configuration and certificates? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -d "$CONFIG_DIR" ]; then
        rm -rf "$CONFIG_DIR"
        echo -e "${GREEN}Configuration directory removed${NC}"
    fi
else
    echo -e "${YELLOW}Configuration preserved at: $CONFIG_DIR${NC}"
fi

echo ""
echo -e "${GREEN}Uninstallation completed successfully!${NC}"
echo ""
