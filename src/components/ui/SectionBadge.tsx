import type { ReactNode } from "react";

export function SectionBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-[8px] border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-blue-800 shadow-sm">
      <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
      {children}
    </span>
  );
}
