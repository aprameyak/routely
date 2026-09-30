"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, inputClass, PageHeader, Panel } from "@/components/ui";
type Account = {
    id: string;
    email: string;
    name: string;
    createdAt: string;
    _count: {
        cards: number;
        rules: number;
        transactions: number;
        sessions: number;
        auditLogs: number;
    };
};
type AuditRow = {
    id: string;
    action: string;
    resource: string | null;
    resourceId: string | null;
    createdAt: string;
};
export default function SettingsPage() {
    const router = useRouter();
    const [account, setAccount] = useState<Account | null>(null);
    const [name, setName] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [logs, setLogs] = useState<AuditRow[]>([]);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    async function load() {
        const [a, l] = await Promise.all([fetch("/api/account"), fetch("/api/audit?limit=30")]);
        const ad = await a.json();
        const ld = await l.json();
        if (a.ok) {
            setAccount(ad.user);
            setName(ad.user.name);
        }
        if (l.ok)
            setLogs(ld.logs);
    }
    useEffect(() => {
        load();
    }, []);
    async function saveProfile(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setMessage("");
        const res = await fetch("/api/account", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name }),
        });
        const data = await res.json();
        if (!res.ok) {
            setError(data.error ?? "Failed");
            return;
        }
        setMessage("Profile updated");
        await load();
    }
    async function changePassword(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setMessage("");
        const res = await fetch("/api/account", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ currentPassword, newPassword }),
        });
        const data = await res.json();
        if (!res.ok) {
            setError(data.error ?? "Failed");
            return;
        }
        setMessage("Password changed — please sign in again");
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
    }
    async function deleteAccount() {
        if (!account)
            return;
        const confirmEmail = prompt("Type your email to permanently delete this vault:");
        if (!confirmEmail)
            return;
        const res = await fetch("/api/account", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ confirmEmail }),
        });
        const data = await res.json();
        if (!res.ok) {
            setError(data.error ?? "Delete failed");
            return;
        }
        router.push("/");
        router.refresh();
    }
    return (<div>
      <PageHeader eyebrow="Account" title="Settings & security" description="Manage profile, credentials, and review your audit trail."/>

      {error ? <p className="mb-4 text-sm text-rose">{error}</p> : null}
      {message ? <p className="mb-4 text-sm text-teal">{message}</p> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="animate-rise space-y-4">
          <h2 className="text-lg font-semibold">Profile</h2>
          {account ? (<>
              <div className="text-sm text-muted">
                {account.email} · joined {new Date(account.createdAt).toLocaleDateString()}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-2xl border border-line px-3 py-2">
                  <div className="text-[10px] uppercase text-muted">Cards</div>
                  <div className="font-mono text-lg">{account._count.cards}</div>
                </div>
                <div className="rounded-2xl border border-line px-3 py-2">
                  <div className="text-[10px] uppercase text-muted">Rules</div>
                  <div className="font-mono text-lg">{account._count.rules}</div>
                </div>
                <div className="rounded-2xl border border-line px-3 py-2">
                  <div className="text-[10px] uppercase text-muted">Transactions</div>
                  <div className="font-mono text-lg">{account._count.transactions}</div>
                </div>
                <div className="rounded-2xl border border-line px-3 py-2">
                  <div className="text-[10px] uppercase text-muted">Sessions</div>
                  <div className="font-mono text-lg">{account._count.sessions}</div>
                </div>
              </div>
              <form onSubmit={saveProfile} className="space-y-3">
                <Field label="Display name">
                  <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)}/>
                </Field>
                <Button type="submit">Save profile</Button>
              </form>
            </>) : (<p className="text-sm text-muted">Loading…</p>)}
        </Panel>

        <Panel className="animate-rise-delay space-y-4">
          <h2 className="text-lg font-semibold">Change password</h2>
          <form onSubmit={changePassword} className="space-y-3">
            <Field label="Current password">
              <input className={inputClass} type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required/>
            </Field>
            <Field label="New password" hint="Min 10 chars, letter + number">
              <input className={inputClass} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required/>
            </Field>
            <Button type="submit">Update password</Button>
          </form>
        </Panel>
      </div>

      <Panel className="mt-6 animate-rise-delay-2">
        <h2 className="text-lg font-semibold mb-3">Recent audit events</h2>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {logs.map((log) => (<div key={log.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line px-3 py-2 text-sm">
              <div>
                <div className="font-medium">{log.action}</div>
                <div className="text-xs text-muted">
                  {log.resource ?? "—"}
                  {log.resourceId ? ` · ${log.resourceId.slice(0, 8)}…` : ""}
                </div>
              </div>
              <div className="text-xs text-muted whitespace-nowrap">
                {new Date(log.createdAt).toLocaleString()}
              </div>
            </div>))}
          {logs.length === 0 ? <p className="text-sm text-muted">No audit events yet.</p> : null}
        </div>
      </Panel>

      <Panel className="mt-6 border-rose/20">
        <h2 className="text-lg font-semibold text-rose">Danger zone</h2>
        <p className="mt-2 text-sm text-muted">
          Permanently delete your vault, cards, rules, and transaction history. This cannot be undone.
        </p>
        <Button variant="danger" className="mt-4" onClick={deleteAccount}>
          Delete account
        </Button>
      </Panel>
    </div>);
}
