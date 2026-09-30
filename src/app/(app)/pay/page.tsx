"use client";
import { useState } from "react";
import { Button, Field, inputClass, PageHeader, Panel } from "@/components/ui";
import { CATEGORIES } from "@/lib/categories";
import { formatMoney, formatPoints } from "@/lib/utils";
type Decision = {
    reason: string;
    strategy: string;
    rewardsEarned: number;
    multiplierUsed: number;
    declinedReason?: string;
    selectedCard: {
        id: string;
        nickname: string;
        brand: string;
        last4: string;
        color: string;
    } | null;
    scores: Array<{
        cardId: string;
        nickname: string;
        multiplier: number;
        estimatedRewards: number;
        score: number;
        excluded: boolean;
        excludeReason?: string;
    }>;
};
const PRESETS = [
    { label: "Dinner out", merchant: "Osteria Verde", category: "dining", amount: 86.4, online: false },
    { label: "Fill tank", merchant: "Shell #4421", category: "gas", amount: 52.0, online: false },
    { label: "Groceries", merchant: "Whole Foods", category: "grocery", amount: 124.3, online: false },
    { label: "Flight", merchant: "United Airlines", category: "travel", amount: 428.0, online: true },
    { label: "Big Amazon", merchant: "Amazon.com", category: "online", amount: 612.0, online: true },
    { label: "Netflix", merchant: "Netflix", category: "streaming", amount: 15.99, online: true },
];
export default function PayPage() {
    const [merchant, setMerchant] = useState("Osteria Verde");
    const [category, setCategory] = useState("dining");
    const [amount, setAmount] = useState("86.40");
    const [isOnline, setIsOnline] = useState(false);
    const [autoSettle, setAutoSettle] = useState(true);
    const [decision, setDecision] = useState<Decision | null>(null);
    const [mode, setMode] = useState<"preview" | "charge" | null>(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [lastTxId, setLastTxId] = useState<string | null>(null);
    function applyPreset(p: (typeof PRESETS)[number]) {
        setMerchant(p.merchant);
        setCategory(p.category);
        setAmount(String(p.amount));
        setIsOnline(p.online);
        setDecision(null);
    }
    async function run(dryRun: boolean) {
        setLoading(true);
        setError("");
        setMode(dryRun ? "preview" : "charge");
        const amountCents = Math.round(parseFloat(amount) * 100);
        const res = await fetch("/api/route", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                amountCents,
                merchant,
                category,
                isOnline,
                dryRun,
                autoSettle: dryRun ? undefined : autoSettle,
                idempotencyKey: dryRun ? undefined : crypto.randomUUID(),
            }),
        });
        const data = await res.json();
        setLoading(false);
        if (!res.ok) {
            setError(data.error ?? "Routing failed");
            return;
        }
        setDecision(data.decision);
        setLastTxId(data.transaction?.id ?? null);
    }
    return (<div>
      <PageHeader eyebrow="Checkout" title="Pay through the proxy" description="Preview which card wins, then authorize. Same engine that would run on a real network authorization."/>

      <div className="mb-4 flex flex-wrap gap-2">
        {PRESETS.map((p) => (<button key={p.label} type="button" onClick={() => applyPreset(p)} className="rounded-full bg-white/5 px-3 py-1.5 text-xs text-mist hover:bg-teal/15 hover:text-teal transition">
            {p.label}
          </button>))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="animate-rise space-y-4">
          <Field label="Merchant">
            <input className={inputClass} value={merchant} onChange={(e) => setMerchant(e.target.value)}/>
          </Field>
          <Field label="Category">
            <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (<option key={c.id} value={c.id}>
                  {c.label}
                </option>))}
            </select>
          </Field>
          <Field label="Amount (USD)">
            <input className={inputClass} type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}/>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isOnline} onChange={(e) => setIsOnline(e.target.checked)}/>
            Online purchase
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={autoSettle} onChange={(e) => setAutoSettle(e.target.checked)}/>
            Auto-settle on authorize
          </label>
          {error ? <p className="text-sm text-rose">{error}</p> : null}
          <div className="flex gap-2">
            <Button variant="secondary" disabled={loading} onClick={() => run(true)}>
              Preview routing
            </Button>
            <Button disabled={loading} onClick={() => run(false)}>
              {loading ? "Working…" : "Authorize charge"}
            </Button>
          </div>
        </Panel>

        <Panel className="animate-rise-delay">
          {!decision ? (<p className="text-sm text-muted">
              Run a preview to see scores, rule hits, and the winning card before money moves.
            </p>) : (<div className="space-y-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-teal">
                {mode === "preview" ? "Dry run" : "Authorized"} · {decision.strategy}
              </div>
              {decision.selectedCard ? (<div className="rounded-3xl p-4" style={{
                    background: `linear-gradient(135deg, ${decision.selectedCard.color}, #0a0a0a)`,
                }}>
                  <div className="text-sm text-white/70">Selected card</div>
                  <div className="text-xl font-semibold">
                    {decision.selectedCard.nickname}
                  </div>
                  <div className="font-mono text-sm mt-1">
                    •••• {decision.selectedCard.last4} · {decision.multiplierUsed}x ·{" "}
                    {formatPoints(decision.rewardsEarned)} pts
                  </div>
                </div>) : (<div className="rounded-3xl border border-rose/30 bg-rose/10 p-4 text-rose">
                  Declined — {decision.declinedReason ?? decision.reason}
                </div>)}
              <p className="text-sm text-mist leading-relaxed">{decision.reason}</p>
              <div>
                <div className="mb-2 text-xs uppercase tracking-[0.14em] text-muted">
                  Scoreboard
                </div>
                <div className="space-y-2">
                  {[...decision.scores]
                .sort((a, b) => b.score - a.score)
                .map((s) => (<div key={s.cardId} className="flex items-center justify-between rounded-2xl border border-line px-3 py-2 text-sm">
                        <div>
                          <div className="font-medium">
                            {s.nickname}
                            {s.excluded ? (<span className="ml-2 text-[10px] uppercase text-rose">
                                excluded{s.excludeReason ? `: ${s.excludeReason}` : ""}
                              </span>) : null}
                          </div>
                          <div className="text-xs text-muted">
                            {s.multiplier}x · {formatPoints(s.estimatedRewards)} pts est.
                          </div>
                        </div>
                        <div className="font-mono text-teal">
                          {s.excluded ? "—" : s.score >= 1000000 ? "FORCE" : s.score.toFixed(1)}
                        </div>
                      </div>))}
                </div>
              </div>
              <div className="text-xs text-muted">
                Charge amount {formatMoney(Math.round(parseFloat(amount || "0") * 100))}
                {lastTxId ? ` · tx ${lastTxId.slice(0, 8)}…` : ""}
              </div>
            </div>)}
        </Panel>
      </div>
    </div>);
}
