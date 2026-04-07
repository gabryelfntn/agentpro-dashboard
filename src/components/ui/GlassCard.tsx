import type { ReactNode } from "react";

type Props = {
  children?: ReactNode;
  className?: string;
  glow?: boolean;
};

export function GlassCard({ children, className = "", glow }: Props) {
  return (
    <div
      className={[
        "rounded-2xl border border-white/[0.08] bg-slate-900/45 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl",
        glow ? "shadow-[0_0_40px_rgba(56,189,248,0.12)]" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
