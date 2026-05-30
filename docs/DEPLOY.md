# Deploying PromoProof securely (self-hosted, e.g. Oracle Cloud)

PromoProof holds the operator/party **private keys server-side**, so the host is the trust boundary.
This runbook hardens a self-hosted deployment. The app layer (per-route guard, rate limit, security
headers, `server-only`) is already built; the items below are the host/proxy layer you run on the box.

## Threat model in one line
Even a full host compromise must not move real value: keys are server-only, the **no-drain** design
means the agent can't move funds, and the public deploy runs on a **dedicated low-balance testnet
account** — so blast radius is minimal. These steps make a compromise unlikely in the first place.

## 1. Use a dedicated, low-balance operator account
Create a *separate* testnet account for the public deployment with just enough HBAR for fees. Never put
the account you use elsewhere on an internet-facing box. This caps the worst case to fee-griefing.

## 2. App user + build (never root)
```bash
sudo adduser --system --group promoproof
sudo -u promoproof bash
git clone <repo> /home/promoproof/app && cd /home/promoproof/app
pnpm install --frozen-lockfile && pnpm build
```

## 3. Environment file (secrets), locked down
Create `/home/promoproof/app/.env.production` (NOT in the repo), `chmod 600`, owned by `promoproof`:
```
PUBLIC_READONLY=1
OPERATOR_ACCESS_TOKEN=<long-random>          # openssl rand -hex 32
DOSSIER_ENC_KEY=<long-random>                # openssl rand -hex 32
IMAGE_FP_KEY=<long-random>
HEDERA_ACCOUNT_ID=0.0.xxxxx                   # the DEDICATED account
HEDERA_PRIVATE_KEY=...
LLM_PROVIDER=google
GOOGLE_GENERATIVE_AI_API_KEY=...
HCS_TOPIC_ID=... PUSDC_TOKEN_ID=... BRAND_TREASURY_ID=... RETAILER_ACCOUNT_ID=...
BRAND_APPROVER_KEY=... RETAILER_KEY=... PROMO_ESCROW_ID=... HTS_RECEIPT_NFT_TOKEN_ID=...
NODE_ENV=production
```
`PUBLIC_READONLY=1` is what makes anonymous visitors read-only; the live agent + mutating routes then
require `OPERATOR_ACCESS_TOKEN`.

## 4. Run under systemd (auto-restart, non-root)
`/etc/systemd/system/promoproof.service`:
```ini
[Service]
User=promoproof
WorkingDirectory=/home/promoproof/app
EnvironmentFile=/home/promoproof/app/.env.production
ExecStart=/usr/bin/pnpm start          # next start, binds 127.0.0.1:3000
Restart=always
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=/tmp                     # dossier/upload store
[Install]
WantedBy=multi-user.target
```
Bind Next to localhost only (so it's reachable solely via the proxy): `ExecStart=/usr/bin/pnpm start -- -H 127.0.0.1`.

## 5. nginx reverse proxy — the real boundary (TLS + rate limit + size cap + optional password)
```nginx
limit_req_zone $binary_remote_addr zone=pp:10m rate=10r/s;
server {
  listen 443 ssl http2;
  server_name promoproof.example;
  ssl_certificate     /etc/letsencrypt/live/promoproof.example/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/promoproof.example/privkey.pem;
  client_max_body_size 8m;                 # cap uploads (app cap is 6MB)
  location / {
    limit_req zone=pp burst=20 nodelay;
    # Optional outer gate: uncomment to password-protect the WHOLE site for judges.
    # auth_basic "PromoProof"; auth_basic_user_file /etc/nginx/.htpasswd;
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Host $host;       # the guard's same-origin check uses this
    proxy_set_header X-Forwarded-For $remote_addr; # the rate limiter keys on this
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
server { listen 80; server_name promoproof.example; return 301 https://$host$request_uri; }
```
TLS: `sudo certbot --nginx -d promoproof.example`.

## 6. Firewall + SSH
```bash
sudo ufw default deny incoming && sudo ufw allow 22 && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw enable
```
Also set Oracle Cloud's VCN security list to match (only 22/80/443). SSH: key-only auth, no root login,
no passwords (`/etc/ssh/sshd_config`: `PasswordAuthentication no`, `PermitRootLogin no`); consider
`fail2ban`. Restrict 22 to your IP if you have a static one.

## 7. Patch + maintain
- Keep Next on the latest 16.x (2025–26 had critical RSC/middleware CVEs — patch promptly).
- `unattended-upgrades` for the OS. Rotate `OPERATOR_ACCESS_TOKEN` / keys periodically.
- After deploy, verify the console renders, then **flip CSP from Report-Only to enforced** in
  `next.config.ts` (`Content-Security-Policy-Report-Only` → `Content-Security-Policy`) and rebuild.

## 8. Smoke-test the gate (from your laptop)
```bash
curl -I https://promoproof.example                                   # 200 + security headers
curl -s -X POST https://promoproof.example/api/dispute -d '{}'        # 403 (no token)
curl -s -X POST https://promoproof.example/api/dispute -H "x-operator-token: $TOKEN" -d '{}'  # passes the gate
curl -s https://promoproof.example/api/audit                         # 200 (read-only, public)
```
