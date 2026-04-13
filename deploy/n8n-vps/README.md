# n8n VPS Deployment

This bundle is a simple production setup for your public-facing n8n backend:

- `Caddy` terminates HTTPS and reverse proxies to n8n
- `n8n` runs in Docker with persistent app data
- `Postgres` stores workflows, executions, and credentials metadata

It is designed for one VPS and one public domain such as `n8n.learningpacer.org`.

## Architecture

Traffic flow:

1. Browser or frontend calls `https://n8n.your-domain.com`
2. `Caddy` serves HTTPS and forwards requests to `n8n:5678`
3. `n8n` reads and writes state to the `postgres` container
4. Docker volumes keep Caddy certificates, n8n state, and Postgres data across restarts

Design choices:

- No direct public port to `n8n` or `postgres`
- TLS is automatic through Caddy and Let's Encrypt
- Secrets stay in a local `.env` file, not in Git
- Updates are a normal `docker compose pull && docker compose up -d`

## Files

- `docker-compose.yml`: services, networks, volumes
- `.env.example`: all required deployment variables
- `caddy/Caddyfile`: HTTPS reverse proxy config
- `scripts/backup-postgres.sh`: compressed Postgres backup helper
- `.gitignore`: prevents local secrets and backup artifacts from being committed

## What This Repo Already Assumes

Your app currently assumes:

- the frontend points at `VITE_N8N_BASE_URL`
- chat and exam flows hit n8n webhooks
- production should use `webhook/`, not `webhook-test/`

Relevant repo files:

- `src/constants/api.ts`
- `supabase/functions/generate-exam/index.ts`
- `CLAUDE.md`

Do not cut over the frontend until the VPS is live and your production webhook URLs are confirmed.

## Required VPS Commands

Assuming Ubuntu 24.04 or 22.04:

```bash
sudo apt update
sudo apt -y upgrade
sudo apt -y install ca-certificates curl ufw

curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
newgrp docker

sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable
```

Create a deployment directory and copy this folder there:

```bash
mkdir -p ~/apps/n8n
cd ~/apps/n8n
```

## First-Time Deployment

1. Create a DNS `A` record for `n8n.your-domain.com` pointing to the VPS public IP.
2. Copy `.env.example` to `.env`.
3. Replace every placeholder secret before the first boot.
4. Start the stack.

Commands:

```bash
cp .env.example .env
nano .env
mkdir -p local-files
chmod +x scripts/backup-postgres.sh
docker compose pull
docker compose up -d
docker compose logs -f caddy n8n postgres
```

Open your domain in a browser:

```text
https://n8n.your-domain.com
```

On first boot, n8n will ask you to create the instance owner account.

## Sanity Checks

Check containers:

```bash
docker compose ps
```

Check Caddy logs:

```bash
docker compose logs --tail=100 caddy
```

Check n8n logs:

```bash
docker compose logs --tail=200 n8n
```

Check Postgres logs:

```bash
docker compose logs --tail=100 postgres
```

## Backups

Run a manual Postgres backup:

```bash
./scripts/backup-postgres.sh
```

Restore from a backup:

```bash
set -a
source .env
set +a
gunzip -c backups/<backup-file>.sql.gz | docker compose exec -T postgres psql -U "$POSTGRES_USER" "$POSTGRES_DB"
```

Recommended backup policy:

- daily database dump
- off-server copy of the `backups/` directory
- snapshot or volume-level backup for the VPS if your provider supports it

Example cron entry for nightly backups at 03:15 UTC:

```cron
15 3 * * * cd /home/<user>/apps/n8n && ./scripts/backup-postgres.sh >/tmp/n8n-backup.log 2>&1
```

## Updates

Read the release notes before updating major versions.

Normal update flow:

```bash
docker compose pull
docker compose up -d
docker image prune -f
```

If you want deterministic rollouts, replace `N8N_IMAGE_TAG=stable` in `.env` with an exact version after validating the target release.

## Debugging Checklist

If `https://<domain>` does not load:

- verify the DNS `A` record points to the VPS
- confirm ports `80` and `443` are open
- check `docker compose logs caddy`

If n8n loads but webhooks fail:

- confirm the workflow is active
- confirm the workflow uses production `webhook/` URLs
- confirm `WEBHOOK_URL` and `N8N_EDITOR_BASE_URL` match the public domain
- check `docker compose logs n8n`

If n8n cannot save state or credentials:

- verify `N8N_ENCRYPTION_KEY` is set and never changed casually after go-live
- verify Postgres credentials in `.env`
- check `docker compose logs postgres n8n`

If the frontend cannot call n8n:

- set the frontend `VITE_N8N_BASE_URL` to the public HTTPS n8n domain
- keep `N8N_CORS_ORIGIN` restricted to the real frontend origin
- stop using `webhook-test/` in production-facing code

## Cutover Notes For This Repo

After the VPS is healthy, update these areas:

- frontend base URL in `.env` or Cloudflare environment settings
- `src/constants/api.ts` to use production webhook paths
- `supabase/functions/generate-exam/index.ts` so the default fallback URL is not an old hosted test webhook

Do those changes only after you verify the live n8n workflow URLs in the editor.
