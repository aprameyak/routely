import { createHash, randomInt } from "crypto";
import { encrypt, decrypt, type EncryptedPayload } from "../crypto";

function luhnCheckDigit(partial: string): number {
  let sum = 0;
  let alt = true;
  for (let i = partial.length - 1; i >= 0; i--) {
    let n = Number(partial[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return (10 - (sum % 10)) % 10;
}

export function generateTestVisaPan(): string {
  const bin = "400000";
  let body = bin;
  while (body.length < 15) {
    body += String(randomInt(0, 10));
  }
  return body + String(luhnCheckDigit(body));
}

export function generateCvc(): string {
  return String(randomInt(100, 1000));
}

export function formatPanDisplay(pan: string): string {
  return pan.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

export function panLast4(pan: string): string {
  return pan.slice(-4);
}

export function panPrefix(pan: string): string {
  return `${pan.slice(0, 4)} ${pan.slice(4, 6)}`;
}

export function encryptSecret(value: string): EncryptedPayload {
  return encrypt(value);
}

export function decryptSecret(payload: EncryptedPayload): string {
  return decrypt(payload);
}

export function fingerprintPan(pan: string): string {
  return createHash("sha256").update(pan).digest("hex").slice(0, 16);
}

export type IssuedCardMaterial = {
  pan: string;
  cvc: string;
  expMonth: number;
  expYear: number;
  last4: string;
  prefix: string;
  network: "visa";
  provider: "simulated" | "stripe";
  stripeCardId?: string;
  stripeCardholderId?: string;
};

export function issueSimulatedCard(): IssuedCardMaterial {
  const pan = generateTestVisaPan();
  const now = new Date();
  return {
    pan,
    cvc: generateCvc(),
    expMonth: 12,
    expYear: now.getFullYear() + 4,
    last4: panLast4(pan),
    prefix: panPrefix(pan),
    network: "visa",
    provider: "simulated",
  };
}
