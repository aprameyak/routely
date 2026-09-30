"use client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Field, inputClass, Panel } from "@/components/ui";
import { CATEGORIES } from "@/lib/categories";
import { brandLabel, formatMoney, formatPoints, cn } from "@/lib/utils";
import { Check, Copy, CreditCard, Search, Share2, Zap } from "lucide-react";
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
const CATEGORY_SHORT = CATEGORIES.filter((c) => c.id !== "other");
export default function DecideClient() {
    const searchParams = useSearchParams();
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
    const [installHint, setInstallHint] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const bootstrapped = useRef(false);
    const loadHistory = useCallback(async () => {
        const res = await fetch("/api/recommend");
        const data = await res.json();
        if (res.ok) {
            setRecent(data.recent ?? []);
            setFrequent(data.frequent ?? []);
        }
    }, []);
    const decide = useCallback(async (opts?: {
        merchant?: string;
        category?: string;
        amount?: string;
        isOnline?: boolean | null;
    }) => {
        const cat = opts?.category ?? category;
        let m = (opts?.merchant ?? merchant).trim();
        if (!m && cat) {
            m = CATEGORIES.find((c) => c.id === cat)?.label ?? "Purchase";
        }
        if (!m) {
            setError("Pick a merchant or category");
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
                    category: cat || undefined,
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
            if (data.category)
                setCategory(data.category);
            await loadHistory();
        });
    }, [amount, category, isOnline, loadHistory, merchant]);
    useEffect(() => {
        loadHistory();
        const standalone = window.matchMedia("(display-mode: standalone)").matches ||
            ("standalone" in navigator && (navigator as {
                standalone?: boolean;
            }).standalone);
        setInstallHint(!standalone && /iPhone|iPad|Android/i.test(navigator.userAgent));
        inputRef.current?.focus();
    }, [loadHistory]);
    useEffect(() => {
        if (bootstrapped.current)
            return;
        const m = searchParams.get("merchant");
        const c = searchParams.get("category");
        const a = searchParams.get("amount");
        const online = searchParams.get("online");
        if (!m && !c)
            return;
        bootstrapped.current = true;
        if (m)
            setMerchant(m);
        if (c)
            setCategory(c);
        if (a)
            setAmount(a);
        if (online === "1")
            setIsOnline(true);
        if (online === "0")
            setIsOnline(false);
        void decide({
            merchant: m ?? undefined,
            category: c ?? undefined,
            amount: a ?? undefined,
            isOnline: online === "1" ? true : online === "0" ? false : null,
        });
    }, [decide, searchParams]);
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
    async function copyAnswer() {
        if (!answer?.selectedCard)
            return;
        const text = `${answer.instruction}\n${answer.reason}`;
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }
    async function shareAnswer() {
        if (!answer?.selectedCard)
            return;
        const text = `${answer.instruction}\n${answer.reason}`;
        if (navigator.share) {
            try {
                await navigator.share({ title: "Routely", text });
                return;
            }
            catch { }
        }
        await copyAnswer();
    }
    function pickMerchant(name: string, cat?: string) {
        setMerchant(name);
        if (cat)
            setCategory(cat);
        setSuggestions([]);
        void decide({ merchant: name, category: cat, amount, isOnline });
    }
    function pickCategory(id: string) {
        const label = CATEGORIES.find((c) => c.id === id)?.label ?? id;
        setCategory(id);
        setMerchant(label);
        setSuggestions([]);
        void decide({ merchant: label, category: id, amount, isOnline });
    }
    return (<div className="mx-auto max-w-2xl pb-10">
      <div className="mb-5 animate-rise">
        <div className="text-[11px] uppercase tracking-[0.22em] text-teal">At the register</div>
        <h1 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
          Which card should I use?
        </h1>
        <p className="mt-2 text-sm text-muted">
          Tap a category or type the store. Pull the card it shows.
        </p>
      </div>

      {installHint ? (<Panel className="mb-4 !p-3 text-sm text-mist animate-rise">
          Add Routely to your Home Screen for one-tap access in line. Share → Add to Home Screen.
        </Panel>) : null}

      <div className="mb-4 animate-rise-delay">
        <div className="mb-2 text-xs uppercase tracking-[0.14em] text-muted">I&apos;m buying</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CATEGORY_SHORT.map((c) => (<button key={c.id} type="button" onClick={() => pickCategory(c.id)} disabled={pending} className={cn("rounded-2xl border px-3 py-4 text-sm font-medium text-left transition active:scale-[0.98]", category === c.id
                ? "border-teal bg-teal/15 text-teal"
                : "border-line bg-white/5 text-foam hover:bg-white/8")}>
              {c.label}
            </button>))}
        </div>
      </div>

      <Panel className="animate-rise-delay !p-4 md:!p-5 space-y-4">
        <div className="relative">
          <Field label="Or type the merchant">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16}/>
              <input ref={inputRef} className={cn(inputClass, "pl-10 text-base min-h-12")} placeholder="Whole Foods, Shell, Amazon…" value={merchant} onChange={(e) => setMerchant(e.target.value)} onKeyDown={(e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                void decide();
            }
        }} autoComplete="off" autoCorrect="off"/>
            </div>
          </Field>
          {suggestions.length > 0 && merchant.trim() ? (<div className="absolute z-20 mt-1 w-full overflow-hidden rounded-2xl border border-line bg-ink-soft shadow-xl">
              {suggestions.map((s) => (<button key={s.name} type="button" className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm hover:bg-white/5" onClick={() => pickMerchant(s.name, s.category)}>
                  <span>{s.name}</span>
                  <span className="text-xs text-muted">{s.category}</span>
                </button>))}
            </div>) : null}
        </div>

        <Field label="Amount (optional)">
          <input className={cn(inputClass, "min-h-12")} inputMode="decimal" placeholder="42.50" value={amount} onChange={(e) => setAmount(e.target.value)}/>
        </Field>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setIsOnline(false)} className={cn("rounded-full px-4 py-2 text-xs", isOnline === false ? "bg-teal text-ink" : "bg-white/5 text-mist")}>
            In store
          </button>
          <button type="button" onClick={() => setIsOnline(true)} className={cn("rounded-full px-4 py-2 text-xs", isOnline === true ? "bg-teal text-ink" : "bg-white/5 text-mist")}>
            Online
          </button>
        </div>

        {error ? <p className="text-sm text-rose">{error}</p> : null}

        <Button className="w-full text-base min-h-12" disabled={pending} onClick={() => void decide()}>
          <Zap size={16}/>
          {pending ? "Deciding…" : "Tell me which card"}
        </Button>
      </Panel>

      {answer ? (<div className="mt-5 animate-rise space-y-4">
          {answer.selectedCard ? (<div className="rounded-3xl p-6 text-white shadow-2xl" style={{
                    background: `linear-gradient(145deg, ${answer.selectedCard.color} 0%, #050505 125%)`,
                }}>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/70">
                <CreditCard size={14}/> Pull this card now
              </div>
              <div className="mt-3 text-3xl md:text-5xl font-semibold leading-tight">
                {answer.selectedCard.nickname}
              </div>
              <div className="mt-2 font-mono text-xl tracking-widest text-white/90">
                •••• {answer.selectedCard.last4}
              </div>
              <div className="mt-1 text-sm text-white/70">
                {brandLabel(answer.selectedCard.brand)} · {answer.multiplierUsed}x · {answer.category}
                {answer.amountCents
                    ? ` · ~${formatPoints(answer.rewardsEstimated)} pts on ${formatMoney(answer.amountCents)}`
                    : ` · ~${formatPoints(answer.rewardsEstimated)} pts / $${((answer.assumedAmountCents ?? 10000) / 100).toFixed(0)}`}
              </div>
              <p className="mt-4 text-sm text-white/85 leading-relaxed">{answer.reason}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button variant="secondary" className="!bg-white/15 !text-white !border-white/20 min-h-11" onClick={() => void copyAnswer()}>
                  {copied ? <Check size={14}/> : <Copy size={14}/>}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button variant="secondary" className="!bg-white/15 !text-white !border-white/20 min-h-11" onClick={() => void shareAnswer()}>
                  <Share2 size={14}/> Share
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
          <div className="mb-2 text-xs uppercase tracking-[0.14em] text-muted">Frequent stores</div>
          <div className="flex flex-wrap gap-2">
            {(frequent.length ? frequent.map((f) => f.merchant) : QUICK).map((name) => (<button key={name} type="button" onClick={() => pickMerchant(name)} className="rounded-full bg-white/5 px-3 py-2 text-xs text-mist hover:bg-teal/15 hover:text-teal transition">
                {name}
              </button>))}
          </div>
        </div>

        {recent.length > 0 ? (<div>
            <div className="mb-2 text-xs uppercase tracking-[0.14em] text-muted">Recent</div>
            <div className="space-y-2">
              {recent.slice(0, 6).map((r) => (<button key={r.id} type="button" onClick={() => pickMerchant(r.merchant, r.category)} className="flex w-full items-center justify-between rounded-2xl border border-line px-3 py-3 text-left text-sm hover:bg-white/5">
                  <div>
                    <div className="font-medium">{r.merchant}</div>
                    <div className="text-xs text-muted">
                      {r.cardNickname ? `${r.cardNickname} ••${r.cardLast4}` : "No card"} · {r.category}
                    </div>
                  </div>
                </button>))}
            </div>
          </div>) : null}
      </div>
    </div>);
}
