#!/bin/bash

# SSL Initialization Script for admin.newmainerproject.org
# Run this script on the EC2 server to set up Let's Encrypt SSL certificates

set -e

DOMAIN="admin.newmainerproject.org"
EMAIL="${1:-admin@newmainerproject.org}"

echo "=== SSL Initialization for $DOMAIN ==="
echo "Using email: $EMAIL"
echo ""

# Create required directories
echo "1. Creating directories..."
mkdir -p ./certbot/conf
mkdir -p ./certbot/www

# Create temporary nginx config (HTTP only)
echo "2. Creating temporary HTTP-only nginx config..."
cat > ./nginx-temp.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream canmp {
        server canmp:3000;
    }

    server {
        listen 80;
        server_name admin.newmainerproject.org;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            proxy_pass http://canmp;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
EOF

# Backup original nginx.conf
echo "3. Backing up original nginx.conf..."
cp nginx.conf nginx.conf.backup

# Use temporary config
cp nginx-temp.conf nginx.conf

# Stop existing containers
echo "4. Stopping existing containers..."
docker compose down || true

# Start app and nginx (HTTP only)
echo "5. Starting app and nginx (HTTP only)..."
docker compose up -d canmp nginx

# Wait for services to be ready
echo "6. Waiting for services to start..."
sleep 10

# Test HTTP is working
echo "7. Testing HTTP access..."
curl -s -o /dev/null -w "%{http_code}" http://localhost/.well-known/acme-challenge/test 2>/dev/null || true

# Request certificate
echo "8. Requesting SSL certificate from Let's Encrypt..."
docker compose run --rm certbot certonly --webroot \
    --webroot-path=/var/www/certbot \
    -d "$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --force-renewal

# Check if certificate was created
if [ -f "./certbot/conf/live/$DOMAIN/fullchain.pem" ]; then
    echo "9. Certificate obtained successfully!"

    # Restore original nginx.conf with SSL
    echo "10. Restoring SSL-enabled nginx config..."
    cp nginx.conf.backup nginx.conf

    # Restart nginx with SSL
    echo "11. Restarting nginx with SSL..."
    docker compose up -d nginx

    # Cleanup
    rm -f nginx-temp.conf nginx.conf.backup

    echo ""
    echo "=== SUCCESS ==="
    echo "SSL certificate installed for $DOMAIN"
    echo "HTTPS should now be working at https://$DOMAIN"
    echo ""
    echo "Certificate will auto-renew via the certbot container."
else
    echo ""
    echo "=== ERROR ==="
    echo "Certificate was not created. Check the certbot logs above."
    echo "Restoring original config..."
    cp nginx.conf.backup nginx.conf
    rm -f nginx-temp.conf
    exit 1
fi
