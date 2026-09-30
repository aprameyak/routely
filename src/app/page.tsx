import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
export default async function HomePage() {
    const user = await getSessionUser();
    if (user)
        redirect("/dashboard");
    return (<div className="relative min-h-screen overflow-hidden grid-noise">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-teal/20 blur-3xl"/>
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-amber/10 blur-3xl"/>
      </div>

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="text-sm font-semibold tracking-[0.28em] uppercase text-teal">Routely</div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-mist hover:text-foam">
            Sign in
          </Link>
          <Link href="/register" className="rounded-full bg-teal px-4 py-2 text-sm font-medium text-ink hover:bg-mist transition">
            Get started
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex max-w-6xl flex-col px-6 pb-24 pt-10 md:pt-20">
        <div className="max-w-3xl animate-rise">
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tight leading-[0.95]">
            Routely
          </h1>
          <p className="mt-6 max-w-xl text-lg md:text-xl text-mist/90 leading-relaxed">
            Stop juggling which card to pull. One proxy card. Every charge routes to the card that
            actually maximizes your rewards — or follows your rules.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 animate-rise-delay">
            <Link href="/register" className="rounded-2xl bg-teal px-5 py-3 text-sm font-semibold text-ink hover:bg-mist transition">
              Create vault
            </Link>
            <Link href="/login" className="rounded-2xl border border-line px-5 py-3 text-sm text-foam hover:bg-white/5 transition">
              Demo sign in
            </Link>
          </div>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-3 animate-rise-delay-2">
          {[
            {
                title: "Proxy once",
                body: "Merchants see a single Routely card. Under the hood we authorize against the optimal underlying card.",
            },
            {
                title: "Maximize by default",
                body: "Category multipliers, rotating bonuses, utilization penalties, and credit-limit checks — scored on every swipe.",
            },
            {
                title: "Your rules win",
                body: "Force Amex at dinner. Prefer Flex at the pump. Exclude Sapphire on big online carts. Priority-ordered and auditable.",
            },
        ].map((item) => (<div key={item.title} className="glass rounded-3xl p-5">
              <div className="text-teal text-sm font-medium">{item.title}</div>
              <p className="mt-2 text-sm text-muted leading-relaxed">{item.body}</p>
            </div>))}
        </div>
      </main>
    </div>);
}
