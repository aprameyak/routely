"use client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Button, Field, inputClass, Panel } from "@/components/ui";
import { CATEGORIES } from "@/lib/categories";
import { brandLabel, formatMoney, formatPoints, cn } from "@/lib/utils";
import { Check, Copy, CreditCard, Search, Zap } from "lucide-react";
type MerchantHit = {
    name: string;
    category: string;
    mcc: string;
};
type Answer = {
    merchant: string;
    merchantMatched: boolean;
    category: string;
    isOnline: boolean;
    amountCents: number | null;
    assumedAmountCents: number | null;
    selectedCard: {
        id: string;
        nickname: string;
        brand: string;
        last4: string;
        color: string;
    } | null;
    reason: string;
    multiplierUsed: number;
    rewardsEstimated: number;
    instruction: string;
    runnersUp: Array<{
        cardId: string;
        nickname: string;
        multiplier: number;
        estimatedRewards: number;
        score: number;
    }>;
};
type Recent = {
    id: string;
    merchant: string;
    category: string;
    cardNickname: string | null;
    cardLast4: string | null;
    createdAt: string;
};
type Frequent = {
    merchant: string;
    category: string;
    count: number;
};
const QUICK = [
    "Whole Foods",
    "Shell",
    "Amazon",
    "Starbucks",
    "United Airlines",
    "CVS",
    "Netflix",
    "Costco",
];
export default function DecidePage() {
    const [merchant, setMerchant] = useState("");
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState<string>("");
    const [isOnline, setIsOnline] = useState<boolean | null>(null);
    const [suggestions, setSuggestions] = useState<MerchantHit[]>([]);
    const [answer, setAnswer] = useState<Answer | null>(null);
    const [recent, setRecent] = useState<Recent[]>([]);
    const [frequent, setFrequent] = useState<Frequent[]>([]);
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);
    const [pending, startTransition] = useTransition();
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const loadHistory = useCallback(async () => {
        const res = await fetch("/api/recommend");
        const data = await res.json();
        if (res.ok) {
            setRecent(data.recent ?? []);
            setFrequent(data.frequent ?? []);
        }
    }, []);
    useEffect(() => {
        loadHistory();
        inputRef.current?.focus();
    }, [loadHistory]);
    useEffect(() => {
        if (debounceRef.current)
            clearTimeout(debounceRef.current);
        if (!merchant.trim()) {
            setSuggestions([]);
            return;
        }
        debounceRef.current = setTimeout(async () => {
            const res = await fetch(`/api/recommend?q=${encodeURIComponent(merchant)}`);
            const data = await res.json();
            if (res.ok)
                setSuggestions(data.merchants ?? []);
        }, 120);
        return () => {
            if (debounceRef.current)
                clearTimeout(debounceRef.current);
        };
    }, [merchant]);
    async function decide(opts?: {
        merchant?: string;
        category?: string;
        amount?: string;
        isOnline?: boolean | null;
    }) {
        const m = (opts?.merchant ?? merchant).trim();
        if (!m) {
            setError("Where are you paying?");
            return;
        }
        setError("");
        const amt = opts?.amount ?? amount;
        const amountCents = amt ? Math.round(parseFloat(amt) * 100) : undefined;
        if (amt && (!amountCents || amountCents <= 0 || Number.isNaN(amountCents))) {
            setError("Enter a valid amount");
            return;
        }
        startTransition(async () => {
            const res = await fetch("/api/recommend", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    merchant: m,
                    category: (opts?.category ?? category) || undefined,
                    amountCents,
                    isOnline: (opts?.isOnline ?? isOnline) ?? undefined,
                    save: true,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error ?? "Could not decide");
                return;
            }
            setAnswer(data);
            setMerchant(data.merchant);
            if (!category && data.category)
                setCategory(data.category);
            await loadHistory();
        });
    }
    async function copyAnswer() {
        if (!answer?.selectedCard)
            return;
        const text = `${answer.instruction}\n${answer.reason}`;
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }
    function pickMerchant(name: string, cat?: string) {
        setMerchant(name);
        if (cat)
            setCategory(cat);
        setSuggestions([]);
        void decide({ merchant: name, category: cat, amount, isOnline });
    }
    return (<div className="mx-auto max-w-2xl">
      <div className="mb-6 animate-rise">
        <div className="text-[11px] uppercase tracking-[0.22em] text-teal">At the register</div>
        <h1 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
          Which card should I use?
        </h1>
        <p className="mt-2 text-sm text-muted">
          Type the merchant. We’ll tell you which plastic to pull — based on your rewards and rules.
        </p>
      </div>

      <Panel className="animate-rise-delay !p-4 md:!p-5 space-y-4">
        <div className="relative">
          <Field label="Where are you paying?">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16}/>
              <input ref={inputRef} className={cn(inputClass, "pl-10 text-base")} placeholder="Whole Foods, Shell, Amazon…" value={merchant} onChange={(e) => setMerchant(e.target.value)} onKeyDown={(e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                void decide();
            }
        }} autoComplete="off" autoCorrect="off"/>
            </div>
          </Field>
          {suggestions.length > 0 && merchant.trim() ? (<div className="absolute z-20 mt-1 w-full overflow-hidden rounded-2xl border border-line bg-ink-soft shadow-xl">
              {suggestions.map((s) => (<button key={s.name} type="button" className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-white/5" onClick={() => pickMerchant(s.name, s.category)}>
                  <span>{s.name}</span>
                  <span className="text-xs text-muted">{s.category}</span>
                </button>))}
            </div>) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Amount (optional)">
            <input className={inputClass} inputMode="decimal" placeholder="42.50" value={amount} onChange={(e) => setAmount(e.target.value)}/>
          </Field>
          <Field label="Category override">
            <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Auto-detect</option>
              {CATEGORIES.map((c) => (<option key={c.id} value={c.id}>
                  {c.label}
                </option>))}
            </select>
          </Field>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setIsOnline(false)} className={cn("rounded-full px-3 py-1.5 text-xs", isOnline === false ? "bg-teal text-ink" : "bg-white/5 text-mist")}>
            In store
          </button>
          <button type="button" onClick={() => setIsOnline(true)} className={cn("rounded-full px-3 py-1.5 text-xs", isOnline === true ? "bg-teal text-ink" : "bg-white/5 text-mist")}>
            Online
          </button>
          <button type="button" onClick={() => setIsOnline(null)} className={cn("rounded-full px-3 py-1.5 text-xs", isOnline === null ? "bg-teal text-ink" : "bg-white/5 text-mist")}>
            Auto
          </button>
        </div>

        {error ? <p className="text-sm text-rose">{error}</p> : null}

        <Button className="w-full text-base py-3" disabled={pending} onClick={() => void decide()}>
          <Zap size={16}/>
          {pending ? "Deciding…" : "Tell me which card"}
        </Button>
      </Panel>

      {answer ? (<div className="mt-5 animate-rise space-y-4">
          {answer.selectedCard ? (<div className="rounded-3xl p-6 text-white shadow-2xl" style={{
                    background: `linear-gradient(145deg, ${answer.selectedCard.color} 0%, #050505 125%)`,
                }}>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/70">
                <CreditCard size={14}/> Use this card
              </div>
              <div className="mt-3 text-3xl md:text-4xl font-semibold leading-tight">
                {answer.selectedCard.nickname}
              </div>
              <div className="mt-2 font-mono text-lg tracking-widest text-white/90">
                •••• {answer.selectedCard.last4}
              </div>
              <div className="mt-1 text-sm text-white/70">
                {brandLabel(answer.selectedCard.brand)} · {answer.multiplierUsed}x ·{" "}
                {answer.category}
                {answer.amountCents
                    ? ` · ~${formatPoints(answer.rewardsEstimated)} pts on ${formatMoney(answer.amountCents)}`
                    : ` · ~${formatPoints(answer.rewardsEstimated)} pts per $${((answer.assumedAmountCents ?? 10000) / 100).toFixed(0)}`}
              </div>
              <p className="mt-4 text-sm text-white/85 leading-relaxed">{answer.reason}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button variant="secondary" className="!bg-white/15 !text-white !border-white/20" onClick={() => void copyAnswer()}>
                  {copied ? <Check size={14}/> : <Copy size={14}/>}
                  {copied ? "Copied" : "Copy answer"}
                </Button>
              </div>
            </div>) : (<Panel className="border-rose/30">
              <p className="text-rose">{answer.instruction}</p>
              <p className="mt-2 text-sm text-muted">{answer.reason}</p>
            </Panel>)}

          {answer.runnersUp.length > 0 ? (<Panel className="!p-4">
              <div className="text-xs uppercase tracking-[0.14em] text-muted mb-2">Also considered</div>
              <div className="space-y-2">
                {answer.runnersUp.map((r) => (<div key={r.cardId} className="flex items-center justify-between text-sm rounded-2xl border border-line px-3 py-2">
                    <span>{r.nickname}</span>
                    <span className="font-mono text-muted">
                      {r.multiplier}x · {formatPoints(r.estimatedRewards)} pts
                    </span>
                  </div>))}
              </div>
            </Panel>) : null}
        </div>) : null}

      <div className="mt-8 space-y-4 animate-rise-delay-2">
        <div>
          <div className="mb-2 text-xs uppercase tracking-[0.14em] text-muted">Quick picks</div>
          <div className="flex flex-wrap gap-2">
            {(frequent.length ? frequent.map((f) => f.merchant) : QUICK).map((name) => (<button key={name} type="button" onClick={() => pickMerchant(name)} className="rounded-full bg-white/5 px-3 py-1.5 text-xs text-mist hover:bg-teal/15 hover:text-teal transition">
                {name}
              </button>))}
          </div>
        </div>

        {recent.length > 0 ? (<div>
            <div className="mb-2 text-xs uppercase tracking-[0.14em] text-muted">Recent decisions</div>
            <div className="space-y-2">
              {recent.slice(0, 6).map((r) => (<button key={r.id} type="button" onClick={() => pickMerchant(r.merchant, r.category)} className="flex w-full items-center justify-between rounded-2xl border border-line px-3 py-2.5 text-left text-sm hover:bg-white/5">
                  <div>
                    <div className="font-medium">{r.merchant}</div>
                    <div className="text-xs text-muted">
                      {r.cardNickname ? `${r.cardNickname} ••${r.cardLast4}` : "No card"} ·{" "}
                      {r.category}
                    </div>
                  </div>
                  <span className="text-[10px] text-muted">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </button>))}
            </div>
          </div>) : null}
      </div>
    </div>);
}
