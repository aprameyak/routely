# Routely

One proxy card. Each charge routes to the funding card that fits the purchase (rewards, caps, rules).

## Status

| Area | Notes |
|---|---|
| Proxy over multiple cards | One Routely card in front of the vault |
| Reward routing | Scores categories and caps |
| Custom rules | Force / prefer / exclude |
| App security | Encrypted secrets, sessions, audits, rate limits |
| Apple / Google Pay | UX + provisioning state; live NFC needs an issuer or Stripe Issuing |
| Checkout | Pay with Routely; routing is automatic |

## Quick start

```bash
cp .env.example .env
npm install
npm run db:setup
npm run dev
```

Seed account (local only): `demo@routely.app` / `DemoPass123!`

Simulate a tap with **Tap to pay** on `/wallet`.

Optional Stripe Issuing:

```
ISSUING_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_test_...
```

## Limits

Live Apple Pay over a network BIN needs a licensed issuer. This repo includes the product UI plus simulated issuing, and a Stripe Issuing adapter for a real path.

## License

MIT
