import { brandLabel, cn } from "@/lib/utils";
export function PlasticCard({ nickname, brand, last4, color, subtitle, className, }: {
    nickname: string;
    brand: string;
    last4: string;
    color: string;
    subtitle?: string;
    className?: string;
}) {
    return (<div className={cn("card-shine relative aspect-[1.68/1] w-full overflow-hidden rounded-3xl p-5 text-white shadow-xl", className)} style={{
            background: `linear-gradient(145deg, ${color} 0%, #0a0a0a 120%)`,
        }}>
      <div className="relative z-10 flex h-full flex-col justify-between">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">Routely vault</div>
            <div className="mt-1 text-lg font-semibold leading-tight">{nickname}</div>
          </div>
          <div className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] uppercase tracking-wider">
            {brandLabel(brand)}
          </div>
        </div>
        <div>
          <div className="font-mono text-lg tracking-[0.18em]">•••• {last4}</div>
          {subtitle ? <div className="mt-1 text-xs text-white/70">{subtitle}</div> : null}
        </div>
      </div>
    </div>);
}
