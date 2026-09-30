"use client";
import { useEffect, useState } from "react";
import { PlasticCard } from "@/components/PlasticCard";
import { Button, PageHeader, Panel } from "@/components/ui";
type Proxy = {
    id: string;
    label: string;
    status: string;
    virtualLast4: string;
    virtualPrefix: string;
    displayNumber: string;
};
export default function ProxyPage() {
    const [proxy, setProxy] = useState<Proxy | null>(null);
    const [busy, setBusy] = useState(false);
    async function load() {
        const res = await fetch("/api/proxy");
        const data = await res.json();
        if (res.ok)
            setProxy(data.proxy);
    }
    useEffect(() => {
        load();
    }, []);
    async function setStatus(status: "active" | "frozen" | "revoked") {
        setBusy(true);
        const res = await fetch("/api/proxy", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
        });
        const data = await res.json();
        setBusy(false);
        if (res.ok)
            setProxy(data.proxy);
    }
    return (<div>
      <PageHeader eyebrow="Security" title="Proxy card" description="The single card you present. Auth requests hit Routely, which picks and charges the right underlying card."/>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="animate-rise">
          {proxy ? (<>
              <PlasticCard nickname={proxy.label} brand="visa" last4={proxy.virtualLast4} color="#0f766e" subtitle={proxy.displayNumber}/>
              <div className="mt-4 flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wider ${proxy.status === "active"
                ? "bg-teal/15 text-teal"
                : "bg-rose/15 text-rose"}`}>
                  {proxy.status}
                </span>
                <span className="text-xs text-muted font-mono">{proxy.displayNumber}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button disabled={busy || proxy.status === "active"} onClick={() => setStatus("active")}>
                  Activate
                </Button>
                <Button variant="secondary" disabled={busy || proxy.status === "frozen"} onClick={() => setStatus("frozen")}>
                  Freeze
                </Button>
                <Button variant="danger" disabled={busy || proxy.status === "revoked"} onClick={() => setStatus("revoked")}>
                  Revoke
                </Button>
              </div>
            </>) : (<p className="text-sm text-muted">Loading proxy…</p>)}
        </Panel>

        <Panel className="animate-rise-delay space-y-4">
          <h2 className="text-lg font-semibold">How proxying stays safe</h2>
          <ul className="space-y-3 text-sm text-muted leading-relaxed">
            <li>
              <span className="text-foam">No raw PANs.</span> Underlying cards are stored as
              AES-256-GCM encrypted payment tokens plus last4 for display.
            </li>
            <li>
              <span className="text-foam">HttpOnly sessions.</span> Auth uses signed JWTs in secure
              cookies with server-side session records and expiry.
            </li>
            <li>
              <span className="text-foam">Freeze in one tap.</span> Freezing the proxy declines all
              new authorizations without deleting your vault.
            </li>
            <li>
              <span className="text-foam">Full audit trail.</span> Logins, card changes, rule edits,
              and payments are written to an append-only audit log.
            </li>
            <li>
              <span className="text-foam">Production path.</span> Swap the simulated token vault for
              Stripe Issuing / a card network partner — the routing engine stays the same.
            </li>
          </ul>
        </Panel>
      </div>
    </div>);
}
