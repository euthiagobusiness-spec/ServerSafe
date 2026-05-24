import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { criticalProblems } from "@/config/site";
import { GlassCard } from "@/components/ui/GlassCard";
import { InteractiveGlowCard } from "@/components/ui/InteractiveGlowCard";
import { SectionBadge } from "@/components/ui/SectionBadge";

export function CriticalProblems() {
  return (
    <section className="relative overflow-hidden bg-white/34 py-14 sm:py-28">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:gap-10 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:px-8">
        <div>
          <SectionBadge>Problema crítico</SectionBadge>
          <h2 className="mt-5 text-balance text-[1.8rem] font-black leading-tight text-slate-950 sm:mt-6 sm:text-5xl">
            A operação começa a perder controle antes da falha aparecer.
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600 sm:mt-5 sm:text-lg sm:leading-8">
            Ambientes sem visibilidade, redundância e documentação aumentam o risco de
            indisponibilidade. A ServerSafe estrutura a base tecnológica para sua empresa
            operar com estabilidade.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {criticalProblems.map((problem) => (
            <InteractiveGlowCard key={problem}>
              <GlassCard className="h-full px-4 py-4 sm:px-5 sm:py-5">
                <div className="flex items-start gap-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] border border-blue-200 bg-blue-50">
                    <AlertTriangle className="h-5 w-5 text-blue-700" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-semibold text-slate-950">{problem}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Tratado com análise técnica, priorização de risco e arquitetura de continuidade.
                    </p>
                  </div>
                </div>
              </GlassCard>
            </InteractiveGlowCard>
          ))}
          <GlassCard className="px-4 py-4 sm:col-span-2 sm:px-5 sm:py-5">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="mt-1 h-5 w-5 text-blue-700" aria-hidden="true" />
              <p className="text-sm leading-7 text-slate-700">
                Menos indisponibilidade. Mais controle. Mais continuidade. A prioridade é
                reduzir risco operacional sem promessas absolutas e sem atalhos frágeis.
              </p>
            </div>
          </GlassCard>
        </div>
      </div>
    </section>
  );
}
