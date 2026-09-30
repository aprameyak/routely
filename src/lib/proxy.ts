import { prisma } from "./db";
import { encrypt, decrypt } from "./crypto";
import { issueProxyCardMaterial, issuingMode } from "./issuing";
import { encryptSecret } from "./issuing/material";

export async function ensureProxyCard(userId: string) {
  const existing = await prisma.proxyCard.findUnique({ where: { userId } });
  if (existing?.panCipher || existing?.stripeCardId) return existing;

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const material = await issueProxyCardMaterial({
    userId,
    email: user.email,
    name: user.name,
  });

  const credential = encrypt(`proxy_${userId}_${crypto.randomUUID()}`);
  const panEnc = material.pan ? encryptSecret(material.pan) : null;
  const cvcEnc = material.cvc ? encryptSecret(material.cvc) : null;

  if (existing) {
    return prisma.proxyCard.update({
      where: { userId },
      data: {
        label: "Routely",
        network: material.network,
        virtualLast4: material.last4,
        virtualPrefix: material.prefix,
        expMonth: material.expMonth,
        expYear: material.expYear,
        issuerProvider: material.provider,
        stripeCardId: material.stripeCardId,
        stripeCardholderId: material.stripeCardholderId,
        panCipher: panEnc?.cipher,
        panIv: panEnc?.iv,
        panTag: panEnc?.tag,
        cvcCipher: cvcEnc?.cipher,
        cvcIv: cvcEnc?.iv,
        cvcTag: cvcEnc?.tag,
        status: "active",
      },
    });
  }

  return prisma.proxyCard.create({
    data: {
      userId,
      label: "Routely",
      network: material.network,
      virtualLast4: material.last4,
      virtualPrefix: material.prefix,
      expMonth: material.expMonth,
      expYear: material.expYear,
      issuerProvider: material.provider,
      stripeCardId: material.stripeCardId,
      stripeCardholderId: material.stripeCardholderId,
      panCipher: panEnc?.cipher,
      panIv: panEnc?.iv,
      panTag: panEnc?.tag,
      cvcCipher: cvcEnc?.cipher,
      cvcIv: cvcEnc?.iv,
      cvcTag: cvcEnc?.tag,
      credentialCipher: credential.cipher,
      credentialIv: credential.iv,
      credentialTag: credential.tag,
      status: "active",
      walletStatus: "none",
    },
  });
}

export async function setProxyStatus(userId: string, status: "active" | "frozen" | "revoked") {
  await ensureProxyCard(userId);
  return prisma.proxyCard.update({ where: { userId }, data: { status } });
}

export async function provisionWallet(
  userId: string,
  platform: "apple" | "google"
) {
  const proxy = await ensureProxyCard(userId);
  if (proxy.status !== "active") {
    throw Object.assign(new Error("Proxy card is not active"), { status: 409 });
  }
  return prisma.proxyCard.update({
    where: { userId },
    data: {
      walletStatus: platform === "apple" ? "provisioned_apple" : "provisioned_google",
      walletPlatform: platform,
      walletProvisionedAt: new Date(),
    },
  });
}

export async function revealProxySecrets(userId: string) {
  const proxy = await ensureProxyCard(userId);
  if (proxy.issuerProvider === "stripe") {
    return {
      mode: "stripe" as const,
      stripeCardId: proxy.stripeCardId,
      last4: proxy.virtualLast4,
      expMonth: proxy.expMonth,
      expYear: proxy.expYear,
      network: proxy.network,
      message:
        "Use Stripe Issuing Elements / ephemeral keys to display PAN securely — never log raw PAN.",
    };
  }

  if (!proxy.panCipher || !proxy.panIv || !proxy.panTag || !proxy.cvcCipher || !proxy.cvcIv || !proxy.cvcTag) {
    throw Object.assign(new Error("Proxy secrets unavailable"), { status: 404 });
  }

  const pan = decrypt({ cipher: proxy.panCipher, iv: proxy.panIv, tag: proxy.panTag });
  const cvc = decrypt({ cipher: proxy.cvcCipher, iv: proxy.cvcIv, tag: proxy.cvcTag });

  return {
    mode: "simulated" as const,
    pan,
    cvc,
    expMonth: proxy.expMonth,
    expYear: proxy.expYear,
    last4: proxy.virtualLast4,
    network: proxy.network,
    displayPan: pan.replace(/(\d{4})(?=\d)/g, "$1 ").trim(),
    expiresInSec: 60,
    walletHint:
      "Sandbox: copy these details into a test wallet, or use Add to Wallet to mark this device as provisioned. Live Apple Pay requires an issuing bank + MDES.",
  };
}

export function publicProxyView(proxy: Awaited<ReturnType<typeof ensureProxyCard>>) {
  return {
    id: proxy.id,
    label: proxy.label,
    network: proxy.network,
    status: proxy.status,
    virtualLast4: proxy.virtualLast4,
    virtualPrefix: proxy.virtualPrefix,
    displayNumber: `${proxy.virtualPrefix}•• ${proxy.virtualLast4}`,
    expMonth: proxy.expMonth,
    expYear: proxy.expYear,
    issuerProvider: proxy.issuerProvider ?? issuingMode(),
    stripeCardId: proxy.stripeCardId,
    walletStatus: proxy.walletStatus,
    walletPlatform: proxy.walletPlatform,
    walletProvisionedAt: proxy.walletProvisionedAt,
  };
}
