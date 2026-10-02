"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button, PageHeader, Panel, inputClass } from "@/components/ui";
import { formatMoney, formatPoints, cn } from "@/lib/utils";
import { Check, CreditCard, Eye, EyeOff, Snowflake, Wallet } from "lucide-react";

type Proxy = {
  id: string;
  label: string;
  network: string;
  status: string;
  virtualLast4: string;
  virtualPrefix: string;
  displayNumber: string;
  expMonth: number;
  expYear: number;
  issuerProvider: string;
  walletStatus: string;
  walletPlatform: string | null;
};

type Secrets = {
  mode: string;
  displayPan?: string;
  pan?: string;
  cvc?: string;
  expMonth: number;
  expYear: number;
  last4: string;
  network: string;
  walletHint?: string;
  message?: string;
  expiresInSec?: number;
};

type AuthResult = {
  approved: boolean;
  reason: string;
  selectedCard: { nickname: string; last4: string; color: string } | null;
  rewardsEarned: number;
  multiplierUsed: number;
  transaction: { id: string; status: string; amountCents: number; merchant: string };
};

const DEMO_CHARGES = [
  { merchant: "Whole Foods", amount: 64.2, category: "grocery", online: false },
  { merchant: "Shell", amount: 48.5, category: "gas", online: false },
  { merchant: "Starbucks", amount: 7.85, category: "dining", online: false },
  { merchant: "Amazon", amount: 129.0, category: "online", online: true },
];

export default function WalletPage() {
  const [proxy, setProxy] = useState<Proxy | null>(null);
  const [secrets, setSecrets] = useState<Secrets | null>(null);
  const [showSecrets, setShowSecrets] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [auth, setAuth] = useState<AuthResult | null>(null);
  const [customMerchant, setCustomMerchant] = useState("Whole Foods");
  const [customAmount, setCustomAmount] = useState("42.00");

  const load = useCallback(async () => {
    const res = await fetch("/api/proxy");
    const data = await res.json();
    if (res.ok) setProxy(data.proxy);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/proxy", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Failed");
      return null;
    }
    if (data.proxy) setProxy(data.proxy);
    if (data.secrets) {
      setSecrets(data.secrets);
      setShowSecrets(true);
      if (data.secrets.expiresInSec) {
        setTimeout(() => {
          setShowSecrets(false);
          setSecrets(null);
        }, data.secrets.expiresInSec * 1000);
      }
    }
    if (data.nextSteps) setMessage(`${data.nextSteps.title}: ${data.nextSteps.body}`);
    return data;
  }

  async function charge(merchant: string, amount: number, category?: string, online?: boolean) {
    setBusy(true);
    setError("");
    const res = await fetch("/api/proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant,
        amountCents: Math.round(amount * 100),
        category,
        isOnline: online,
        autoSettle: true,
        idempotencyKey: crypto.randomUUID(),
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Authorization failed");
      return;
    }
    setAuth(data);
  }

  if (!proxy) {
    return <div className="text-sm text-muted p-6">Issuing your Routely card…</div>;
  }

  const walletReady =
    proxy.walletStatus === "provisioned_apple" || proxy.walletStatus === "provisioned_google";

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Your proxy card"
        title="Proxy card"
        description="Wallet provisioning is simulated unless Stripe Issuing is configured."
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4 animate-rise">
          <div
            className="relative aspect-[1.68/1] w-full overflow-hidden rounded-3xl p-6 text-white shadow-2xl"
            style={{
              background: "linear-gradient(145deg, #0f766e 0%, #052e2b 55%, #050505 120%)",
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.24em] text-white/60">Routely</div>
                <div className="mt-1 text-xl font-semibold">{proxy.label}</div>
              </div>
              <div className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] uppercase tracking-wider">
                {proxy.network}
              </div>
            </div>
            <div className="mt-10 font-mono text-xl tracking-[0.2em]">{proxy.displayNumber}</div>
            <div className="mt-4 flex items-end justify-between text-sm text-white/80">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-white/50">Expires</div>
                {String(proxy.expMonth).padStart(2, "0")}/{String(proxy.expYear).slice(-2)}
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-white/50">Status</div>
                {proxy.status}
                {walletReady ? " · in wallet" : ""}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={busy}
              onClick={() => void patch({ action: "provision_wallet", walletPlatform: "apple" })}
            >
              <Wallet size={16} /> Add to Apple Wallet
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => void patch({ action: "provision_wallet", walletPlatform: "google" })}
            >
              <Wallet size={16} /> Google Wallet
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => void patch({ action: "reveal" })}
            >
              {showSecrets ? <EyeOff size={16} /> : <Eye size={16} />} Reveal for setup
            </Button>
            <Button
              variant="secondary"
              disabled={busy || proxy.status === "revoked"}
              onClick={() =>
                void patch({ status: proxy.status === "active" ? "frozen" : "active" })
              }
            >
              <Snowflake size={16} /> {proxy.status === "active" ? "Freeze" : "Unfreeze"}
            </Button>
          </div>

          {showSecrets && secrets ? (
            <Panel className="!p-4 space-y-2">
              <div className="text-xs uppercase tracking-[0.14em] text-teal">
                {secrets.mode === "stripe" ? "Stripe Issuing" : "Sandbox card details"} · auto-hide
              </div>
              {secrets.displayPan ? (
                <>
                  <div className="font-mono text-lg tracking-wider">{secrets.displayPan}</div>
                  <div className="text-sm text-muted">
                    Exp {String(secrets.expMonth).padStart(2, "0")}/{secrets.expYear} · CVC{" "}
                    <span className="font-mono text-foam">{secrets.cvc}</span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted">{secrets.message}</p>
              )}
              {secrets.walletHint ? <p className="text-xs text-muted">{secrets.walletHint}</p> : null}
            </Panel>
          ) : null}

          {message ? <p className="text-sm text-mist leading-relaxed">{message}</p> : null}
          {error ? <p className="text-sm text-rose">{error}</p> : null}

          <Panel className="!p-4 text-sm text-muted leading-relaxed">
            <div className="flex items-center gap-2 text-foam font-medium mb-2">
              <Check size={16} className="text-teal" /> How this matches your spec
            </div>
            You pay with <span className="text-foam">one Routely card</span> (wallet or online). Each
            authorization hits our router, which picks the best funding card for rewards/rules and
            books the charge there. Issuer mode:{" "}
            <span className="text-teal">{proxy.issuerProvider}</span>. Live Apple Pay NFC requires an
            issuing bank; this build is the complete product path including Stripe Issuing when
            configured.
          </Panel>
        </div>

        <div className="space-y-4 animate-rise-delay">
          <Panel className="!p-4 space-y-3">
            <div className="text-sm font-semibold">Tap to pay (simulate POS / wallet charge)</div>
            <p className="text-xs text-muted">
              Same path a wallet authorization would hit: proxy charge → intelligent route → funding
              card.
            </p>
            <div className="grid gap-2">
              {DEMO_CHARGES.map((c) => (
                <button
                  key={c.merchant}
                  type="button"
                  disabled={busy}
                  onClick={() => void charge(c.merchant, c.amount, c.category, c.online)}
                  className="flex items-center justify-between rounded-2xl border border-line px-3 py-3 text-left text-sm hover:bg-white/5"
                >
                  <span>{c.merchant}</span>
                  <span className="font-mono text-teal">${c.amount.toFixed(2)}</span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2 pt-2">
              <input
                className={inputClass}
                value={customMerchant}
                onChange={(e) => setCustomMerchant(e.target.value)}
                placeholder="Merchant"
              />
              <input
                className={cn(inputClass, "w-24")}
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <Button
              className="w-full"
              disabled={busy}
              onClick={() => void charge(customMerchant, parseFloat(customAmount) || 0)}
            >
              <CreditCard size={16} /> Charge Routely card
            </Button>
          </Panel>

          {auth ? (
            <Panel
              className={cn(
                "!p-4",
                auth.approved ? "border-teal/30" : "border-rose/30"
              )}
            >
              <div
                className={cn(
                  "text-xs uppercase tracking-[0.16em]",
                  auth.approved ? "text-teal" : "text-rose"
                )}
              >
                {auth.approved ? "Approved" : "Declined"} · {auth.transaction.status}
              </div>
              <div className="mt-2 text-lg font-semibold">
                {auth.transaction.merchant} · {formatMoney(auth.transaction.amountCents)}
              </div>
              {auth.selectedCard ? (
                <div className="mt-2 text-sm">
                  Funded by{" "}
                  <span className="text-teal">
                    {auth.selectedCard.nickname} ••{auth.selectedCard.last4}
                  </span>{" "}
                  · {auth.multiplierUsed}x · {formatPoints(auth.rewardsEarned)} pts
                </div>
              ) : null}
              <p className="mt-2 text-sm text-muted">{auth.reason}</p>
              <Link href="/transactions" className="mt-3 inline-block text-sm text-teal hover:underline">
                View activity →
              </Link>
            </Panel>
          ) : null}

          <Panel className="!p-4 text-sm text-muted">
            Funding cards live in{" "}
            <Link href="/cards" className="text-teal hover:underline">
              My cards
            </Link>
            . Custom routing in{" "}
            <Link href="/rules" className="text-teal hover:underline">
              Rules
            </Link>
            . Manual chooser (no charge) in{" "}
            <Link href="/decide" className="text-teal hover:underline">
              Which card?
            </Link>
            .
          </Panel>
        </div>
      </div>
    </div>
  );
}
