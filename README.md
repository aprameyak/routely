# Routely

Stop guessing which credit card to use.

At the register (or checkout tab), open Routely, type the merchant, and get the exact card to pull — based on your rewards and custom rules.

## The real problem

You have 3–6 cards with different category bonuses. Every purchase is a tiny decision tax. Routely removes it.

## How to use it

1. Add your cards + reward rates (`My cards`)
2. Optionally add rules (“always Amex for dining”)
3. Open **Which card?** → type merchant → pull that card

## Quick start

```bash
cp .env.example .env
openssl rand -hex 32
npm install
npm run db:setup
npm run dev
```

http://localhost:3000 — demo: `demo@routely.app` / `DemoPass123!`

## Docker

```bash
export ENCRYPTION_KEY=$(openssl rand -hex 32)
export AUTH_SECRET=$(openssl rand -hex 32)
docker compose up --build
```

## Stack

Next.js · Prisma · AES-256-GCM vault · bcrypt sessions · merchant catalog · rewards router
