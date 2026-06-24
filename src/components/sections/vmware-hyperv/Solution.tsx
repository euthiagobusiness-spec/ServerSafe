import { ArrowRight, ClipboardCheck, DatabaseBackup, HardDrive, LockKeyhole, ServerCog, ShieldCheck } from "lucide-react";

import { SectionIntro } from "@/components/ui/SectionIntro";
import { SectionShell } from "@/components/ui/SectionShell";
import { vmwareHypervLanding } from "@/config/vmware-hyperv";

const icons = [ClipboardCheck, HardDrive, ServerCog, DatabaseBackup, LockKeyhole, ShieldCheck] as const;

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

        <div className="mt-10 grid gap-x-8 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
          {service.cards.map((card, index) => {
            const Icon = icons[index];

            return (
              <article key={card.title} className="flex min-h-[300px] flex-col justify-between border-b border-slate-300 bg-transparent pb-6">
                <div>
                  <div className="grid h-14 w-14 place-items-center text-blue-700">
                    <Icon className="h-10 w-10" aria-hidden="true" />
                  </div>
                  <h3 className="mt-6 max-w-xs text-2xl font-black leading-tight text-slate-950">{card.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-slate-600">{card.description}</p>
                </div>
                <a
                  href="#contato"
                  className="mt-6 inline-flex items-center gap-2 text-sm font-black text-blue-700 transition hover:text-blue-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
                >
                  Saiba mais
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </article>
            );
          })}
        </div>
      </div>
    </SectionShell>
  );
}
