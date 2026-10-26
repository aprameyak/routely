import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cardholdersCreate = vi.fn();
const cardsCreate = vi.fn();
vi.mock("stripe", () => ({
  default: class {
    issuing = {
      cardholders: { create: cardholdersCreate },
      cards: { create: cardsCreate },
    };
  },
}));

import { issueProxyCardMaterial } from "./index";

describe("issueProxyCardMaterial (stripe)", () => {
  beforeEach(() => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_x");
    vi.stubEnv("ISSUING_PROVIDER", "stripe");
    cardholdersCreate.mockReset().mockResolvedValue({ id: "ich_1" });
    cardsCreate.mockReset().mockResolvedValue({ id: "ic_1", exp_month: 1, exp_year: 2030, last4: "4242" });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });
  it("rejects when no billing address is provided", async () => {
    await expect(issueProxyCardMaterial({ userId: "u1", email: "a@b.c", name: "A" })).rejects.toThrow(/billing address/);
    expect(cardholdersCreate).not.toHaveBeenCalled();
  });
  it("uses the provided billing address", async () => {
    const address = { line1: "1 Main St", city: "Austin", state: "TX", country: "US", postal_code: "78701" };
    const m = await issueProxyCardMaterial({ userId: "u1", email: "a@b.c", name: "A", billingAddress: address });
    expect(cardholdersCreate.mock.calls[0][0].billing.address).toEqual(address);
    expect(m.stripeCardId).toBe("ic_1");
  });
});
