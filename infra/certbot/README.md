# Certbot certificate files

This directory is mounted by the production Nginx container.

- `conf/` maps to `/etc/letsencrypt`
- `www/` maps to `/var/www/certbot`

The production domain structure is:

- Canonical domain: `kittysaemi.com`
- Redirect domains: `www.kittysaemi.com`, `kittysaemi.kr`, `www.kittysaemi.kr`
- Frontend: `https://kittysaemi.com/`
- Backend API: `https://kittysaemi.com/api/*`

Issue the initial Let's Encrypt certificate on the server after DNS points to the
server public IP. Run this before starting the Nginx service because Nginx needs
the certificate files to boot with the production HTTPS config:

```bash
mkdir -p infra/certbot/conf infra/certbot/www
docker run --rm \
  -p 80:80 \
  -v "$(pwd)/infra/certbot/conf:/etc/letsencrypt" \
  -v "$(pwd)/infra/certbot/www:/var/www/certbot" \
  certbot/certbot:v3.1.0 certonly \
  --standalone \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d kittysaemi.com \
  -d www.kittysaemi.com \
  -d kittysaemi.kr \
  -d www.kittysaemi.kr
```

After Nginx is running, renew certificates with the webroot volume:

```bash
docker compose run --rm certbot renew --webroot --webroot-path /var/www/certbot
docker compose exec nginx nginx -s reload
```

Do not commit generated certificate files.
