#!/bin/bash
# MyRemote - Complete Installation After DNS Configuration
# Run this after you've configured your DNS records

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}MyRemote - Complete Installation${NC}"
echo -e "${GREEN}================================${NC}"
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root (use sudo)${NC}"
   exit 1
fi

# Configuration
DOMAIN="myremote.woutils.com"
INSTALL_DIR="/opt/apps/MyRemote"
NGINX_CONFIG="/etc/nginx/sites-available/myremote.conf"
CERTBOT_EMAIL="admin@woutils.com"

# Verify DNS before continuing
echo -e "${YELLOW}Verifying DNS configuration...${NC}"
echo ""

check_dns() {
    local domain=$1
    local ip=$(dig +short A $domain | tail -n1)
    local server_ip=$(curl -4 -s ifconfig.me)

    echo -n "  Checking $domain... "

    if [ -z "$ip" ]; then
        echo -e "${RED}NOT CONFIGURED${NC}"
        return 1
    elif [ "$ip" != "$server_ip" ]; then
        echo -e "${RED}WRONG IP (points to $ip, should be $server_ip)${NC}"
        return 1
    else
        echo -e "${GREEN}OK ($ip)${NC}"
        return 0
    fi
}

dns_ok=true
check_dns "$DOMAIN" || dns_ok=false
check_dns "api.$DOMAIN" || dns_ok=false
check_dns "auth.$DOMAIN" || dns_ok=false
check_dns "monitoring.$DOMAIN" || dns_ok=false

echo ""

if [ "$dns_ok" = false ]; then
    echo -e "${RED}❌ DNS configuration is incomplete or incorrect${NC}"
    echo ""
    echo -e "${YELLOW}Please configure these DNS records:${NC}"
    echo ""
    echo "Type  Name        Content          TTL"
    echo "A     myremote    $(curl -4 -s ifconfig.me)      300"
    echo "A     api         $(curl -4 -s ifconfig.me)      300"
    echo "A     auth        $(curl -4 -s ifconfig.me)      300"
    echo "A     monitoring  $(curl -4 -s ifconfig.me)      300"
    echo ""
    echo "Wait 5-10 minutes for DNS propagation, then run this script again."
    exit 1
fi

echo -e "${GREEN}✅ DNS configuration verified!${NC}"
echo ""

# Continue installation
cd $INSTALL_DIR

# Step 1: Obtain SSL certificates
echo -e "${YELLOW}[1/3] Obtaining SSL certificates...${NC}"
systemctl stop nginx

certbot certonly --standalone \
    --agree-tos \
    --no-eff-email \
    --email $CERTBOT_EMAIL \
    -d $DOMAIN \
    -d api.$DOMAIN \
    -d auth.$DOMAIN \
    -d monitoring.$DOMAIN \
    --non-interactive

if [ $? -ne 0 ]; then
    echo -e "${RED}Certificate generation failed${NC}"
    systemctl start nginx
    exit 1
fi

echo -e "${GREEN}SSL certificates obtained${NC}"

# Step 2: Configure nginx
echo -e "${YELLOW}[2/3] Configuring nginx...${NC}"

# Backup existing config if exists
if [ -f "$NGINX_CONFIG" ]; then
    cp $NGINX_CONFIG ${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)
fi

# Copy nginx configuration
cp infra/nginx/myremote.conf $NGINX_CONFIG

# Enable site
ln -sf $NGINX_CONFIG /etc/nginx/sites-enabled/myremote.conf

# Test nginx configuration
nginx -t || {
    echo -e "${RED}Nginx configuration test failed!${NC}"
    exit 1
}

# Start nginx
systemctl start nginx
systemctl reload nginx
systemctl enable nginx

echo -e "${GREEN}Nginx configured${NC}"

# Step 3: Start Docker containers
echo -e "${YELLOW}[3/3] Starting Docker containers...${NC}"

# Start services
docker compose -f docker-compose.prod.yml up -d

echo -e "${GREEN}Docker containers started${NC}"

# Wait for services to be healthy
echo -e "${YELLOW}Waiting for services to be ready (30s)...${NC}"
sleep 30

# Check container status
docker compose -f docker-compose.prod.yml ps

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✅ Installation Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "${YELLOW}Your MyRemote instance is now running:${NC}"
echo ""
echo "  🌐 Web UI:      https://$DOMAIN"
echo "  🔧 API:         https://api.$DOMAIN"
echo "  🔐 Keycloak:    https://auth.$DOMAIN"
echo "  📊 Monitoring:  https://monitoring.$DOMAIN"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Test access: curl -k https://$DOMAIN"
echo "  2. Configure Keycloak (create realm, clients, users)"
echo "  3. See full documentation: docs/DEPLOYMENT-VPS.md"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo "  • View logs:        docker compose -f docker-compose.prod.yml logs -f"
echo "  • Restart service:  docker compose -f docker-compose.prod.yml restart api"
echo "  • Stop all:         docker compose -f docker-compose.prod.yml down"
echo ""
echo -e "${GREEN}✨ Enjoy MyRemote!${NC}"
