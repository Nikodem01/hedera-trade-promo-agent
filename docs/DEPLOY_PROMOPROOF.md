# Deploy → promoproof.liftbyai.com (your Oracle box)

Same server as liftbyai: **Oracle Cloud, Ubuntu 24.04, `140.238.202.68`, Nginx**, SSH `ubuntu@…` with
key `oracle_amd`. liftbyai is static; **PromoProof is a Next.js Node app**, so it runs as a service and
nginx reverse-proxies the subdomain — exactly like `n8n.liftbyai.com`.

Because the box is 1 GB and already runs n8n, we **build locally and ship the standalone bundle** (no
build on the server). The local build (`pnpm build`) produced `.next/standalone/` (server.js + minimal
deps + the traced fixtures).

> **Secrets:** `.env.production` (gitignored) already holds your app keys + freshly-generated
> `OPERATOR_ACCESS_TOKEN` / `DOSSIER_ENC_KEY` / `IMAGE_FP_KEY` and `PUBLIC_READONLY=1`. Read the operator
> token from that file locally when you need to unlock live mode in the browser. Never paste it anywhere.

Run everything below **from WSL** (where the build + key live). Commands are copy-paste.

---

### 0. (Optional, for the submission repo) merge PRs to `main`
The deploy uses the *local build*, so this isn't required to go live — but for a clean repo for judges,
merge PR #1 then PR #2 into `main` (your call). 

### 1. DNS — add the subdomain (you, ~2 min + propagation)
Wherever `liftbyai.com` DNS is managed, add an **A record**:
`promoproof.liftbyai.com → 140.238.202.68`.
- If that DNS is on **Cloudflare proxied (orange cloud)**, TLS is handled by Cloudflare → you can skip
  certbot (step 6) and make nginx listen on `:80`. Tell me and I'll give you the HTTP-only block.
- Otherwise (default below) we issue a Let's Encrypt cert with certbot.

### 2. One-time: copy your SSH key into WSL with safe perms
```bash
mkdir -p ~/.ssh && cp /mnt/c/Users/domin/.ssh/oracle_amd ~/.ssh/oracle_amd && chmod 600 ~/.ssh/oracle_amd
KEY=~/.ssh/oracle_amd; H=ubuntu@140.238.202.68; APP=/var/www/promoproof
```

### 3. One-time: prep the server (Node 20 + app dir)
```bash
ssh -i $KEY $H 'node -v 2>/dev/null | grep -q v20 || (curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs)'
ssh -i $KEY $H "sudo mkdir -p $APP && sudo chown ubuntu:ubuntu $APP"
```

### 4. Build locally + ship the bundle (repeat this on every update)
```bash
cd ~/code/hedera-trade-promo-agent
pnpm build
rsync -az --delete -e "ssh -i $KEY" .next/standalone/ $H:$APP/
rsync -az          -e "ssh -i $KEY" .next/static/  $H:$APP/.next/static/
rsync -az          -e "ssh -i $KEY" public/        $H:$APP/public/
rsync -az          -e "ssh -i $KEY" .env.production $H:$APP/.env.production
ssh -i $KEY $H "chmod 600 $APP/.env.production"
```

### 5. One-time: run it as a service
```bash
ssh -i $KEY $H "sudo tee /etc/systemd/system/promoproof.service >/dev/null" <<'UNIT'
[Unit]
Description=PromoProof (Next.js standalone)
After=network.target
[Service]
Type=simple
User=ubuntu
WorkingDirectory=/var/www/promoproof
EnvironmentFile=/var/www/promoproof/.env.production
Environment=HOSTNAME=127.0.0.1
Environment=PORT=3000
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=3
NoNewPrivileges=true
[Install]
WantedBy=multi-user.target
UNIT
ssh -i $KEY $H "sudo systemctl daemon-reload && sudo systemctl enable --now promoproof && sleep 2 && systemctl is-active promoproof && curl -sf -o /dev/null -w 'local:%{http_code}\n' http://127.0.0.1:3000/api/config"
```
On each redeploy after step 4: `ssh -i $KEY $H "sudo systemctl restart promoproof"`.

### 6. One-time: nginx reverse proxy + TLS
```bash
ssh -i $KEY $H "sudo tee /etc/nginx/sites-available/promoproof >/dev/null" <<'NGINX'
limit_req_zone $binary_remote_addr zone=promoproof:10m rate=10r/s;
server {
    listen 80;
    server_name promoproof.liftbyai.com;
    location / { proxy_pass http://127.0.0.1:3000; proxy_set_header Host $host; }
}
NGINX
ssh -i $KEY $H "sudo ln -sf /etc/nginx/sites-available/promoproof /etc/nginx/sites-enabled/promoproof && sudo nginx -t && sudo systemctl reload nginx"
# TLS (skip if Cloudflare-proxied):
ssh -i $KEY $H "sudo certbot --nginx -d promoproof.liftbyai.com --non-interactive --agree-tos -m dominiak.nikodem@gmail.com --redirect"
```
Certbot rewrites the block to add `:443` + the cert. Then harden it — re-run:
```bash
ssh -i $KEY $H "sudo tee /etc/nginx/sites-available/promoproof >/dev/null" <<'NGINX'
limit_req_zone $binary_remote_addr zone=promoproof:10m rate=10r/s;
server {
    listen 80; server_name promoproof.liftbyai.com; return 301 https://$host$request_uri;
}
server {
    listen 443 ssl http2;
    server_name promoproof.liftbyai.com;
    ssl_certificate     /etc/letsencrypt/live/promoproof.liftbyai.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/promoproof.liftbyai.com/privkey.pem;
    client_max_body_size 8m;
    location / {
        limit_req zone=promoproof burst=20 nodelay;
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_buffering off;                 # flush the live agent stream
        proxy_read_timeout 120s;             # agent runs can take ~60s
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;     # the in-app guard's same-origin check uses this
        proxy_set_header X-Forwarded-For $remote_addr; # the rate limiter keys on this
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX
ssh -i $KEY $H "sudo nginx -t && sudo systemctl reload nginx"
```

### 7. Firewall (one-time, if not already open)
80/443 are already open for liftbyai. Confirm: `ssh -i $KEY $H "sudo ufw status | head"`.

### 8. Verify (from your laptop)
```bash
curl -sI https://promoproof.liftbyai.com | head            # 200 + security headers
curl -s  https://promoproof.liftbyai.com/api/config         # {"publicReadonly":true,...}
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://promoproof.liftbyai.com/api/dispute -d '{}'   # 403 (gated, public)
curl -s -o /dev/null -w "%{http_code}\n" https://promoproof.liftbyai.com/api/audit                     # 200 (public read)
```
Then open it: the public lands in **read-only + scripted** mode. Click **Operator access**, paste the
`OPERATOR_ACCESS_TOKEN` from `.env.production`, and the live agent + on-chain actions unlock for your
session. Record from there (or locally).

### Logs / troubleshooting
```bash
ssh -i $KEY $H "journalctl -u promoproof -n 80 --no-pager"   # app logs
ssh -i $KEY $H "sudo nginx -t"                               # nginx config check
```
If `systemctl is-active promoproof` isn't `active`, the journal will show why (usually a missing env var
or Node version). The dossier store writes to `/tmp` (fine on a long-lived process; cleared on reboot).
