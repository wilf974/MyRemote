#!/bin/bash
# MyRemote - Script de Déploiement VPS Production
# Domain: myremote.woutils.com
# Location: /opt/apps/myremote

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="myremote.woutils.com"
INSTALL_DIR="/opt/apps/MyRemote"
NGINX_CONFIG="/etc/nginx/sites-available/myremote.conf"
CERTBOT_EMAIL="admin@woutils.com"  # Change this!

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}MyRemote - VPS Deployment Script${NC}"
echo -e "${GREEN}================================${NC}"
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root (use sudo)${NC}"
   exit 1
fi

# Step 1: Update system
echo -e "${YELLOW}[1/10] Updating system...${NC}"
apt-get update
apt-get upgrade -y

# Step 2: Install dependencies
echo -e "${YELLOW}[2/10] Installing dependencies...${NC}"

# Check if Docker is already installed
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
else
    echo "Docker is already installed"
fi

# Install other dependencies
apt-get install -y \
    curl \
    git \
    nginx \
    certbot \
    python3-certbot-nginx \
    ufw

# Enable and start Docker
systemctl enable docker
systemctl start docker

# Step 3: Configure firewall (preserve existing rules)
echo -e "${YELLOW}[3/10] Configuring firewall...${NC}"
if ! ufw status | grep -q "Status: active"; then
    ufw --force enable
fi

# Allow SSH (if not already allowed)
ufw allow ssh

# Allow HTTP/HTTPS (if not already allowed)
ufw allow 'Nginx Full'

# Allow TURN relay ports
ufw allow 3478/tcp
ufw allow 3478/udp
ufw allow 5349/tcp
ufw allow 49152:65535/udp  # TURN relay port range

echo -e "${GREEN}Firewall configured${NC}"

# Step 4: Create application directory
echo -e "${YELLOW}[4/10] Creating application directory...${NC}"
mkdir -p $INSTALL_DIR
cd $INSTALL_DIR

# Step 5: Clone repository (or update if exists)
echo -e "${YELLOW}[5/10] Cloning/updating repository...${NC}"
if [ -d ".git" ]; then
    echo "Repository exists, pulling latest changes..."
    git pull origin claude/remote-support-app-design-arFMJ
else
    echo "Cloning repository..."
    git clone https://github.com/wilf974/MyRemote.git .
    git checkout claude/remote-support-app-design-arFMJ
fi

# Step 6: Configure environment variables
echo -e "${YELLOW}[6/10] Configuring environment variables...${NC}"
if [ ! -f ".env.prod" ]; then
    cp .env.prod.example .env.prod
    echo -e "${RED}⚠️  IMPORTANT: Edit .env.prod with your passwords!${NC}"
    echo -e "${YELLOW}Opening .env.prod in nano...${NC}"
    echo -e "${YELLOW}Press Ctrl+X to save and exit${NC}"
    sleep 3
    nano .env.prod
else
    echo ".env.prod already exists, skipping..."
fi

# Step 7: Obtain SSL certificates
echo -e "${YELLOW}[7/10] Obtaining SSL certificates...${NC}"
# Stop nginx temporarily for certbot standalone
systemctl stop nginx

# Obtain wildcard certificate (requires DNS challenge)
# Or obtain separate certificates for each subdomain
echo -e "${YELLOW}Obtaining certificate for $DOMAIN and subdomains...${NC}"
certbot certonly --standalone \
    --agree-tos \
    --no-eff-email \
    --email $CERTBOT_EMAIL \
    -d $DOMAIN \
    -d api.$DOMAIN \
    -d auth.$DOMAIN \
    -d monitoring.$DOMAIN \
    --non-interactive || {
        echo -e "${RED}Certificate generation failed. Please check your DNS records.${NC}"
        echo -e "${YELLOW}Make sure these DNS records point to this server:${NC}"
        echo "  $DOMAIN"
        echo "  api.$DOMAIN"
        echo "  auth.$DOMAIN"
        echo "  monitoring.$DOMAIN"
        exit 1
    }

echo -e "${GREEN}SSL certificates obtained${NC}"

# Step 8: Configure nginx
echo -e "${YELLOW}[8/10] Configuring nginx...${NC}"

# Backup existing nginx config if exists
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

# Reload nginx
systemctl start nginx
systemctl reload nginx
systemctl enable nginx

echo -e "${GREEN}Nginx configured and reloaded${NC}"

# Step 9: Start Docker containers
echo -e "${YELLOW}[9/10] Starting Docker containers...${NC}"

# Pull images
docker compose -f docker-compose.prod.yml pull

# Start services
docker compose -f docker-compose.prod.yml up -d

echo -e "${GREEN}Docker containers started${NC}"

# Wait for services to be healthy
echo -e "${YELLOW}Waiting for services to be ready (30s)...${NC}"
sleep 30

# Check container status
docker compose -f docker-compose.prod.yml ps

# Step 10: Run database migrations
echo -e "${YELLOW}[10/10] Running database migrations...${NC}"
# TODO: Add migration command when backend is ready
# docker compose -f docker-compose.prod.yml exec api pnpm db:migrate

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
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
echo "  1. Configure Keycloak (create realm, clients, users)"
echo "  2. Test login at https://$DOMAIN"
echo "  3. Setup automatic backups (see docs/DEPLOYMENT-VPS.md)"
echo "  4. Configure monitoring alerts"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo "  • View logs:           docker compose -f docker-compose.prod.yml logs -f"
echo "  • Restart services:    docker compose -f docker-compose.prod.yml restart"
echo "  • Stop services:       docker compose -f docker-compose.prod.yml down"
echo "  • Update app:          cd $INSTALL_DIR && git pull && docker compose -f docker-compose.prod.yml up -d --build"
echo ""
echo -e "${GREEN}✨ Enjoy MyRemote!${NC}"
