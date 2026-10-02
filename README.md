# Routely

Intelligent credit-card proxy that routes each purchase to the right card.

One proxy card. Every charge routes to the right funding card.

## Spec coverage

| Requirement | Status |
|---|---|
| Intelligent proxy over multiple cards | Yes — one Routely card fronts the vault |
| Maximize rewards by scenario | Yes — router scores categories + caps |
| Custom rules | Yes — force / prefer / exclude |
| Safe / prod-ready patterns | Yes — encrypted secrets, sessions, audits, rate limits |
| Digital wallet (Apple / Google) | UX + provisioning state; live NFC needs issuing bank / Stripe Issuing |
| Abstract choosing at checkout | Yes — pay with Routely; routing is automatic |

## Quick start

```bash
cp .env.example .env
npm install
npm run db:setup
npm run dev
```

**Local seed account:** `demo@routely.app` / `DemoPass123!` → **Proxy card** wallet.

Simulate a wallet tap with “Tap to pay” on `/wallet`.

### Stripe Issuing (optional)

```bash
ISSUING_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_test_...
```

Then re-issue by deleting the proxy row or creating a new user.

## Honest limit

Apple Pay NFC over a live network BIN requires a licensed issuer. This repo is the full product + simulated issuing, with a Stripe Issuing adapter for the production path.

## License

MIT
