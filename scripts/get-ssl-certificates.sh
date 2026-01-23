#!/bin/bash

# Script to obtain SSL certificates for MyRemote without breaking existing nginx sites
# Uses nginx webroot method (safer) with fallback to standalone method

set -e

DOMAIN="myremote.woutils.com"
EMAIL="admin@woutils.com"
WEBROOT="/var/www/html"

echo "=========================================="
echo "MyRemote SSL Certificate Setup"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Error: This script must be run as root (use sudo)"
    exit 1
fi

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    echo "Installing certbot..."
    apt-get update
    apt-get install -y certbot
fi

# Method 1: Try nginx webroot method (doesn't require stopping nginx)
echo "Attempting to obtain certificates using nginx webroot method..."
echo "This method is safer and won't stop your existing sites."
echo ""

# Ensure webroot directory exists
mkdir -p $WEBROOT

# Try webroot method first
if certbot certonly --webroot \
    -w $WEBROOT \
    --agree-tos \
    --no-eff-email \
    --email $EMAIL \
    -d $DOMAIN \
    -d api.$DOMAIN \
    -d auth.$DOMAIN \
    -d monitoring.$DOMAIN \
    --non-interactive 2>/dev/null; then

    echo ""
    echo "✅ SUCCESS: SSL certificates obtained using webroot method!"
    echo ""
    echo "Certificates are located at:"
    echo "  /etc/letsencrypt/live/$DOMAIN/"
    echo ""
    exit 0
fi

# Method 2: If webroot failed, offer standalone method (requires stopping nginx)
echo ""
echo "❌ Webroot method failed."
echo ""
echo "Alternative: Use standalone method (requires temporarily stopping nginx)"
echo "This will stop nginx for ~30 seconds to obtain certificates."
echo ""
read -p "Do you want to continue with standalone method? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Certificate acquisition canceled."
    exit 1
fi

echo ""
echo "Stopping nginx temporarily..."
systemctl stop nginx

echo "Obtaining certificates..."
if certbot certonly --standalone \
    --agree-tos \
    --no-eff-email \
    --email $EMAIL \
    -d $DOMAIN \
    -d api.$DOMAIN \
    -d auth.$DOMAIN \
    -d monitoring.$DOMAIN \
    --non-interactive; then

    echo ""
    echo "✅ SUCCESS: SSL certificates obtained using standalone method!"
    echo ""
else
    echo ""
    echo "❌ ERROR: Failed to obtain certificates"
    echo ""
    echo "Starting nginx back up..."
    systemctl start nginx
    exit 1
fi

echo "Starting nginx back up..."
systemctl start nginx

echo ""
echo "Certificates are located at:"
echo "  /etc/letsencrypt/live/$DOMAIN/"
echo ""
echo "✅ All done! Nginx is running again."
