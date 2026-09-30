# Routely

Intelligent credit-card proxy that picks the right card for every purchase.

## Quick start

```bash
cp .env.example .env
openssl rand -hex 32
npm install
npm run db:setup
npm run dev
```

Open http://localhost:3000

Local demo (dev only): `demo@routely.app` / `DemoPass123!`

```bash
npm test
npm run build
```

## Docker (production)

```bash
export ENCRYPTION_KEY=$(openssl rand -hex 32)
export AUTH_SECRET=$(openssl rand -hex 32)
docker compose up --build
```

Runtime secrets must be injected — the image does not ship usable vault keys.

Set `TRUST_PROXY=1` only behind a reverse proxy that strips client-supplied `X-Forwarded-For`.

## Stack

Next.js · Prisma/SQLite · AES-256-GCM token vault · bcrypt · JWT sessions · Zod

## API

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create vault |
| POST | `/api/auth/login` | Sign in |
| GET/POST | `/api/cards` | Cards |
| GET/POST | `/api/rules` | Rules |
| GET/PATCH | `/api/proxy` | Proxy status |
| POST | `/api/route` | Preview or authorize |
| GET | `/api/transactions` | Activity |
| PATCH | `/api/transactions/:id` | Settle / reverse |
| GET/PATCH/DELETE | `/api/account` | Account |
| GET | `/api/health` | Health |

## Production checklist

1. Unique `ENCRYPTION_KEY` and `AUTH_SECRET` (never Dockerfile/build placeholders)
2. Managed Postgres for multi-instance (swap Prisma provider)
3. TLS at the edge; set `TRUST_PROXY=1` only then
4. Do not run `db:seed` in production unless `ALLOW_SEED=1`
5. Swap simulated tokens for Stripe Issuing / network tokenization for real cards
