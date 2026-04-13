# n8n Test Deployment With Docker + Host nginx

This bundle is the final 1-month test deployment path for your current setup:

- Hetzner Ubuntu 24.04 VPS
- Docker already installed
- existing `docker run` n8n test container already running as `n8n`
- nginx runs on the VPS host
- n8n stays in Docker and binds only to `127.0.0.1`
- HTTPS is served from `n8n.learningpacer.org` through Certbot + nginx

It is intentionally simple and migration-safe.

## What This Solves

Your current browser error happens because you are opening n8n over:

```text
http://<server-ip>:5678
```

n8n expects a secure public URL when secure cookies are enabled. The fix is:

1. give n8n a real subdomain
2. put nginx in front of it
3. issue HTTPS certificates
4. set n8n's public URL env vars correctly

## Files

- `docker-compose.yml`: single-container n8n deployment
- `.env.example`: final env template with comments
- `nginx/n8n.conf`: first-pass nginx site config for HTTP proxying before Certbot adds HTTPS
- `.gitignore`: prevents accidental commit of local data or `.env`

## Design For This 1-Month Test

This test setup intentionally uses:

- one `n8n` container
- local bind-mounted data directory at `./data/n8n`
- no Postgres yet
- no extra monitoring stack

That keeps migration from your current `docker run` deployment straightforward.

## Production Hardening Next

After the test month, change these:

- move from SQLite/bind-mounted app data to Postgres
- pin `N8N_IMAGE_TAG` to an exact version
- automate encrypted backups
- restrict editor access with IP allowlisting or a gateway
- add uptime checks and log retention
- separate test and production subdomains

## Final `.env` Template

Create `.env` from `.env.example` and fill in the values.

Variable guide:

- `N8N_HOST`
  - public subdomain for the editor and webhook URLs
  - example: `n8n.learningpacer.org`

- `N8N_BIND_IP`
  - keep as `127.0.0.1`
  - this prevents direct public access to port `5678`

- `N8N_BIND_PORT`
  - use `5679` for the dry run
  - switch to `5678` for final cutover

- `N8N_IMAGE_TAG`
  - `stable` is acceptable for this short test
  - pin an exact version later for production

- `N8N_CORS_ORIGIN`
  - your real frontend origin
  - example: `https://learningpacer.org`

- `TZ`
  - server timezone

- `GENERIC_TIMEZONE`
  - n8n workflow timezone

- `N8N_ENCRYPTION_KEY`
  - must match the key used by the current instance if you already saved credentials
  - if you change this during migration, stored credentials can break

- `EXECUTIONS_DATA_MAX_AGE`
  - number of hours to retain execution data

- `EXECUTIONS_DATA_PRUNE_MAX_COUNT`
  - maximum number of stored executions before pruning

## Validated Current Values

These values are already known for your environment:

- VPS IP: `5.223.76.137`
- existing container name: `n8n`
- current host data directory: `/root/.n8n`
- public subdomain: `n8n.learningpacer.org`
- DNS already points to the VPS and is DNS-only in Cloudflare

Your checked-in [`.env`](</c:/Users/adamb/OneDrive/Desktop/FYP/elearn-pacer-hkust/deploy/n8n-vps-nginx/.env:1>) already contains the production hostname and an `N8N_ENCRYPTION_KEY`. Do not paste that key into chat or rotate it during migration.

## Windows Local Notes

You said you SSH from PowerShell on Windows. Typical commands from your local machine:

```powershell
ssh -i $HOME\.ssh\hetzner_learningpacer root@5.223.76.137
scp -i $HOME\.ssh\hetzner_learningpacer -r .\deploy\n8n-vps-nginx root@5.223.76.137:/root/
scp -i $HOME\.ssh\hetzner_learningpacer .\path\to\your-workflow.json root@5.223.76.137:/root/
```

The rest of the migration commands below are run on the VPS after you SSH in.

## Migration Strategy

The safe sequence is:

1. inspect the current `docker run` container
2. extract the current app data and the current encryption key
3. prepare the compose deployment
4. dry-run compose on `127.0.0.1:5679`
5. configure nginx and issue the certificate
6. cut over from the old container to compose on `127.0.0.1:5678`
7. verify login, editor URL, and test webhook execution

## Exact VPS Migration Commands

### 1. Install host packages and the Docker Compose plugin

Run on the VPS:

```bash
sudo apt update
sudo apt -y upgrade
sudo apt -y install nginx certbot python3-certbot-nginx ufw ca-certificates curl docker-compose-plugin
docker compose version
```

If `docker compose version` prints a version, you are ready for the next steps.

### 2. Lock down the firewall

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status verbose
```

### 3. Inspect the currently running n8n container

```bash
docker ps --format "table {{.ID}}\t{{.Image}}\t{{.Ports}}\t{{.Names}}"
```

Set the current container name:

```bash
export OLD_N8N_CONTAINER=n8n
```

Inspect ports, mounts, and env:

```bash
docker inspect "$OLD_N8N_CONTAINER" > /root/old-n8n-inspect.json
docker inspect "$OLD_N8N_CONTAINER" --format '{{range .Config.Env}}{{println .}}{{end}}' | sort
docker inspect "$OLD_N8N_CONTAINER" --format '{{json .Mounts}}'
```

### 4. Confirm the current encryption key

You already extracted the key and stored it in `.env`, but confirm the running instance matches before cutover:

```bash
docker inspect "$OLD_N8N_CONTAINER" --format '{{range .Config.Env}}{{println .}}{{end}}' | grep '^N8N_ENCRYPTION_KEY=' || true
```

If nothing prints, check the generated n8n config file inside the current container:

```bash
docker exec "$OLD_N8N_CONTAINER" sh -lc 'grep -n "encryptionKey" /home/node/.n8n/config || true'
docker exec "$OLD_N8N_CONTAINER" sh -lc 'cat /home/node/.n8n/config 2>/dev/null || true'
```

You must carry that same encryption key forward into the new `.env` if the current instance already stores credentials.

### 5. Copy the deployment bundle into place and stage the data directory

Because your current n8n data is already stored on the VPS at `/root/.n8n`, copy from that host directory directly. This is simpler and safer than extracting from the container filesystem.

```bash
mkdir -p /root/apps/n8n-test
cd /root/apps/n8n-test
cp -r /root/n8n-vps-nginx/* .
mkdir -p data/n8n
cp /root/n8n-vps-nginx/.env ./.env
cp -a /root/.n8n/. ./data/n8n/
sudo chown -R 1000:1000 ./data/n8n
```

Keep a backup copy before changing anything:

```bash
cp -a ./data/n8n ./data/n8n.backup-pre-migration
```

### 6. Review the new `.env`

Open `.env` and verify:

- `N8N_HOST=n8n.learningpacer.org`
- `N8N_CORS_ORIGIN=https://learningpacer.org`
- `N8N_ENCRYPTION_KEY` matches the current instance
- `N8N_BIND_PORT=5679` for the dry run

```bash
sed -i 's/^N8N_BIND_PORT=.*/N8N_BIND_PORT=5679/' .env
cat .env
```

### 7. Dry-run compose on `127.0.0.1:5679`

```bash
docker compose pull
docker compose up -d
docker compose ps
docker compose logs --tail=200 n8n
curl -I http://127.0.0.1:5679
```

Expected result:

- container is `Up`
- `curl` returns an HTTP response
- no startup errors in the logs

### 8. Configure nginx for `n8n.learningpacer.org`

For the dry run, point nginx at `127.0.0.1:5679` so HTTPS tests the new compose-managed instance instead of the old container on `5678`.

```bash
sudo cp nginx/n8n.conf /etc/nginx/sites-available/n8n
sudo sed -i 's/127\.0\.0\.1:5678/127.0.0.1:5679/' /etc/nginx/sites-available/n8n
sudo ln -sf /etc/nginx/sites-available/n8n /etc/nginx/sites-enabled/n8n
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Before requesting the certificate, make sure DNS is already pointing at the VPS:

```bash
getent hosts n8n.learningpacer.org
```

### 9. Issue HTTPS with Certbot

```bash
sudo certbot --nginx -d n8n.learningpacer.org
sudo nginx -t
sudo systemctl reload nginx
```

Certbot will update the site config to add the `443` server block and HTTPS redirect.

### 10. Verify HTTPS against the dry-run container

```bash
curl -I https://n8n.learningpacer.org
```

Open the subdomain in the browser:

```text
https://n8n.learningpacer.org
```

If login works here, the secure-cookie issue is resolved and the reverse proxy is correct.

### 11. Cut over from the old `docker run` container to compose on `5678`

Edit `.env` and switch nginx back to `127.0.0.1:5678`:

```bash
sed -i 's/^N8N_BIND_PORT=.*/N8N_BIND_PORT=5678/' .env
sudo sed -i 's/127\.0\.0\.1:5679/127.0.0.1:5678/' /etc/nginx/sites-available/n8n
```

Stop the old container, but keep it for rollback until you fully verify the new stack:

```bash
docker stop "$OLD_N8N_CONTAINER"
```

Restart compose on the final port:

```bash
docker compose down
docker compose up -d
docker compose ps
docker compose logs --tail=200 n8n
sudo nginx -t
sudo systemctl reload nginx
curl -I http://127.0.0.1:5678
curl -I https://n8n.learningpacer.org
```

At this point, nginx is now proxying to the compose-managed instance on the final port.

Only after you are satisfied with the new stack, you may remove the old test container:

```bash
docker rm "$OLD_N8N_CONTAINER"
```

## Rollback Steps

If the compose deployment is unhealthy after cutover:

1. stop compose
2. restore the old container
3. verify the old local port responds again

Rollback commands:

```bash
cd /root/apps/n8n-test
docker compose down
```

If your old container still exists but is stopped:

```bash
docker start "$OLD_N8N_CONTAINER"
curl -I http://127.0.0.1:5678
```

If you need to restore the copied app data before retrying:

```bash
rm -rf /root/apps/n8n-test/data/n8n
cp -a /root/apps/n8n-test/data/n8n.backup-pre-migration /root/apps/n8n-test/data/n8n
sudo chown -R 1000:1000 /root/apps/n8n-test/data/n8n
docker compose up -d
```

## Importing Your Local Workflow JSON After Migration

If the migrated data already contains your workflows, you do not need to import anything.

If the target instance is empty or you want to re-import:

1. copy the exported workflow JSON to the VPS
2. open the n8n editor in the browser
3. use `Add workflow` -> `Import from file`
4. reconnect credentials if needed
5. activate the workflow

If you copied the JSON to `/root/your-workflow.json`, the browser import step still happens in the UI. The file just needs to exist on the VPS or your local machine where the browser can access it.

## Verification Checklist

Run these checks in order:

1. `docker compose ps`
2. `docker compose logs --tail=200 n8n`
3. `curl -I http://127.0.0.1:5678`
4. `curl -I https://n8n.learningpacer.org`
5. open `https://n8n.learningpacer.org` in the browser
6. log in successfully
7. confirm webhook URLs show the HTTPS subdomain
8. run one test workflow execution

## Troubleshooting

If you still see the secure cookie / insecure URL problem:

- make sure you are using the HTTPS subdomain, not the IP
- make sure `N8N_HOST` matches the real subdomain
- make sure compose is setting `N8N_EDITOR_BASE_URL=https://<subdomain>`
- make sure compose is setting `WEBHOOK_URL=https://<subdomain>/`
- make sure `N8N_PROXY_HOPS=1`
- restart the container after any env change

If nginx works but n8n is unreachable:

```bash
docker compose ps
docker compose logs --tail=200 n8n
ss -tulpn | grep 5678
ss -tulpn | grep 5679
curl -I http://127.0.0.1:5678
curl -I http://127.0.0.1:5679
```

If Certbot fails:

- check the DNS record first
- confirm port `80` is open
- confirm nginx passed `nginx -t`

## One Copy-Paste VPS Command List

This block uses your actual environment. Run it only on the VPS after you have copied `deploy/n8n-vps-nginx` to `/root/n8n-vps-nginx`.

```bash
sudo apt update && sudo apt -y upgrade && sudo apt -y install nginx certbot python3-certbot-nginx ufw ca-certificates curl docker-compose-plugin
docker compose version
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status verbose

docker ps --format "table {{.ID}}\t{{.Image}}\t{{.Ports}}\t{{.Names}}"
export OLD_N8N_CONTAINER=n8n

mkdir -p /root/apps/n8n-test
cd /root/apps/n8n-test
cp -r /root/n8n-vps-nginx/* .
mkdir -p data/n8n
cp /root/n8n-vps-nginx/.env ./.env
cp -a /root/.n8n/. ./data/n8n/
sudo chown -R 1000:1000 ./data/n8n
cp -a ./data/n8n ./data/n8n.backup-pre-migration

sed -i 's/^N8N_BIND_PORT=.*/N8N_BIND_PORT=5679/' .env

docker compose pull
docker compose up -d
docker compose ps
docker compose logs --tail=200 n8n
curl -I http://127.0.0.1:5679

sudo cp nginx/n8n.conf /etc/nginx/sites-available/n8n
sudo sed -i 's/127\.0\.0\.1:5678/127.0.0.1:5679/' /etc/nginx/sites-available/n8n
sudo ln -sf /etc/nginx/sites-available/n8n /etc/nginx/sites-enabled/n8n
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
getent hosts n8n.learningpacer.org
sudo certbot --nginx -d n8n.learningpacer.org
sudo nginx -t
sudo systemctl reload nginx
curl -I https://n8n.learningpacer.org

sed -i 's/^N8N_BIND_PORT=.*/N8N_BIND_PORT=5678/' .env
sudo sed -i 's/127\.0\.0\.1:5679/127.0.0.1:5678/' /etc/nginx/sites-available/n8n
docker stop "$OLD_N8N_CONTAINER"
docker compose down
docker compose up -d
docker compose ps
docker compose logs --tail=200 n8n
sudo nginx -t
sudo systemctl reload nginx
curl -I http://127.0.0.1:5678
curl -I https://n8n.learningpacer.org
```
