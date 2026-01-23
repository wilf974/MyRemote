#!/bin/bash

# Deploy MyRemote Infrastructure (without API/Web - code not implemented yet)
# This deploys: PostgreSQL, Redis, Keycloak, Grafana, Loki, Promtail, coturn

set -e

DOMAIN="myremote.woutils.com"
INSTALL_DIR="/opt/apps/MyRemote"
COMPOSE_FILE="docker-compose.infra.yml"

echo "=========================================="
echo "MyRemote Infrastructure Deployment"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Error: This script must be run as root (use sudo)"
    exit 1
fi

echo "Step 1/8: Checking prerequisites..."

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if SSL certificates exist
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo ""
    echo "⚠️  SSL certificates not found!"
    echo ""
    echo "Please run the SSL certificate script first:"
    echo "  sudo bash $INSTALL_DIR/scripts/get-ssl-certificates.sh"
    echo ""
    exit 1
fi

echo "✅ Prerequisites OK"
echo ""

echo "Step 2/8: Creating installation directory..."
mkdir -p $INSTALL_DIR
cd $INSTALL_DIR

echo "Step 3/8: Checking .env.prod file..."
if [ ! -f ".env.prod" ]; then
    echo ""
    echo "⚠️  .env.prod file not found!"
    echo ""
    echo "Please copy .env.prod.example to .env.prod and fill in the values:"
    echo "  cd $INSTALL_DIR"
    echo "  cp .env.prod.example .env.prod"
    echo "  nano .env.prod"
    echo ""
    exit 1
fi

echo "✅ Environment file exists"
echo ""

echo "Step 4/8: Pulling latest code..."
if [ -d ".git" ]; then
    git pull origin claude/remote-support-app-design-arFMJ
else
    echo "Warning: Not a git repository. Skipping pull."
fi

echo "Step 5/8: Creating infrastructure-only compose file..."
cat > $COMPOSE_FILE << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: myremote-postgres-prod
    restart: always
    environment:
      POSTGRES_DB: myremote
      POSTGRES_USER: myremote
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - myremote-internal
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U myremote"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: myremote-redis-prod
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    networks:
      - myremote-internal
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  keycloak:
    image: quay.io/keycloak/keycloak:24.0
    container_name: myremote-keycloak-prod
    restart: always
    environment:
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres:5432/myremote
      KC_DB_USERNAME: myremote
      KC_DB_PASSWORD: ${POSTGRES_PASSWORD}
      KC_HOSTNAME: auth.${DOMAIN}
      KC_PROXY: edge
      KC_HTTP_ENABLED: "true"
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: ${KEYCLOAK_ADMIN_PASSWORD}
    command: start
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - myremote-internal
      - myremote-public
    ports:
      - "8080:8080"
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:8080/health/ready || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5

  grafana:
    image: grafana/grafana:10.4.0
    container_name: myremote-grafana-prod
    restart: always
    environment:
      GF_SERVER_ROOT_URL: https://monitoring.${DOMAIN}
      GF_SERVER_DOMAIN: monitoring.${DOMAIN}
      GF_DATABASE_TYPE: postgres
      GF_DATABASE_HOST: postgres:5432
      GF_DATABASE_NAME: myremote
      GF_DATABASE_USER: myremote
      GF_DATABASE_PASSWORD: ${POSTGRES_PASSWORD}
      GF_AUTH_DISABLE_LOGIN_FORM: "false"
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_ADMIN_PASSWORD:-admin}
    volumes:
      - grafana-data:/var/lib/grafana
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - myremote-internal
      - myremote-public
    ports:
      - "3001:3000"

  loki:
    image: grafana/loki:2.9.0
    container_name: myremote-loki-prod
    restart: always
    command: -config.file=/etc/loki/local-config.yaml
    volumes:
      - loki-data:/loki
    networks:
      - myremote-internal
    ports:
      - "3100:3100"

  promtail:
    image: grafana/promtail:2.9.0
    container_name: myremote-promtail-prod
    restart: always
    volumes:
      - /var/log:/var/log:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
    command: -config.file=/etc/promtail/config.yml
    networks:
      - myremote-internal

  coturn:
    image: coturn/coturn:4.6-alpine
    container_name: myremote-coturn-prod
    restart: always
    network_mode: host
    environment:
      TURN_REALM: ${DOMAIN}
      TURN_SECRET: ${TURN_SECRET}
    command:
      - "-n"
      - "--log-file=stdout"
      - "--external-ip=$(detect-external-ip.sh)"
      - "--realm=${DOMAIN}"
      - "--use-auth-secret"
      - "--static-auth-secret=${TURN_SECRET}"

networks:
  myremote-internal:
    driver: bridge
    ipam:
      config:
        - subnet: 172.24.0.0/16
  myremote-public:
    driver: bridge

volumes:
  postgres-data:
  redis-data:
  grafana-data:
  loki-data:
EOF

echo "✅ Infrastructure compose file created"
echo ""

echo "Step 6/8: Starting infrastructure services..."
docker compose -f $COMPOSE_FILE --env-file .env.prod up -d

echo ""
echo "Step 7/8: Configuring nginx reverse proxy..."

# Copy nginx config
cp infra/nginx/myremote.conf /etc/nginx/sites-available/
ln -sf /etc/nginx/sites-available/myremote.conf /etc/nginx/sites-enabled/

# Test nginx config
nginx -t

# Reload nginx
systemctl reload nginx

echo "✅ Nginx configured and reloaded"
echo ""

echo "Step 8/8: Verifying deployment..."
sleep 5

# Check container status
echo ""
echo "Container status:"
docker compose -f $COMPOSE_FILE ps

echo ""
echo "=========================================="
echo "✅ Infrastructure Deployment Complete!"
echo "=========================================="
echo ""
echo "Services deployed:"
echo "  • PostgreSQL - Database"
echo "  • Redis - Cache & Sessions"
echo "  • Keycloak - Authentication (https://auth.$DOMAIN)"
echo "  • Grafana - Monitoring (https://monitoring.$DOMAIN)"
echo "  • Loki - Log aggregation"
echo "  • Promtail - Log collection"
echo "  • coturn - TURN/STUN server"
echo ""
echo "⚠️  IMPORTANT: API and Web services NOT deployed"
echo "   Reason: Application code not implemented yet"
echo ""
echo "Next steps:"
echo "  1. Access Keycloak: https://auth.$DOMAIN"
echo "     Username: admin"
echo "     Password: (from .env.prod KEYCLOAK_ADMIN_PASSWORD)"
echo ""
echo "  2. Access Grafana: https://monitoring.$DOMAIN"
echo "     Username: admin"
echo "     Password: (from .env.prod GRAFANA_ADMIN_PASSWORD)"
echo ""
echo "  3. To deploy the full application, implement the code according to:"
echo "     docs/08-IMPLEMENTATION-PLAN.md (Sprints 1-6)"
echo ""
echo "To view logs:"
echo "  docker compose -f $COMPOSE_FILE logs -f"
echo ""
