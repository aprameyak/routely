import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureProxyCard } from "@/lib/cards";
import { formatMoney, formatPoints } from "@/lib/utils";
import { labelForCategory } from "@/lib/categories";
import { PlasticCard } from "@/components/PlasticCard";
import { PageHeader, Panel } from "@/components/ui";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [cards, rules, transactions, proxy, monthAgg] = await Promise.all([
    prisma.card.findMany({
      where: { userId: user.id },
      include: { rewards: true },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    }),
    prisma.rule.findMany({ where: { userId: user.id, enabled: true } }),
    prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { card: true },
    }),
    ensureProxyCard(user.id),
    prisma.transaction.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: monthStart },
        status: { in: ["authorized", "settled"] },
      },
      select: { amountCents: true, rewardsEarned: true },
    }),
  ]);

  const rewardsThisMonth = monthAgg.reduce((sum, t) => sum + t.rewardsEarned, 0);
  const spend = monthAgg.reduce((sum, t) => sum + t.amountCents, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title={`Hey ${user.name.split(" ")[0]}, your cards are on autopilot.`}
        description="Routely picks the right plastic for every scenario so you don’t have to."
        action={
          <Link
            href="/pay"
            className="rounded-2xl bg-teal px-4 py-2.5 text-sm font-semibold text-ink hover:bg-mist transition"
          >
            Simulate a purchase
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-4 animate-rise-delay">
        {[
          { label: "Active cards", value: String(cards.filter((c) => c.isActive).length) },
          { label: "Custom rules", value: String(rules.length) },
          { label: "Spend this month", value: formatMoney(spend) },
          { label: "Rewards this month", value: formatPoints(rewardsThisMonth) },
        ].map((stat) => (
          <Panel key={stat.label} className="!p-4">
            <div className="text-[11px] uppercase tracking-[0.16em] text-muted">{stat.label}</div>
            <div className="mt-2 font-mono text-2xl">{stat.value}</div>
          </Panel>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Panel className="animate-rise-delay">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Proxy card</h2>
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wider ${
                proxy.status === "active" ? "bg-teal/15 text-teal pulse-live" : "bg-rose/15 text-rose"
              }`}
            >
              {proxy.status}
            </span>
          </div>
          <PlasticCard
            nickname={proxy.label}
            brand="visa"
            last4={proxy.virtualLast4}
            color="#0f766e"
            subtitle={`${proxy.virtualPrefix}•• ${proxy.virtualLast4} · routes on every auth`}
          />
          <p className="mt-4 text-sm text-muted leading-relaxed">
            Present this virtual card at checkout. Routely evaluates your rules, then scores
            category multipliers to authorize against the best underlying card.
          </p>
          <Link href="/proxy" className="mt-3 inline-block text-sm text-teal hover:underline">
            Manage proxy →
          </Link>
        </Panel>

        <Panel className="animate-rise-delay-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent activity</h2>
            <Link href="/transactions" className="text-sm text-teal hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {transactions.length === 0 ? (
              <p className="text-sm text-muted">No transactions yet. Run a simulation to see routing.</p>
            ) : (
              transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-start justify-between gap-3 rounded-2xl border border-line/70 bg-ink/30 px-3 py-3"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{tx.merchant}</div>
                    <div className="mt-0.5 text-xs text-muted">
                      {labelForCategory(tx.category)} · {tx.card?.nickname ?? "Declined"} ·{" "}
                      {tx.multiplierUsed}x
                    </div>
                    <div className="mt-1 text-xs text-mist/70 line-clamp-2">{tx.routingReason}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-sm">{formatMoney(tx.amountCents)}</div>
                    <div
                      className={`text-[10px] uppercase tracking-wider mt-1 ${
                        tx.status === "declined" ? "text-rose" : "text-teal"
                      }`}
                    >
                      {tx.status}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your cards</h2>
          <Link href="/cards" className="text-sm text-teal hover:underline">
            Manage
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <PlasticCard
              key={card.id}
              nickname={card.nickname}
              brand={card.brand}
              last4={card.last4}
              color={card.color}
              subtitle={
                card.isDefault
                  ? "Default · fallback"
                  : `${card.rewards.sort((a, b) => b.multiplier - a.multiplier)[0]?.multiplier ?? 1}x top category`
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
