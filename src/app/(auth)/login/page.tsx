"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, inputClass, Panel } from "@/components/ui";
export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("demo@routely.app");
    const [password, setPassword] = useState("DemoPass123!");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");
        const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        setLoading(false);
        if (!res.ok) {
            setError(data.error ?? "Login failed");
            return;
        }
    router.push("/decide");
    router.refresh();
    }
    return (<div className="min-h-screen grid-noise flex items-center justify-center px-4 py-12">
      <Panel className="w-full max-w-md animate-rise">
        <div className="text-[11px] uppercase tracking-[0.22em] text-teal">Routely</div>
        <h1 className="mt-2 text-2xl font-semibold">Welcome back</h1>
        <p className="mt-2 text-sm text-muted">
          Demo vault is preloaded — or sign in with your account.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Field label="Email">
            <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email"/>
          </Field>
          <Field label="Password">
            <input className={inputClass} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password"/>
          </Field>
          {error ? <p className="text-sm text-rose">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className="mt-5 text-sm text-muted">
          New here?{" "}
          <Link href="/register" className="text-teal hover:underline">
            Create an account
          </Link>
        </p>
      </Panel>
    </div>);
}
