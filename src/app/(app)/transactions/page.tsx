"use client";
import { useEffect, useState } from "react";
import { Button, PageHeader, Panel } from "@/components/ui";
import { formatMoney, formatPoints } from "@/lib/utils";
type Tx = {
    id: string;
    merchant: string;
    category: string;
    amountCents: number;
    status: string;
    rewardsEarned: number;
    multiplierUsed: number;
    routingReason: string;
    createdAt: string;
    card: {
        nickname: string;
        last4: string;
        color: string;
    } | null;
};
export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<Tx[]>([]);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [error, setError] = useState("");
    async function load() {
        const res = await fetch("/api/transactions?limit=100");
        const data = await res.json();
        if (res.ok)
            setTransactions(data.transactions);
    }
    useEffect(() => {
        load();
    }, []);
    async function act(id: string, action: "settle" | "reverse") {
        setBusyId(id);
        setError("");
        const res = await fetch(`/api/transactions/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action }),
        });
        const data = await res.json();
        setBusyId(null);
        if (!res.ok) {
            setError(data.error ?? "Action failed");
            return;
        }
        await load();
    }
    return (<div>
      <PageHeader eyebrow="Ledger" title="Activity" description="Authorize → settle like a real network. Reverse voids the charge and restores balance."/>

      {error ? <p className="mb-4 text-sm text-rose">{error}</p> : null}

      <Panel className="overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-line text-[11px] uppercase tracking-[0.14em] text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">When</th>
                <th className="px-5 py-3 font-medium">Merchant</th>
                <th className="px-5 py-3 font-medium">Card</th>
                <th className="px-5 py-3 font-medium">Amount</th>
                <th className="px-5 py-3 font-medium">Rewards</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (<tr key={tx.id} className="border-b border-line/50 align-top">
                  <td className="px-5 py-3 whitespace-nowrap text-muted">
                    {new Date(tx.createdAt).toLocaleString()}
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-medium">{tx.merchant}</div>
                    <div className="text-xs text-muted">{tx.category}</div>
                    <div className="mt-1 max-w-xs text-xs text-mist/70">{tx.routingReason}</div>
                  </td>
                  <td className="px-5 py-3">
                    {tx.card ? (<>
                        <div>{tx.card.nickname}</div>
                        <div className="font-mono text-xs text-muted">••{tx.card.last4}</div>
                      </>) : ("—")}
                  </td>
                  <td className="px-5 py-3 font-mono">{formatMoney(tx.amountCents)}</td>
                  <td className="px-5 py-3 font-mono text-teal">
                    {tx.status === "declined" || tx.status === "reversed"
                ? "—"
                : `${formatPoints(tx.rewardsEarned)} (${tx.multiplierUsed}x)`}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${tx.status === "declined" || tx.status === "reversed"
                ? "bg-rose/15 text-rose"
                : tx.status === "settled"
                    ? "bg-teal/15 text-teal"
                    : "bg-amber/15 text-amber"}`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1.5">
                      {tx.status === "authorized" ? (<Button variant="secondary" className="!px-2.5 !py-1 text-xs" disabled={busyId === tx.id} onClick={() => act(tx.id, "settle")}>
                          Settle
                        </Button>) : null}
                      {tx.status === "authorized" || tx.status === "settled" ? (<Button variant="danger" className="!px-2.5 !py-1 text-xs" disabled={busyId === tx.id} onClick={() => act(tx.id, "reverse")}>
                          Reverse
                        </Button>) : null}
                    </div>
                  </td>
                </tr>))}
            </tbody>
          </table>
        </div>
        {transactions.length === 0 ? (<p className="p-6 text-sm text-muted">No activity yet.</p>) : null}
      </Panel>
    </div>);
}
