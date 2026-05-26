import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/cn";

type IconFrameProps = {
  icon: LucideIcon;
  className?: string;
  iconClassName?: string;
};

export function IconFrame({ icon: Icon, className, iconClassName }: IconFrameProps) {
  return (
    <span
      className={cn(
        "grid h-10 w-10 shrink-0 place-items-center rounded-[8px] border border-blue-200 bg-blue-50 shadow-sm sm:h-12 sm:w-12",
        className,
      )}
    >
      <Icon className={cn("h-5 w-5 text-blue-700 sm:h-6 sm:w-6", iconClassName)} aria-hidden="true" />
    </span>
  );
}
