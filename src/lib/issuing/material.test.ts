import { describe, expect, it } from "vitest";
import {
  formatPanDisplay,
  generateTestVisaPan,
  issueSimulatedCard,
  panLast4,
  panPrefix,
} from "./material";

function luhnValid(pan: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = pan.length - 1; i >= 0; i--) {
    let n = Number(pan[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

describe("issuing material", () => {
  it("generates Luhn-valid Visa test PANs", () => {
    for (let i = 0; i < 20; i++) {
      const pan = generateTestVisaPan();
      expect(pan).toMatch(/^400000\d{10}$/);
      expect(luhnValid(pan)).toBe(true);
    }
  });

  it("builds display fields", () => {
    const pan = "4000000000009012";
    expect(panLast4(pan)).toBe("9012");
    expect(panPrefix(pan)).toBe("4000 00");
    expect(formatPanDisplay(pan)).toBe("4000 0000 0000 9012");
  });

  it("issues simulated card material", () => {
    const card = issueSimulatedCard();
    expect(card.provider).toBe("simulated");
    expect(card.network).toBe("visa");
    expect(card.last4).toHaveLength(4);
    expect(card.cvc).toMatch(/^\d{3}$/);
    expect(luhnValid(card.pan)).toBe(true);
  });
});
