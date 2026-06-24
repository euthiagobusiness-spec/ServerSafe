import { ArrowRight } from "lucide-react";

import { GlassCard } from "@/components/ui/GlassCard";
import { SectionIntro } from "@/components/ui/SectionIntro";
import { SectionShell } from "@/components/ui/SectionShell";
import { vmwareHypervLanding } from "@/config/vmware-hyperv";

export function Process() {
  const { process } = vmwareHypervLanding;

  return (
    <SectionShell id="metodo" tone="solid" topLine>
      <span id="processo" className="absolute -top-24" aria-hidden="true" />
      <span id="sobre" className="absolute -top-24" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <SectionIntro badge={process.badge} title={process.title} size="large" />

          <div className="grid gap-4 md:grid-cols-2">
            {process.steps.map((step, index) => (
              <GlassCard key={step.title} className="bg-white/82 px-4 py-5 sm:px-5">
                <div className="flex items-start gap-4">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[8px] bg-blue-700 font-mono text-sm font-black text-white">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-950">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <a
            href="#contato"
            className="inline-flex min-h-12 items-center gap-2 rounded-[8px] border border-blue-200 bg-white px-5 py-3 text-sm font-bold uppercase tracking-[0.08em] text-blue-800 transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
          >
            Conversar com especialista
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </SectionShell>
  );
}
