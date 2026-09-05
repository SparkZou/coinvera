#!/usr/bin/env bash
# One-shot deploy for the Coinvera demo on a fresh Debian/Ubuntu box.
#   - installs Docker, nginx, certbot (idempotent)
#   - builds the app image and starts the container on 127.0.0.1:8090
#   - configures host nginx + Let's Encrypt for the domain
#
# Usage:  DOMAIN=coinvera.aicloud.co.nz EMAIL=you@example.com ./deploy.sh
set -euo pipefail

DOMAIN="${DOMAIN:-coinvera.aicloud.co.nz}"
EMAIL="${EMAIL:-admin@aicloud.co.nz}"
APP_DIR="${APP_DIR:-/opt/coinvera}"

echo "==> Deploying $DOMAIN from $APP_DIR"

# --- packages -------------------------------------------------------------
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl nginx
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

# --- build & run the app container ----------------------------------------
cd "$APP_DIR"
docker compose -f deploy/docker-compose.yml up -d --build

# --- host nginx (HTTP first, so certbot can validate) ---------------------
mkdir -p /var/www/certbot
install -m 644 deploy/nginx.host.conf "/etc/nginx/sites-available/coinvera.conf"
ln -sf /etc/nginx/sites-available/coinvera.conf /etc/nginx/sites-enabled/coinvera.conf
rm -f /etc/nginx/sites-enabled/default

# If certs are not present yet, serve HTTP only until certbot runs.
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  cat >/etc/nginx/sites-available/coinvera.conf <<EOF
server {
    listen 80;
    server_name $DOMAIN;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { proxy_pass http://127.0.0.1:8090; proxy_set_header Host \$host; }
}
EOF
fi
nginx -t && systemctl reload nginx

# --- TLS ------------------------------------------------------------------
if ! command -v certbot >/dev/null 2>&1; then
  apt-get install -y certbot python3-certbot-nginx
fi
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect || true

# Re-apply the full host config now that certs exist.
if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  install -m 644 deploy/nginx.host.conf "/etc/nginx/sites-available/coinvera.conf"
  nginx -t && systemctl reload nginx
fi

echo "==> Done. https://$DOMAIN"
