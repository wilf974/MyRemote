#!/bin/bash
# MyRemote - Fix Docker Network Conflict
# Détecte automatiquement un subnet disponible et met à jour docker-compose.yml

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}================================${NC}"
echo -e "${YELLOW}MyRemote - Network Conflict Fix${NC}"
echo -e "${YELLOW}================================${NC}"
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root (use sudo)${NC}"
   exit 1
fi

INSTALL_DIR="/opt/apps/MyRemote"
cd $INSTALL_DIR

echo -e "${YELLOW}[1/3] Detecting existing Docker networks...${NC}"

# Get all existing subnets
existing_subnets=$(docker network inspect $(docker network ls -q) 2>/dev/null | grep '"Subnet"' | awk -F'"' '{print $4}' | sort -u)

echo "Existing subnets:"
echo "$existing_subnets"
echo ""

# Function to check if a subnet conflicts
check_subnet_conflict() {
    local test_subnet=$1
    local test_network=$(echo $test_subnet | cut -d'.' -f1-3)

    for subnet in $existing_subnets; do
        local existing_network=$(echo $subnet | cut -d'.' -f1-3)
        if [ "$test_network" = "$existing_network" ]; then
            return 1  # Conflict
        fi
    done
    return 0  # No conflict
}

# Try to find an available subnet (from 172.20.0.0 to 172.30.0.0)
echo -e "${YELLOW}[2/3] Finding available subnet...${NC}"

available_subnet=""
for i in {20..30}; do
    test_subnet="172.$i.0.0/16"
    if check_subnet_conflict "$test_subnet"; then
        available_subnet="172.$i.0.0/16"
        internal_subnet="172.$i.1.0/24"
        public_subnet="172.$i.2.0/24"
        break
    fi
done

if [ -z "$available_subnet" ]; then
    echo -e "${RED}Error: Could not find available subnet${NC}"
    echo "Please manually edit docker-compose.yml and docker-compose.prod.yml"
    exit 1
fi

echo -e "${GREEN}Found available subnet: $available_subnet${NC}"
echo "  Internal network: $internal_subnet"
echo "  Public network: $public_subnet"
echo ""

# Update docker-compose.yml
echo -e "${YELLOW}[3/3] Updating docker-compose files...${NC}"

# Backup files
cp docker-compose.yml docker-compose.yml.backup-$(date +%Y%m%d_%H%M%S)
cp docker-compose.prod.yml docker-compose.prod.yml.backup-$(date +%Y%m%d_%H%M%S)

# Update docker-compose.yml (development)
sed -i "s|subnet: 172\.28\.0\.0/16|subnet: $available_subnet|g" docker-compose.yml

# Update docker-compose.prod.yml (production)
sed -i "s|subnet: 172\.20\.1\.0/24|subnet: $internal_subnet|g" docker-compose.prod.yml
sed -i "s|subnet: 172\.20\.2\.0/24|subnet: $public_subnet|g" docker-compose.prod.yml

echo -e "${GREEN}Files updated successfully${NC}"
echo ""

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✅ Network Conflict Fixed!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Configure your DNS records (see instructions below)"
echo "  2. After DNS is configured, run:"
echo "     cd /opt/apps/MyRemote"
echo "     sudo docker compose -f docker-compose.prod.yml up -d"
echo ""
