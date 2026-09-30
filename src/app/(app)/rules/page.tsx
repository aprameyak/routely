"use client";
import { useEffect, useState } from "react";
import { Button, Field, inputClass, PageHeader, Panel } from "@/components/ui";
import { CATEGORIES } from "@/lib/categories";
type Card = {
    id: string;
    nickname: string;
    last4: string;
};
type Rule = {
    id: string;
    name: string;
    description: string | null;
    enabled: boolean;
    priority: number;
    action: "force" | "prefer" | "exclude";
    conditions: {
        categories?: string[];
        merchants?: string[];
        minAmount?: number;
        maxAmount?: number;
        onlineOnly?: boolean;
    };
    forceCardId: string | null;
    preferCardId: string | null;
    excludeCardId: string | null;
    forceCard?: Card | null;
    preferCard?: Card | null;
    excludeCard?: Card | null;
};
export default function RulesPage() {
    const [rules, setRules] = useState<Rule[]>([]);
    const [cards, setCards] = useState<Card[]>([]);
    const [open, setOpen] = useState(false);
    const [error, setError] = useState("");
    const [form, setForm] = useState({
        name: "",
        description: "",
        action: "force" as "force" | "prefer" | "exclude",
        priority: 100,
        categories: [] as string[],
        merchants: "",
        minAmount: "",
        maxAmount: "",
        onlineOnly: false,
        cardId: "",
    });
    async function load() {
        const [r, c] = await Promise.all([fetch("/api/rules"), fetch("/api/cards")]);
        const rd = await r.json();
        const cd = await c.json();
        if (r.ok)
            setRules(rd.rules);
        if (c.ok)
            setCards(cd.cards);
    }
    useEffect(() => {
        load();
    }, []);
    function toggleCategory(id: string) {
        setForm((f) => ({
            ...f,
            categories: f.categories.includes(id)
                ? f.categories.filter((x) => x !== id)
                : [...f.categories, id],
        }));
    }
    async function createRule(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        const payload = {
            name: form.name,
            description: form.description || null,
            action: form.action,
            priority: form.priority,
            conditions: {
                categories: form.categories.length ? form.categories : undefined,
                merchants: form.merchants
                    ? form.merchants.split(",").map((s) => s.trim()).filter(Boolean)
                    : undefined,
                minAmount: form.minAmount ? Number(form.minAmount) : undefined,
                maxAmount: form.maxAmount ? Number(form.maxAmount) : undefined,
                onlineOnly: form.onlineOnly || undefined,
            },
            forceCardId: form.action === "force" ? form.cardId : null,
            preferCardId: form.action === "prefer" ? form.cardId : null,
            excludeCardId: form.action === "exclude" ? form.cardId : null,
        };
        const res = await fetch("/api/rules", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
            setError(data.error ?? "Failed to create rule");
            return;
        }
        setOpen(false);
        setForm({
            name: "",
            description: "",
            action: "force",
            priority: 100,
            categories: [],
            merchants: "",
            minAmount: "",
            maxAmount: "",
            onlineOnly: false,
            cardId: "",
        });
        await load();
    }
    async function toggle(rule: Rule) {
        await fetch(`/api/rules/${rule.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ enabled: !rule.enabled }),
        });
        await load();
    }
    async function remove(rule: Rule) {
        if (!confirm(`Delete rule “${rule.name}”?`))
            return;
        await fetch(`/api/rules/${rule.id}`, { method: "DELETE" });
        await load();
    }
    return (<div>
      <PageHeader eyebrow="Intelligence" title="Custom routing rules" description="Rules beat the default maximize-rewards strategy. Higher priority runs first." action={<Button onClick={() => setOpen((v) => !v)}>{open ? "Close" : "New rule"}</Button>}/>

      <Panel className="mb-6">
        <h2 className="text-sm font-medium text-teal">Default behavior</h2>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          With no matching custom rule, Routely scores every active card by expected rewards for
          the merchant category, soft-penalizes high utilization, respects credit limits, and
          falls back to your default card on ties.
        </p>
      </Panel>

      {open ? (<Panel className="mb-6 animate-rise">
          <form onSubmit={createRule} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Rule name">
                <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required/>
              </Field>
              <Field label="Priority (higher wins)">
                <input className={inputClass} type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}/>
              </Field>
              <Field label="Action">
                <select className={inputClass} value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value as typeof form.action })}>
                  <option value="force">Force card</option>
                  <option value="prefer">Prefer card (boost score)</option>
                  <option value="exclude">Exclude card</option>
                </select>
              </Field>
              <Field label="Card">
                <select className={inputClass} value={form.cardId} onChange={(e) => setForm({ ...form, cardId: e.target.value })} required>
                  <option value="">Select…</option>
                  {cards.map((c) => (<option key={c.id} value={c.id}>
                      {c.nickname} ••{c.last4}
                    </option>))}
                </select>
              </Field>
            </div>
            <Field label="Description">
              <input className={inputClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}/>
            </Field>
            <div>
              <div className="mb-2 text-xs uppercase tracking-[0.14em] text-muted">
                When category is
              </div>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (<button key={c.id} type="button" onClick={() => toggleCategory(c.id)} className={`rounded-full px-3 py-1 text-xs ${form.categories.includes(c.id)
                    ? "bg-teal text-ink"
                    : "bg-white/5 text-mist"}`}>
                    {c.label}
                  </button>))}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Merchant contains (comma-sep)">
                <input className={inputClass} value={form.merchants} onChange={(e) => setForm({ ...form, merchants: e.target.value })} placeholder="Amazon, Uber"/>
              </Field>
              <Field label="Min amount ($)">
                <input className={inputClass} type="number" value={form.minAmount} onChange={(e) => setForm({ ...form, minAmount: e.target.value })}/>
              </Field>
              <Field label="Max amount ($)">
                <input className={inputClass} type="number" value={form.maxAmount} onChange={(e) => setForm({ ...form, maxAmount: e.target.value })}/>
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.onlineOnly} onChange={(e) => setForm({ ...form, onlineOnly: e.target.checked })}/>
              Online purchases only
            </label>
            {error ? <p className="text-sm text-rose">{error}</p> : null}
            <Button type="submit">Create rule</Button>
          </form>
        </Panel>) : null}

      <div className="space-y-3">
        {rules.map((rule) => {
            const target = rule.forceCard?.nickname ||
                rule.preferCard?.nickname ||
                rule.excludeCard?.nickname ||
                "—";
            return (<Panel key={rule.id} className="!p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{rule.name}</h3>
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted">
                      {rule.action}
                    </span>
                    <span className="rounded-full bg-teal/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-teal">
                      p{rule.priority}
                    </span>
                    {!rule.enabled ? (<span className="rounded-full bg-rose/10 px-2 py-0.5 text-[10px] uppercase text-rose">
                        off
                      </span>) : null}
                  </div>
                  {rule.description ? (<p className="mt-1 text-sm text-muted">{rule.description}</p>) : null}
                  <p className="mt-2 text-sm text-mist">
                    Target: <span className="text-teal">{target}</span>
                    {rule.conditions.categories?.length
                    ? ` · Categories: ${rule.conditions.categories.join(", ")}`
                    : ""}
                    {rule.conditions.minAmount != null
                    ? ` · Min $${rule.conditions.minAmount}`
                    : ""}
                    {rule.conditions.onlineOnly ? " · Online only" : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => toggle(rule)}>
                    {rule.enabled ? "Disable" : "Enable"}
                  </Button>
                  <Button variant="danger" onClick={() => remove(rule)}>
                    Delete
                  </Button>
                </div>
              </div>
            </Panel>);
        })}
      </div>
    </div>);
}
