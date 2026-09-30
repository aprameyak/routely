"use client";
import { useEffect, useState } from "react";
import { PlasticCard } from "@/components/PlasticCard";
import { Button, Field, inputClass, PageHeader, Panel } from "@/components/ui";
import { CATEGORIES, CARD_BRANDS, CARD_COLORS } from "@/lib/categories";
import { formatMoney } from "@/lib/utils";
type Reward = {
    category: string;
    multiplier: number;
    note?: string | null;
};
type Card = {
    id: string;
    nickname: string;
    brand: string;
    last4: string;
    color: string;
    expiryMonth: number;
    expiryYear: number;
    isDefault: boolean;
    isActive: boolean;
    creditLimit: number | null;
    currentBalance: number;
    rewards: Reward[];
};
type FormState = {
    nickname: string;
    brand: string;
    last4: string;
    expiryMonth: number;
    expiryYear: number;
    creditLimit: string;
    isDefault: boolean;
    color: string;
    rewards: {
        category: string;
        multiplier: number;
    }[];
};
const emptyForm = (): FormState => ({
    nickname: "",
    brand: "visa",
    last4: "",
    expiryMonth: new Date().getMonth() + 1,
    expiryYear: new Date().getFullYear() + 3,
    creditLimit: "",
    isDefault: false,
    color: CARD_COLORS[0],
    rewards: CATEGORIES.map((c) => ({ category: c.id, multiplier: 1 })),
});
function formFromCard(card: Card): FormState {
    return {
        nickname: card.nickname,
        brand: card.brand,
        last4: card.last4,
        expiryMonth: card.expiryMonth,
        expiryYear: card.expiryYear,
        creditLimit: card.creditLimit != null ? String(card.creditLimit) : "",
        isDefault: card.isDefault,
        color: card.color,
        rewards: CATEGORIES.map((c) => ({
            category: c.id,
            multiplier: card.rewards.find((r) => r.category === c.id)?.multiplier ?? 1,
        })),
    };
}
export default function CardsPage() {
    const [cards, setCards] = useState<Card[]>([]);
    const [form, setForm] = useState<FormState>(emptyForm());
    const [editingId, setEditingId] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    async function load() {
        const res = await fetch("/api/cards");
        const data = await res.json();
        if (res.ok)
            setCards(data.cards);
    }
    useEffect(() => {
        load();
    }, []);
    function startCreate() {
        setEditingId(null);
        setForm(emptyForm());
        setOpen(true);
        setError("");
    }
    function startEdit(card: Card) {
        setEditingId(card.id);
        setForm(formFromCard(card));
        setOpen(true);
        setError("");
    }
    async function saveCard(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");
        const payload = {
            nickname: form.nickname,
            brand: form.brand,
            last4: form.last4,
            expiryMonth: Number(form.expiryMonth),
            expiryYear: Number(form.expiryYear),
            creditLimit: form.creditLimit ? Number(form.creditLimit) : null,
            isDefault: form.isDefault,
            color: form.color,
            rewards: form.rewards.filter((r) => r.multiplier > 0),
        };
        const res = await fetch(editingId ? `/api/cards/${editingId}` : "/api/cards", {
            method: editingId ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        setLoading(false);
        if (!res.ok) {
            setError(data.error ?? "Could not save card");
            return;
        }
        setForm(emptyForm());
        setEditingId(null);
        setOpen(false);
        await load();
    }
    async function toggleActive(card: Card) {
        await fetch(`/api/cards/${card.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: !card.isActive }),
        });
        await load();
    }
    async function remove(card: Card) {
        if (!confirm(`Remove ${card.nickname}?`))
            return;
        await fetch(`/api/cards/${card.id}`, { method: "DELETE" });
        await load();
    }
    return (<div>
      <PageHeader eyebrow="Vault" title="Your cards" description="Add or edit cards with reward rates. Only last4 + encrypted tokens are stored — never full PANs." action={<Button onClick={() => {
                if (open) {
                    setOpen(false);
                    setEditingId(null);
                }
                else
                    startCreate();
            }}>
            {open ? "Close" : "Add card"}
          </Button>}/>

      {open ? (<Panel className="mb-6 animate-rise">
          <h2 className="mb-4 text-lg font-semibold">
            {editingId ? "Edit card" : "Add card"}
          </h2>
          <form onSubmit={saveCard} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nickname">
                <input className={inputClass} value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} required/>
              </Field>
              <Field label="Brand">
                <select className={inputClass} value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} disabled={!!editingId}>
                  {CARD_BRANDS.map((b) => (<option key={b} value={b}>
                      {b}
                    </option>))}
                </select>
              </Field>
              <Field label="Last 4" hint="We only store last4 for display">
                <input className={inputClass} value={form.last4} onChange={(e) => setForm({ ...form, last4: e.target.value.replace(/\D/g, "").slice(0, 4) })} required inputMode="numeric" disabled={!!editingId}/>
              </Field>
              <Field label="Credit limit (optional)">
                <input className={inputClass} value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} type="number" min={0}/>
              </Field>
              <Field label="Expiry month">
                <input className={inputClass} type="number" min={1} max={12} value={form.expiryMonth} onChange={(e) => setForm({ ...form, expiryMonth: Number(e.target.value) })}/>
              </Field>
              <Field label="Expiry year">
                <input className={inputClass} type="number" value={form.expiryYear} onChange={(e) => setForm({ ...form, expiryYear: Number(e.target.value) })}/>
              </Field>
            </div>

            <div>
              <div className="mb-2 text-xs uppercase tracking-[0.14em] text-muted">Reward rates</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {CATEGORIES.map((cat, idx) => (<div key={cat.id} className="flex items-center gap-2 rounded-2xl border border-line px-3 py-2">
                    <span className="flex-1 text-sm">{cat.label}</span>
                    <input className="w-20 rounded-xl border border-line bg-ink/40 px-2 py-1 text-sm font-mono" type="number" step="0.5" min={0} max={20} value={form.rewards[idx]?.multiplier ?? 1} onChange={(e) => {
                    const rewards = [...form.rewards];
                    rewards[idx] = {
                        category: cat.id,
                        multiplier: Number(e.target.value),
                    };
                    setForm({ ...form, rewards });
                }}/>
                    <span className="text-xs text-muted">x</span>
                  </div>))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-mist">
              <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}/>
              Set as default fallback card
            </label>

            {error ? <p className="text-sm text-rose">{error}</p> : null}
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : editingId ? "Update card" : "Save card"}
            </Button>
          </form>
        </Panel>) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (<Panel key={card.id} className="!p-4">
            <PlasticCard nickname={card.nickname} brand={card.brand} last4={card.last4} color={card.color} subtitle={card.isDefault ? "Default card" : card.isActive ? "Active" : "Inactive"}/>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {card.rewards
                .filter((r) => r.multiplier > 1)
                .sort((a, b) => b.multiplier - a.multiplier)
                .slice(0, 4)
                .map((r) => (<span key={r.category} className="rounded-full bg-teal/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-teal">
                    {r.multiplier}x {r.category}
                  </span>))}
            </div>
            <div className="mt-3 text-xs text-muted">
              Balance {formatMoney(Math.round(card.currentBalance * 100))}
              {card.creditLimit != null
                ? ` / ${formatMoney(Math.round(card.creditLimit * 100))} limit`
                : ""}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => startEdit(card)}>
                Edit
              </Button>
              <Button variant="secondary" onClick={() => toggleActive(card)}>
                {card.isActive ? "Freeze" : "Activate"}
              </Button>
              <Button variant="danger" onClick={() => remove(card)}>
                Remove
              </Button>
            </div>
          </Panel>))}
      </div>
    </div>);
}
