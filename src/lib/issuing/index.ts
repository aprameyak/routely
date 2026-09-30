import Stripe from "stripe";
import { issueSimulatedCard, type IssuedCardMaterial, panLast4, panPrefix } from "./material";

function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export function issuingMode(): "stripe" | "simulated" {
  return process.env.STRIPE_SECRET_KEY && process.env.ISSUING_PROVIDER === "stripe"
    ? "stripe"
    : "simulated";
}

export async function issueProxyCardMaterial(input: {
  userId: string;
  email: string;
  name: string;
}): Promise<IssuedCardMaterial> {
  if (issuingMode() !== "stripe") {
    return issueSimulatedCard();
  }

  const stripe = stripeClient();
  if (!stripe) return issueSimulatedCard();

  const cardholder = await stripe.issuing.cardholders.create({
    name: input.name,
    email: input.email,
    status: "active",
    type: "individual",
    billing: {
      address: {
        line1: "510 Townsend St",
        city: "San Francisco",
        state: "CA",
        country: "US",
        postal_code: "94103",
      },
    },
    metadata: { routelyUserId: input.userId },
  });

  const card = await stripe.issuing.cards.create({
    cardholder: cardholder.id,
    currency: "usd",
    type: "virtual",
    status: "active",
    metadata: { routelyUserId: input.userId },
  });

  return {
    pan: "",
    cvc: "",
    expMonth: card.exp_month,
    expYear: card.exp_year,
    last4: card.last4 ?? "0000",
    prefix: "**** **",
    network: "visa",
    provider: "stripe",
    stripeCardId: card.id,
    stripeCardholderId: cardholder.id,
  };
}

export { panLast4, panPrefix };
