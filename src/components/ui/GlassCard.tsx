import type { ElementType, ReactNode } from "react";

type GlassCardProps = {
  children: ReactNode;
  className?: string;
  as?: ElementType;
};

export function GlassCard({ children, className = "", as: Component = "div" }: GlassCardProps) {
  return (
    <Component
      className={`glass-panel relative overflow-hidden rounded-[8px] border border-white/60 bg-white/34 shadow-[0_22px_60px_rgba(15,23,42,0.13)] backdrop-blur-2xl ${className}`}
    >
      {children}
    </Component>
  );
}
