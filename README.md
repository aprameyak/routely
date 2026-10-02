# Routely

Proxy card that routes each charge to the right funding card (rewards, caps, rules).

```bash
cp .env.example .env
npm install
npm run db:setup
npm run dev
```

Seed (local): `demo@routely.app` / `DemoPass123!`

Optional Stripe Issuing: `ISSUING_PROVIDER=stripe` + `STRIPE_SECRET_KEY`.

Live Apple/Google Pay needs a licensed issuer. This repo includes simulated issuing plus a Stripe adapter.

## License

MIT
