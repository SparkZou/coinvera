# Deployment

The demo is a static SPA. It is built inside Docker and served by `nginx:alpine`;
host nginx terminates TLS and reverse-proxies to the container.

## Quick deploy (fresh Debian/Ubuntu server)

```bash
# on the server, with the repo checked out at /opt/coinvera
cd /opt/coinvera
DOMAIN=coinvera.aicloud.co.nz EMAIL=admin@aicloud.co.nz ./deploy/deploy.sh
```

`deploy.sh` is idempotent: it installs Docker / nginx / certbot as needed, builds
the image, starts the container on `127.0.0.1:8090`, writes the host nginx site,
and obtains a Let's Encrypt certificate.

## Update an existing deployment

```bash
cd /opt/coinvera && git pull
docker compose -f deploy/docker-compose.yml up -d --build
```

## Files

| File | Purpose |
|------|---------|
| `Dockerfile` | multi-stage build → `nginx:alpine` serving `dist/` |
| `nginx.container.conf` | in-container server block (SPA fallback, gzip) |
| `docker-compose.yml` | runs the app on `127.0.0.1:8090` |
| `nginx.host.conf` | host TLS vhost, proxies to the container |
| `deploy.sh` | one-shot provisioning + TLS |
