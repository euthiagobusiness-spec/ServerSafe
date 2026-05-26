import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type SectionTone = "soft" | "solid" | "transparent";

type SectionShellProps = {
  children: ReactNode;
  id?: string;
  tone?: SectionTone;
  className?: string;
  topLine?: boolean;
  overlay?: ReactNode;
};

const toneClass: Record<SectionTone, string> = {
  soft: "bg-white/18",
  solid: "bg-white/34",
  transparent: "bg-transparent",
};

export function SectionShell({
  children,
  id,
  tone = "soft",
  className,
  topLine = false,
  overlay,
}: SectionShellProps) {
  return (
    <section id={id} className={cn("relative overflow-hidden py-14 sm:py-28", toneClass[tone], className)}>
      {topLine ? <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" /> : null}
      {overlay}
      {children}
    </section>
  );
}
