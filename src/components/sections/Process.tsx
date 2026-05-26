import { processSteps } from "@/config/site";
import { GlassCard } from "@/components/ui/GlassCard";
import { InteractiveGlowCard } from "@/components/ui/InteractiveGlowCard";
import { SectionIntro } from "@/components/ui/SectionIntro";
import { SectionShell } from "@/components/ui/SectionShell";

export function Process() {
  return (
    <SectionShell id="processo">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionIntro
          badge="Processo de trabalho"
          title="Diagnóstico primeiro. Arquitetura depois. Execução com controle."
          className="max-w-3xl"
          description={
            <>
              O trabalho começa pela leitura do ambiente e evolui para uma solução que
              considera risco, operação, segurança e crescimento.
            </>
          }
        />

        <div className="mt-8 grid gap-3 sm:mt-12 sm:gap-4 lg:grid-cols-5">
          {processSteps.map(({ title, description, icon: Icon }, index) => (
            <InteractiveGlowCard key={title}>
              <GlassCard className="h-full px-4 py-4 sm:px-5 sm:py-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-sm text-blue-700">0{index + 1}</span>
                  <Icon className="h-5 w-5 text-blue-700" aria-hidden="true" />
                </div>
                <h3 className="mt-5 font-bold text-slate-950 sm:mt-8">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 sm:mt-3">{description}</p>
              </GlassCard>
            </InteractiveGlowCard>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
