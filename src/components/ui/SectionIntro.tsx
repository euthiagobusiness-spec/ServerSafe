import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { SectionBadge } from "@/components/ui/SectionBadge";

type SectionIntroProps = {
  badge: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  size?: "default" | "large";
};

const titleSizes = {
  default: "text-[1.8rem] sm:text-5xl",
  large: "text-[2rem] sm:text-6xl",
};

export function SectionIntro({
  badge,
  title,
  description,
  className,
  titleClassName,
  descriptionClassName,
  size = "default",
}: SectionIntroProps) {
  return (
    <div className={className}>
      <SectionBadge>{badge}</SectionBadge>
      <h2
        className={cn(
          "mt-5 text-balance font-black leading-tight text-slate-950 sm:mt-6",
          titleSizes[size],
          titleClassName,
        )}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={cn(
            "mt-4 text-base leading-7 text-slate-600 sm:mt-5 sm:text-lg sm:leading-8",
            descriptionClassName,
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
