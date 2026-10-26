# Routely

Routely gives you one proxy card and decides, for each charge, which of your real credit cards should pay for it. It picks the card based on reward rates, monthly bonus caps, credit utilization, and rules you write yourself.

This is a prototype. By default the proxy card is simulated: no real card is issued and no real money moves. See [Issuing modes](#issuing-modes).

## Features

- Add funding cards (nickname, brand, last 4 digits, credit limit, reward rates per category with optional monthly caps, rotating categories, and date windows). Full card numbers are never stored.
- Write rules that force, prefer, or exclude a card based on category, merchant, amount range, day of week, or online vs in-store.
- Ask which card to use at a merchant (`/decide`) and see each card's multiplier, estimated rewards, and score.
- Run test charges through the proxy card (`/pay`) and get a transaction history with the routing reason for each charge.
- Freeze or revoke the proxy card, reveal its simulated number and CVC, and mark it as added to Apple or Google Wallet.
- Audit log of account actions, and idempotency keys on payment requests.

## Tech stack

- Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- Prisma with SQLite
- `jose` JWT sessions, `bcryptjs` password hashing, AES-256-GCM for stored secrets
- Optional Stripe Issuing through the `stripe` SDK
- Vitest, ESLint

## Getting started

Prerequisites: Node.js 20 or newer (CI and the Docker image use Node 22).

```bash
cp .env.example .env
npm install
npm run db:setup   # prisma db push + seed
npm run dev
```

Open http://localhost:3000. The seed creates a demo account: `demo@routely.app` / `DemoPass123!`.

Environment variables (see `.env.example`):

- `DATABASE_URL`: SQLite file path
- `ENCRYPTION_KEY`: 64 hex characters, generate with `openssl rand -hex 32`
- `AUTH_SECRET`: session signing secret, 32+ characters in production
- `TRUST_PROXY`: set to `1` to read client IPs from proxy headers
- `ISSUING_PROVIDER`: `simulated` (default) or `stripe`
- `STRIPE_SECRET_KEY`: only used when `ISSUING_PROVIDER=stripe`
- `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_URL`

The placeholder values in `.env.example` are fine for local development. In production, `src/lib/env.ts` refuses to start with them.

Checks:

```bash
npm run lint
npm test
npm run typecheck
npm run build
```

### Docker

```bash
ENCRYPTION_KEY=$(openssl rand -hex 32) AUTH_SECRET=$(openssl rand -hex 32) docker compose up --build
```

The SQLite database is kept in the `routely-data` volume. `/api/health` is used as the container health check.

## Usage

The web UI covers everything: add cards at `/cards`, write rules at `/rules`, ask for a recommendation at `/decide`, and run test charges at `/pay`. The same actions are available over the JSON API with a session cookie. Against the seeded demo account:

```bash
# log in and save the session cookie
curl -c cookies.txt -H 'Content-Type: application/json' \
  -d '{"email":"demo@routely.app","password":"DemoPass123!"}' \
  http://localhost:3000/api/auth/login

# which card should pay for a $85 grocery run?
curl -b cookies.txt -H 'Content-Type: application/json' \
  -d '{"merchant":"Whole Foods","amountCents":8500}' \
  http://localhost:3000/api/recommend

# route a charge through the proxy card without recording it
curl -b cookies.txt -H 'Content-Type: application/json' \
  -d '{"merchant":"Shell","amountCents":4200,"dryRun":true}' \
  http://localhost:3000/api/route
```

Both endpoints return the selected card and the reason it was picked. `/api/recommend` also lists the runners-up, and `/api/route` returns a score for every card it considered.

## Issuing modes

- `simulated` (default): `src/lib/issuing/material.ts` generates a test card number and CVC, which are stored encrypted. "Add to Wallet" only records the wallet status in the database. It does not add anything to a real Apple or Google wallet.
- `stripe`: used only when `ISSUING_PROVIDER=stripe` and `STRIPE_SECRET_KEY` are both set. `src/lib/issuing/index.ts` creates a Stripe Issuing cardholder and a virtual card. Stripe requires a billing address for the cardholder, and the app does not collect one yet, so issuing a card in this mode will fail until that is added.

Using a card in real Apple Pay or Google Pay needs a licensed issuer, which this repo does not include.

## How it works

- `src/lib/router.ts` holds the routing logic. `routePayment` drops inactive or expired cards, applies exclude rules, then force rules in priority order. If no force rule matches, it scores each remaining card by estimated rewards. When a purchase goes past a bonus cap, the multiplier is blended with the base rate. The score is then lowered for cards at 70% or 90% utilization and raised for cards matched by a prefer rule. Cards that would go over their credit limit are skipped.
- `src/lib/merchants.ts` maps merchant names and aliases to a category and MCC.
- `src/lib/payments.ts` authorizes charges: it looks up this month's spend per card and category, runs the router, records the transaction, and handles idempotency keys.
- `src/lib/recommend.ts` powers the "which card should I use" flow without recording a charge.
- `src/lib/proxy.ts` creates, freezes, and reveals the proxy card.
- API routes are in `src/app/api/` (`auth`, `cards`, `rules`, `route`, `recommend`, `proxy`, `transactions`, `audit`, `account`, `health`). Pages are in `src/app/(app)/` and `src/app/(auth)/`, and `src/middleware.ts` sends logged-out users to `/login`.
- The data model is in `prisma/schema.prisma`, and demo data comes from `prisma/seed.ts`.

Tests for the router, merchant matching, and issuing live in `src/lib/__tests__/` and `src/lib/issuing/`.

## Card optimizer

`optimizer/` holds a separate Next.js app (formerly credit-card-arsenal) that recommends which card to use per spending category, based on a wallet stored in the browser. It is not part of the Routely app and has its own `package.json`. Run it with `cd optimizer && npm install && npm run dev`.

## Contributing

Issues and pull requests are welcome. Before opening a PR, run `npm run lint`, `npm test`, and `npm run typecheck`. CI runs those three checks and `npm run build`.

## License

MIT, see [LICENSE](LICENSE).
