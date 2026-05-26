import type { ElementType, ReactNode } from "react";

import { cn } from "@/lib/cn";

type GlassCardProps = {
  children: ReactNode;
  className?: string;
  as?: ElementType;
};

export function GlassCard({ children, className = "", as: Component = "div" }: GlassCardProps) {
  return (
    <Component
      className={cn(
        "glass-panel motion-card reveal-surface motion-surface hover-lift relative overflow-hidden rounded-[8px] border border-white/60 bg-white/38 shadow-[0_18px_42px_rgba(15,23,42,0.11)]",
        className,
      )}
    >
      {children}
    </Component>
  );
}
