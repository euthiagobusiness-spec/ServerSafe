import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { criticalProblems } from "@/config/site";
import { FeatureCard } from "@/components/ui/FeatureCard";
import { GlassCard } from "@/components/ui/GlassCard";
import { SectionIntro } from "@/components/ui/SectionIntro";
import { SectionShell } from "@/components/ui/SectionShell";

export function CriticalProblems() {
  return (
    <SectionShell tone="solid" topLine>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:gap-10 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:px-8">
        <SectionIntro
          badge="Problema crítico"
          title="A operação começa a perder controle antes da falha aparecer."
          description={
            <>
              Ambientes sem visibilidade, redundância e documentação aumentam o risco de
              indisponibilidade. A ServerSafe estrutura a base tecnológica para sua empresa
              operar com estabilidade.
            </>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2">
          {criticalProblems.map((problem) => (
            <FeatureCard
              key={problem}
              layout="row"
              title={problem}
              description="Tratado com análise técnica, priorização de risco e arquitetura de continuidade."
              icon={AlertTriangle}
            />
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
    </SectionShell>
  );
}
