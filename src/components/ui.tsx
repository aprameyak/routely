import { cn } from "@/lib/utils";
export function Panel({ children, className, }: {
    children: React.ReactNode;
    className?: string;
}) {
    return <div className={cn("glass rounded-3xl p-5 md:p-6", className)}>{children}</div>;
}
export function PageHeader({ eyebrow, title, description, action, }: {
    eyebrow?: string;
    title: string;
    description?: string;
    action?: React.ReactNode;
}) {
    return (<div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between animate-rise">
      <div>
        {eyebrow ? (<div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-teal">{eyebrow}</div>) : null}
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm text-muted">{description}</p> : null}
      </div>
      {action}
    </div>);
}
export function Button({ children, className, variant = "primary", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "ghost" | "danger" | "secondary";
}) {
    const styles = {
        primary: "bg-teal text-ink hover:bg-mist",
        secondary: "bg-white/8 text-foam hover:bg-white/12 border border-line",
        ghost: "bg-transparent text-mist hover:bg-white/5",
        danger: "bg-rose/15 text-rose hover:bg-rose/25",
    };
    return (<button className={cn("inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition disabled:opacity-50", styles[variant], className)} {...props}>
      {children}
    </button>);
}
export function Field({ label, children, hint, }: {
    label: string;
    children: React.ReactNode;
    hint?: string;
}) {
    return (<label className="block space-y-1.5">
      <span className="text-xs uppercase tracking-[0.14em] text-muted">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-muted">{hint}</span> : null}
    </label>);
}
export const inputClass = "w-full rounded-2xl border border-line bg-ink/40 px-3.5 py-2.5 text-sm text-foam outline-none placeholder:text-muted/70 focus:border-teal/50";
