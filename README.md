# Routely

Stop guessing which credit card to use at checkout.

## What problem this solves

You hold multiple cards with different bonuses. Every purchase is a decision. Routely removes that tax:

1. Open Routely on your phone (add to Home Screen)
2. Tap a category or type the store
3. Pull the card it names

It does **not** replace your physical cards with a bank-issued proxy (that needs an issuing partner). It solves the real everyday problem: **knowing which card to pull**.

## Quick start

```bash
cp .env.example .env
npm install
npm run db:setup
npm run dev
```

Demo: `demo@routely.app` / `DemoPass123!`

Deep link example: `/decide?merchant=Shell` or `/decide?category=dining`

## Docker

```bash
export ENCRYPTION_KEY=$(openssl rand -hex 32)
export AUTH_SECRET=$(openssl rand -hex 32)
docker compose up --build
```
