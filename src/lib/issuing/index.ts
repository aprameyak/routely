import Stripe from "stripe";
import { issueSimulatedCard, type IssuedCardMaterial } from "./material";

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
  billingAddress?: Stripe.Issuing.CardholderCreateParams.Billing.Address;
}): Promise<IssuedCardMaterial> {
  if (issuingMode() !== "stripe") {
    return issueSimulatedCard();
  }

  const stripe = stripeClient();
  if (!stripe) return issueSimulatedCard();

  if (!input.billingAddress) {
    throw new Error("A billing address is required to issue a Stripe Issuing card");
  }

  const cardholder = await stripe.issuing.cardholders.create({
    name: input.name,
    email: input.email,
    status: "active",
    type: "individual",
    billing: {
      address: input.billingAddress,
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

