import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type InteractiveGlowCardProps = {
  children: ReactNode;
  className?: string;
};

export function InteractiveGlowCard({ children, className = "" }: InteractiveGlowCardProps) {
  return <div className={cn("interactive-glow-card", className)}>{children}</div>;
}
