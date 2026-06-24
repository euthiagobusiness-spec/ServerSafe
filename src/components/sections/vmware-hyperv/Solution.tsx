import { ClipboardCheck, DatabaseBackup, HardDrive, ServerCog } from "lucide-react";

import { FeatureCard } from "@/components/ui/FeatureCard";
import { SectionIntro } from "@/components/ui/SectionIntro";
import { SectionShell } from "@/components/ui/SectionShell";
import { vmwareHypervLanding } from "@/config/vmware-hyperv";

const icons = [ClipboardCheck, HardDrive, ServerCog, DatabaseBackup] as const;

export function Solution() {
  const { service } = vmwareHypervLanding;

  return (
    <SectionShell id="servico" className="bg-[#f4f8fb]" tone="transparent">
      <span id="solucoes" className="absolute -top-24" aria-hidden="true" />
      <span id="continuidade" className="absolute -top-24" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionIntro
          badge={service.badge}
          title={service.title}
          description={service.description}
          className="max-w-4xl"
        />

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {service.cards.map((card, index) => (
            <FeatureCard
              key={card.title}
              icon={icons[index]}
              title={card.title}
              description={card.description}
              className="bg-white/82"
            />
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
