# Deploy n8n to Railway.app - Beginner Guide

This guide will walk you through deploying n8n (your workflow automation tool) to Railway so it runs 24/7, even when your computer is off.

## Prerequisites

- A Railway account (free tier is fine)
- Your GitHub account connected to Railway
- Access to your DNS provider (Cloudflare, Namecheap, etc.) for `learningpacer.org`

---

## Step-by-Step Instructions

### Step 1: Add n8n Service to Your Railway Project

1. **Go to your Railway project** (the one with "Postgres" and "elearn-pacer-hkust")
2. **Click the "+" button** (top left) or **"New"** button
3. **Select "GitHub Repo"**
4. **Choose your repository:** `elearn-pacer-hkust`
5. Railway will ask: **"Configure Service"**
   - **Root Directory:** Type `deploy/n8n` (this tells Railway where the Dockerfile is)
   - **Service Name:** Railway will auto-name it, or you can rename it to `n8n`
6. **Click "Deploy"**

Railway will now:
- Detect the Dockerfile in `deploy/n8n/`
- Build and deploy n8n
- Give you a temporary URL like `n8n-production.up.railway.app`

**Wait 2-3 minutes** for the first deployment to complete. You'll see "Deployment successful" when it's done.

---

### Step 2: Connect n8n to PostgreSQL

Now we need to tell n8n to use your Postgres database.

1. **Click on your n8n service** in the Railway dashboard (left sidebar)
2. **Go to the "Variables" tab** (top menu)
3. **Click "+ New Variable"** for each of these:

   **Variable 1:**
   - **Name:** `N8N_HOST`
   - **Value:** `n8n.learningpacer.org`
   - Click **"Add"**

   **Variable 2:**
   - **Name:** `N8N_PORT`
   - **Value:** `5678`
   - Click **"Add"**

   **Variable 3:**
   - **Name:** `N8N_PROTOCOL`
   - **Value:** `https`
   - Click **"Add"**

   **Variable 4:**
   - **Name:** `N8N_CORS_ORIGIN`
   - **Value:** `*`
   - Click **"Add"**

   **Variable 5:**
   - **Name:** `DB_TYPE`
   - **Value:** `postgresdb`
   - Click **"Add"**

   **Variable 6:**
   - **Name:** `DB_POSTGRESDB_HOST`
   - **Value:** `{{PostgreSQL.HOSTNAME}}`
   - Click **"Add"**
   - **Note:** Railway will automatically replace `{{PostgreSQL.HOSTNAME}}` with the actual database hostname

   **Variable 7:**
   - **Name:** `DB_POSTGRESDB_PORT`
   - **Value:** `{{PostgreSQL.PORT}}`
   - Click **"Add"**

   **Variable 8:**
   - **Name:** `DB_POSTGRESDB_DATABASE`
   - **Value:** `{{PostgreSQL.DATABASE}}`
   - Click **"Add"**

   **Variable 9:**
   - **Name:** `DB_POSTGRESDB_USER`
   - **Value:** `{{PostgreSQL.USER}}`
   - Click **"Add"**

   **Variable 10:**
   - **Name:** `DB_POSTGRESDB_PASSWORD`
   - **Value:** `{{PostgreSQL.PASSWORD}}`
   - Click **"Add"**

4. **Railway will automatically redeploy** your service with the new variables (you'll see "Redeploying..." in the top right)

**Wait 1-2 minutes** for the redeployment to complete.

---

### Step 3: Set Up Your Custom Domain

1. **Still in your n8n service**, go to the **"Settings"** tab (top menu)
2. **Scroll down to "Networking"** section
3. **Find "Custom Domain"**
4. **Click "Add Custom Domain"**
5. **Enter:** `n8n.learningpacer.org`
6. **Click "Add"**

Railway will show you DNS instructions. **Don't close this page yet!**

---

### Step 4: Update Your DNS Records

Railway will show you something like:

```
Add a CNAME record:
Name: n8n
Value: n8n-production.up.railway.app
```

**Do this:**

1. **Go to your DNS provider** (Cloudflare, Namecheap, etc.)
2. **Find your domain:** `learningpacer.org`
3. **Add a new CNAME record:**
   - **Name/Host:** `n8n` (or `n8n.learningpacer.org` depending on your provider)
   - **Value/Target:** Copy the Railway domain from Step 3 (e.g., `n8n-production.up.railway.app`)
   - **TTL:** `Auto` or `3600`
   - **Proxy:** **Turn OFF** (grey cloud in Cloudflare) - Railway handles SSL
4. **Save** the DNS record

**Wait 5-10 minutes** for DNS to propagate. You can check if it's ready by visiting `https://n8n.learningpacer.org` - if you see the n8n login page, it's working!

---

### Step 5: Access n8n and Set Up Account

1. **Visit:** `https://n8n.learningpacer.org`
2. **You'll see the n8n setup page** (first time only)
3. **Create your admin account:**
   - Enter your email
   - Create a password
   - Click "Create Account"
4. **You're now logged into n8n!**

---

### Step 6: Import Your Workflows

Now we need to copy your workflows from your local n8n to Railway n8n.

#### Export from Local n8n:

1. **Open your local n8n** (running on Docker Desktop)
   - Usually: `http://localhost:5678`
2. **For each workflow** you want to migrate:
   - Click on the workflow
   - Click the **"..."** menu (top right)
   - Click **"Download"** or **"Export"**
   - Save the JSON file (e.g., `chat-quick.json`)

#### Import to Railway n8n:

1. **Go to Railway n8n:** `https://n8n.learningpacer.org`
2. **Click "Add Workflow"** (top right)
3. **Click "Import from File"**
4. **Select your JSON file** (from step above)
5. **Click "Import"**
6. **Repeat** for all workflows:
   - `CHAT_QUICK`
   - `CHAT_RESEARCH`
   - `EXAM_GENERATOR` (optional - you're using webhook-test for debugging)

#### Re-enter Credentials:

After importing, you need to reconnect your API keys:

1. **Click on each workflow**
2. **For nodes that use APIs** (DeepSeek, Supabase, Google Drive, PDFShift):
   - Click on the node
   - Click **"Credential"** dropdown
   - Click **"Create New Credential"**
   - Enter your API keys/secrets
   - Click **"Save"**
3. **Activate workflows:**
   - Toggle the **green switch** at the top (next to workflow name)
   - **Activate:** `CHAT_QUICK` and `CHAT_RESEARCH`
   - **Don't activate:** `EXAM_GENERATOR` (you're debugging it locally)

---

### Step 7: Test Everything

1. **Test from your website:**
   - Try using Chat Mode
   - Verify webhooks are working
2. **Turn off your local computer**
3. **Test from your phone:**
   - Visit your website
   - Try Chat Mode again
   - **It should still work!** 🎉

---

## Troubleshooting

### n8n won't start / shows errors

1. **Check Railway logs:**
   - Click on n8n service → **"Deployments"** tab
   - Click the latest deployment
   - Click **"View Logs"**
   - Look for error messages (usually red text)

2. **Common issues:**
   - **Database connection failed:** Check that all `{{PostgreSQL.*}}` variables are set correctly
   - **Port conflicts:** Make sure `N8N_PORT=5678` is set
   - **Missing variables:** Verify all 10 environment variables are added

### Domain not working

1. **Check DNS propagation:**
   - Visit `https://n8n.learningpacer.org`
   - If you see "Site can't be reached" → DNS hasn't propagated yet (wait 10-15 minutes)
   - If you see Railway error → DNS is working, check Railway domain settings

2. **Verify DNS record:**
   - Go to your DNS provider
   - Make sure CNAME record exists and points to Railway domain
   - Make sure proxy is **OFF** (grey cloud in Cloudflare)

### Workflows not receiving webhooks

1. **Check workflow is activated:**
   - Green toggle switch should be ON
2. **Verify webhook URL:**
   - In your workflow, click the webhook node
   - Check the URL matches: `https://n8n.learningpacer.org/webhook/...`
3. **Check Railway service status:**
   - Should show "Online" (green dot)

---

## What Changed?

**Before:** n8n ran on your local computer → When computer off, webhooks die ❌

**After:** n8n runs on Railway → Always online, 24/7 ✅

**Your website code stays the same** - the webhook URLs in `src/constants/api.ts` don't need to change because they still point to `n8n.learningpacer.org`, which now points to Railway instead of your local IP.

---

## Cost

**Free Tier:**
- 500 hours/month of compute time
- $5 credit/month
- Enough for small n8n instance running 24/7

**If you exceed free tier:** ~$0.33/month (very cheap!)

---

## Need Help?

- **Railway Docs:** https://docs.railway.app
- **n8n Docs:** https://docs.n8n.io
- **Check Railway logs** for error messages
