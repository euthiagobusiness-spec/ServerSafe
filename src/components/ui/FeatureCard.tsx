import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/cn";
import { GlassCard } from "@/components/ui/GlassCard";
import { IconFrame } from "@/components/ui/IconFrame";
import { InteractiveGlowCard } from "@/components/ui/InteractiveGlowCard";

type FeatureCardLayout = "stack" | "row";

type FeatureCardProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  layout?: FeatureCardLayout;
  className?: string;
  iconClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
};

export function FeatureCard({
  icon,
  title,
  description,
  layout = "stack",
  className,
  iconClassName,
  titleClassName,
  descriptionClassName,
}: FeatureCardProps) {
  if (layout === "row") {
    return (
      <InteractiveGlowCard>
        <GlassCard className={cn("h-full px-4 py-4 sm:px-5 sm:py-5", className)}>
          <div className="flex items-start gap-3 sm:gap-4">
            <IconFrame icon={icon} className="sm:h-10 sm:w-10" iconClassName={cn("sm:h-5 sm:w-5", iconClassName)} />
            <div>
              <h3 className={cn("font-semibold text-slate-950", titleClassName)}>{title}</h3>
              <p className={cn("mt-2 text-sm leading-6 text-slate-600", descriptionClassName)}>{description}</p>
            </div>
          </div>
        </GlassCard>
      </InteractiveGlowCard>
    );
  }

  return (
    <InteractiveGlowCard>
      <GlassCard className={cn("h-full px-4 py-4 sm:px-5 sm:py-6", className)}>
        <IconFrame icon={icon} iconClassName={iconClassName} />
        <h3 className={cn("mt-4 text-base font-bold text-slate-950 sm:mt-5 sm:text-lg", titleClassName)}>{title}</h3>
        <p className={cn("mt-2 text-sm leading-6 text-slate-600 sm:mt-3 sm:leading-7", descriptionClassName)}>
          {description}
        </p>
      </GlassCard>
    </InteractiveGlowCard>
  );
}
