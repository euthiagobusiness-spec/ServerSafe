import { processSteps } from "@/config/site";
import { GlassCard } from "@/components/ui/GlassCard";
import { InteractiveGlowCard } from "@/components/ui/InteractiveGlowCard";
import { SectionBadge } from "@/components/ui/SectionBadge";

export function Process() {
  return (
    <section id="processo" className="bg-white/18 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <SectionBadge>Processo de trabalho</SectionBadge>
          <h2 className="mt-6 text-balance text-3xl font-black leading-tight text-slate-950 sm:text-5xl">
            Diagnóstico primeiro. Arquitetura depois. Execução com controle.
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            O trabalho começa pela leitura do ambiente e evolui para uma solução que
            considera risco, operação, segurança e crescimento.
          </p>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-5">
          {processSteps.map(({ title, description, icon: Icon }, index) => (
            <InteractiveGlowCard key={title}>
              <GlassCard className="h-full px-5 py-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-sm text-blue-700">0{index + 1}</span>
                  <Icon className="h-5 w-5 text-blue-700" aria-hidden="true" />
                </div>
                <h3 className="mt-8 font-bold text-slate-950">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
              </GlassCard>
            </InteractiveGlowCard>
          ))}
        </div>
      </div>
    </section>
  );
}
