import type { ReactNode } from "react";

type InteractiveGlowCardProps = {
  children: ReactNode;
  className?: string;
};

export function InteractiveGlowCard({ children, className = "" }: InteractiveGlowCardProps) {
  return <div className={`interactive-glow-card ${className}`}>{children}</div>;
}
