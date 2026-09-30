"use client";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CreditCard, LayoutDashboard, ListChecks, LogOut, Settings, Shield, Sparkles, Wallet, } from "lucide-react";
const NAV = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/cards", label: "Cards", icon: CreditCard },
    { href: "/rules", label: "Rules", icon: ListChecks },
    { href: "/proxy", label: "Proxy", icon: Shield },
    { href: "/pay", label: "Pay / Simulate", icon: Sparkles },
    { href: "/transactions", label: "Activity", icon: Wallet },
    { href: "/settings", label: "Settings", icon: Settings },
];
export function AppShell({ children, user, }: {
    children: React.ReactNode;
    user: {
        name: string;
        email: string;
    };
}) {
    const pathname = usePathname();
    const router = useRouter();
    async function logout() {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
    }
    return (<div className="min-h-screen grid-noise">
      <div className="mx-auto flex min-h-screen max-w-7xl gap-0 md:gap-6 px-0 md:px-6 py-0 md:py-6">
        <aside className="hidden md:flex w-60 shrink-0 flex-col glass rounded-3xl p-5">
          <Link href="/dashboard" className="mb-8">
            <div className="text-xs uppercase tracking-[0.24em] text-teal">Routely</div>
            <div className="mt-1 text-lg font-semibold">Card intelligence</div>
          </Link>
          <nav className="flex flex-1 flex-col gap-1">
            {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (<Link key={item.href} href={item.href} className={cn("flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition", active
                    ? "bg-teal/15 text-teal"
                    : "text-mist/80 hover:bg-white/5 hover:text-foam")}>
                  <Icon size={16}/>
                  {item.label}
                </Link>);
        })}
          </nav>
          <div className="mt-6 border-t border-line pt-4">
            <div className="text-sm font-medium">{user.name}</div>
            <div className="truncate text-xs text-muted">{user.email}</div>
            <button onClick={logout} className="mt-3 flex items-center gap-2 text-xs text-muted hover:text-rose transition">
              <LogOut size={14}/> Sign out
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="md:hidden sticky top-0 z-20 glass border-b border-line px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.24em] text-teal">Routely</div>
                <div className="text-sm font-semibold">{user.name}</div>
              </div>
              <button onClick={logout} className="text-muted">
                <LogOut size={18}/>
              </button>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {NAV.map((item) => {
            const active = pathname === item.href;
            return (<Link key={item.href} href={item.href} className={cn("whitespace-nowrap rounded-full px-3 py-1 text-xs", active ? "bg-teal text-ink" : "bg-white/5 text-mist")}>
                    {item.label}
                  </Link>);
        })}
            </div>
          </header>
          <main className="flex-1 px-4 py-6 md:px-2 md:py-2">{children}</main>
        </div>
      </div>
    </div>);
}
