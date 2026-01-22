#!/bin/bash
# MyRemote - Script de Nettoyage (en cas d'installation échouée)
# Ce script nettoie une installation partielle pour permettre de relancer proprement

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}================================${NC}"
echo -e "${YELLOW}MyRemote - Cleanup Script${NC}"
echo -e "${YELLOW}================================${NC}"
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root (use sudo)${NC}"
   exit 1
fi

# Configuration
INSTALL_DIR="/opt/apps/MyRemote"

echo -e "${RED}⚠️  WARNING: This will remove the MyRemote installation${NC}"
echo -e "${YELLOW}Press Ctrl+C to cancel or Enter to continue...${NC}"
read

# Step 1: Stop Docker containers if running
echo -e "${YELLOW}[1/4] Stopping Docker containers...${NC}"
if [ -d "$INSTALL_DIR" ] && [ -f "$INSTALL_DIR/docker-compose.prod.yml" ]; then
    cd $INSTALL_DIR
    docker compose -f docker-compose.prod.yml down -v || echo "No containers to stop"
else
    echo "No docker-compose.prod.yml found, skipping..."
fi

# Step 2: Remove nginx configuration
echo -e "${YELLOW}[2/4] Removing nginx configuration...${NC}"
if [ -f "/etc/nginx/sites-enabled/myremote.conf" ]; then
    rm -f /etc/nginx/sites-enabled/myremote.conf
    echo "Removed nginx symlink"
fi

if [ -f "/etc/nginx/sites-available/myremote.conf" ]; then
    # Backup before removing
    cp /etc/nginx/sites-available/myremote.conf /etc/nginx/sites-available/myremote.conf.backup-$(date +%Y%m%d_%H%M%S)
    rm -f /etc/nginx/sites-available/myremote.conf
    echo "Removed nginx config (backup created)"
fi

# Test and reload nginx
nginx -t && systemctl reload nginx
echo -e "${GREEN}Nginx configuration cleaned${NC}"

# Step 3: Remove installation directory
echo -e "${YELLOW}[3/4] Removing installation directory...${NC}"
if [ -d "$INSTALL_DIR" ]; then
    # Backup .env.prod if exists
    if [ -f "$INSTALL_DIR/.env.prod" ]; then
        mkdir -p /root/myremote-backup
        cp $INSTALL_DIR/.env.prod /root/myremote-backup/.env.prod.backup-$(date +%Y%m%d_%H%M%S)
        echo "Backed up .env.prod to /root/myremote-backup/"
    fi

    rm -rf $INSTALL_DIR
    echo -e "${GREEN}Removed $INSTALL_DIR${NC}"
else
    echo "Directory $INSTALL_DIR does not exist, skipping..."
fi

# Step 4: Remove Docker volumes (optional)
echo ""
echo -e "${YELLOW}Do you want to remove Docker volumes? (data will be lost)${NC}"
echo -e "${YELLOW}Type 'yes' to remove volumes, or press Enter to keep them:${NC}"
read remove_volumes

if [ "$remove_volumes" = "yes" ]; then
    echo -e "${YELLOW}[4/4] Removing Docker volumes...${NC}"
    docker volume rm myremote_postgres_data 2>/dev/null || echo "Volume myremote_postgres_data not found"
    docker volume rm myremote_redis_data 2>/dev/null || echo "Volume myremote_redis_data not found"
    docker volume rm myremote_keycloak_data 2>/dev/null || echo "Volume myremote_keycloak_data not found"
    docker volume rm myremote_prometheus_data 2>/dev/null || echo "Volume myremote_prometheus_data not found"
    docker volume rm myremote_grafana_data 2>/dev/null || echo "Volume myremote_grafana_data not found"
    docker volume rm myremote_loki_data 2>/dev/null || echo "Volume myremote_loki_data not found"
    echo -e "${GREEN}Docker volumes removed${NC}"
else
    echo -e "${YELLOW}[4/4] Keeping Docker volumes...${NC}"
    echo "Volumes kept (will be reused on next install)"
fi

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✅ Cleanup Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Download the updated script:"
echo "     curl -o deploy-vps.sh https://raw.githubusercontent.com/wilf974/MyRemote/claude/remote-support-app-design-arFMJ/scripts/deploy-vps.sh"
echo ""
echo "  2. Make it executable:"
echo "     chmod +x deploy-vps.sh"
echo ""
echo "  3. Run it:"
echo "     sudo ./deploy-vps.sh"
echo ""
echo -e "${YELLOW}Note: If you kept Docker volumes, your previous data will be restored${NC}"
echo ""
