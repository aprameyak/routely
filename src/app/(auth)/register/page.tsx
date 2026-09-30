"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, inputClass, Panel } from "@/components/ui";
export default function RegisterPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");
        const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json();
        setLoading(false);
        if (!res.ok) {
            setError(data.error ??
                (data.issues ? data.issues.map((i: {
                    message: string;
                }) => i.message).join(", ") : "Failed"));
            return;
        }
        router.push("/decide");
        router.refresh();
    }
    return (<div className="min-h-screen grid-noise flex items-center justify-center px-4 py-12">
      <Panel className="w-full max-w-md animate-rise">
        <div className="text-[11px] uppercase tracking-[0.22em] text-teal">Routely</div>
        <h1 className="mt-2 text-2xl font-semibold">Create your vault</h1>
        <p className="mt-2 text-sm text-muted">
          We never store raw card numbers — only encrypted processor tokens.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Field label="Name">
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required/>
          </Field>
          <Field label="Email">
            <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required/>
          </Field>
          <Field label="Password" hint="At least 10 characters with a letter and a number">
            <input className={inputClass} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required/>
          </Field>
          {error ? <p className="text-sm text-rose">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating…" : "Create account"}
          </Button>
        </form>
        <p className="mt-5 text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-teal hover:underline">
            Sign in
          </Link>
        </p>
      </Panel>
    </div>);
}
