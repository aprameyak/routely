import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "crypto";
import { env } from "./env";
const ALGO = "aes-256-gcm";
function getKey(): Buffer {
    const hex = env.ENCRYPTION_KEY;
    if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
        throw new Error("ENCRYPTION_KEY must be a 64-character hex string (32 bytes)");
    }
    return Buffer.from(hex, "hex");
}
export type EncryptedPayload = {
    cipher: string;
    iv: string;
    tag: string;
};
export function encrypt(plaintext: string): EncryptedPayload {
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGO, getKey(), iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
        cipher: encrypted.toString("base64"),
        iv: iv.toString("base64"),
        tag: tag.toString("base64"),
    };
}
export function decrypt(payload: EncryptedPayload): string {
    const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(payload.iv, "base64"));
    decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(payload.cipher, "base64")),
        decipher.final(),
    ]);
    return decrypted.toString("utf8");
}
export function hashIdentifier(value: string): string {
    return createHash("sha256").update(value).digest("hex");
}
export function safeEqual(a: string, b: string): boolean {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ba.length !== bb.length)
        return false;
    return timingSafeEqual(ba, bb);
}
export function generateVirtualLast4(): string {
    return String(Math.floor(1000 + Math.random() * 9000));
}
export function createPaymentToken(brand: string, last4: string): string {
    const nonce = randomBytes(16).toString("hex");
    return `tok_${brand}_${last4}_${nonce}`;
}
