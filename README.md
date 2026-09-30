# Routely

Intelligent credit-card proxy that picks the right card for every purchase — maximize rewards by default, override with your own rules.

## Quick start

```bash
cp .env.example .env
# Production: openssl rand -hex 32  → ENCRYPTION_KEY
#             openssl rand -hex 32  → AUTH_SECRET

npm install
npm run db:setup
npm run dev
```

Open http://localhost:3000

**Demo:** `demo@routely.app` / `DemoPass123!`

```bash
npm test          # router unit tests
npm run build     # production build
npm run typecheck
```

## What ships

| Capability | Details |
|---|---|
| Proxy card | Single virtual credential; freeze / revoke |
| Default routing | Category multipliers, monthly bonus caps, utilization penalties, credit limits |
| Custom rules | Force / prefer / exclude by category, merchant, amount, channel — priority ordered |
| Lifecycle | Authorize → settle → reverse (restores balance) |
| Idempotency | Optional key on `/api/route` prevents double charges |
| Security | AES-256-GCM token vault, bcrypt, HttpOnly JWT sessions, rate limits, CSP headers, audit log |
| Account | Profile, password rotate (kills sessions), delete vault, audit viewer |

## Architecture

```
Merchant sees Routely Proxy
        │
        ▼
   POST /api/route
        │
        ├─ custom rules (force / exclude / prefer)
        ├─ score cards by expected rewards (+ caps)
        └─ authorize underlying tokenized card
```

Core engine: `src/lib/router.ts` (pure, fully unit-tested).

## Docker

```bash
export ENCRYPTION_KEY=$(openssl rand -hex 32)
export AUTH_SECRET=$(openssl rand -hex 32)
docker compose up --build
```

## API

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create vault + proxy |
| POST | `/api/auth/login` | Sign in (rate limited) |
| GET/POST | `/api/cards` | List / add |
| PATCH/DELETE | `/api/cards/:id` | Edit / remove |
| GET/POST | `/api/rules` | List / add rules |
| GET/PATCH | `/api/proxy` | Proxy status |
| POST | `/api/route` | Preview or authorize (`dryRun`, `autoSettle`, `idempotencyKey`) |
| GET | `/api/transactions` | Activity |
| PATCH | `/api/transactions/:id` | `{ action: "settle" \| "reverse" }` |
| GET/PATCH/DELETE | `/api/account` | Profile / password / delete |
| GET | `/api/audit` | Audit trail |
| GET | `/api/health` | Liveness + DB ping |

## Production checklist

1. Rotate `ENCRYPTION_KEY` and `AUTH_SECRET` (never ship the demo values)
2. Point `DATABASE_URL` at managed Postgres (change Prisma `provider` to `postgresql`)
3. Terminate TLS at your edge; cookies already set `Secure` in production
4. Replace in-memory rate limiter with Redis for multi-instance
5. Swap simulated payment tokens for Stripe Issuing / network tokenization
6. Run `npm test && npm run build` in CI

## License

Private product prototype.
