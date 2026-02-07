# Self-hosted n8n: CORS setup (step-by-step)

Your Network tab shows: the browser sends an **OPTIONS** request (CORS preflight) to the webhook, and the server returns **500 Internal Server Error**. So the preflight fails and the real POST never runs. Fixing CORS on the n8n server fixes this.

---

## What to set

- **Environment variable name:** `N8N_CORS_ORIGIN` (with the number **8**, not "NBN")
- **Value to allow your app:**
  - Allow all: `*`
  - Or only your origins (no spaces): `http://localhost:8080,https://learningpacer.org,https://www.learningpacer.org`

You set this on the **machine or container where n8n is running** (the server that hosts n8n.learningpacer.org), then restart n8n.

---

## Step 1: Find where n8n runs

You need to know how n8n is started. Common cases:

- **Docker Compose** – you have a `docker-compose.yml` (or `compose.yml`) that defines an n8n service. You might have created it when you first set up n8n, or it lives on the server (e.g. in `~/n8n` or `/opt/n8n`).
- **Docker only** – you start n8n with a `docker run ...` command (or a script that runs it).
- **VPS / cloud VM** – you SSH into the server and run one of the above there; the Compose file or run command is on that server.
- **Managed / one-click** – e.g. a Cloudron, CapRover, or hosting panel that runs n8n in a container; you set env vars in that panel’s “Environment” or “Variables” for the n8n app.

If you’re not sure, SSH into the server that serves `n8n.learningpacer.org` and run:

```bash
docker ps | grep n8n
```

If you see an n8n container, note its name or image. Then:

```bash
docker inspect <container_name_or_id>
```

Look for `"Env"` or `"EnvFile"` to see how it’s configured. That tells you whether to use Docker Compose or a `docker run` command.

---

## Step 2: Set N8N_CORS_ORIGIN

### Option A: Docker Compose (most common)

1. On the server, open the project folder that contains your n8n Compose file (e.g. `cd ~/n8n` or wherever `docker-compose.yml` is).
2. Open `docker-compose.yml` in an editor (e.g. `nano docker-compose.yml`).
3. Find the service that runs n8n (often named `n8n`). Under that service, find the `environment:` section. If it doesn’t exist, add it.
4. Add this line (exactly as written):

   ```yaml
   environment:
     - N8N_CORS_ORIGIN=*
   ```

   If you already have other `environment` entries, just add this one as another line, for example:

   ```yaml
   services:
     n8n:
       image: n8nio/n8n
       environment:
         - N8N_HOST=n8n.learningpacer.org
         - N8N_CORS_ORIGIN=*
   ```

5. Save the file (in nano: Ctrl+O, Enter, then Ctrl+X).
6. Restart the stack:

   ```bash
   docker-compose down
   docker-compose up -d
   ```

7. Wait a few seconds, then in the browser send a chat message again and check the Network tab. The **OPTIONS** request should now return **200** (or 204), not 500.

### Option B: Docker run (no Compose)

1. Find the exact `docker run` command you use to start n8n (or the script that runs it).
2. Add this to the command (before the image name):

   ```bash
   -e N8N_CORS_ORIGIN="*"
   ```

   Example:

   ```bash
   docker run -d \
     -e N8N_CORS_ORIGIN="*" \
     -p 5678:5678 \
     -v n8n_data:/home/node/.n8n \
     n8nio/n8n
   ```

3. Stop the current n8n container, then start it again with the updated command.
4. Test again from the browser (OPTIONS should be 200).

### Option C: Hosting panel (Cloudron, CapRover, etc.)

1. Open the panel and go to the n8n application.
2. Find “Environment variables”, “Env”, or “Variables”.
3. Add a new variable:
   - **Name:** `N8N_CORS_ORIGIN`
   - **Value:** `*` or `http://localhost:8080,https://learningpacer.org,https://www.learningpacer.org`
4. Save and restart the app (or redeploy).
5. Test again from the browser.

---

## Step 3: Confirm it worked

1. In your app at `http://localhost:8080/platform`, send a chat message (e.g. “hi”).
2. Open DevTools (F12) → **Network**.
3. Find the request to `n8n.learningpacer.org` (the **OPTIONS** one).
4. It should show **Status 200** (or 204), not 500.
5. You should also see a **POST** request to the same URL with status 200 and the chat should get a response.

If OPTIONS is still 500, the variable is either not set on the process that handles the request, or there’s a proxy (e.g. Cloudflare, Nginx) in front of n8n that needs to handle OPTIONS or pass through CORS headers. In that case, the next step is to ensure the proxy forwards OPTIONS to n8n and doesn’t return 500.

---

## Quick reference

| Item | Value |
|------|--------|
| Variable | `N8N_CORS_ORIGIN` |
| Allow all | `*` |
| Allow specific | `http://localhost:8080,https://learningpacer.org` (no spaces) |
| Where | On the server/container where n8n runs |
| After change | Restart n8n (e.g. `docker-compose down && docker-compose up -d`) |
