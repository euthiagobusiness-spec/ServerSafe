import { processSteps } from "@/config/site";
import { GlassCard } from "@/components/ui/GlassCard";
import { SectionIntro } from "@/components/ui/SectionIntro";
import { SectionShell } from "@/components/ui/SectionShell";

export function Process() {
  return (
    <SectionShell id="processo">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionIntro
          badge="Processo de trabalho"
          title="Entendimento, plano tecnico e acompanhamento continuo."
          className="max-w-3xl"
          description={
            <>
              A atuacao da ServerSafe parte de uma conversa objetiva, define prioridades e
              segue com execucao organizada para melhorar estabilidade e suporte.
            </>
          }
        />

        <div className="mt-8 grid gap-3 sm:mt-12 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
          {processSteps.map(({ title, description, icon: Icon }, index) => (
            <GlassCard key={title} className="h-full px-4 py-4 sm:px-5 sm:py-6">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-sm text-cyan-300">0{index + 1}</span>
                <Icon className="h-5 w-5 text-cyan-300" aria-hidden="true" />
              </div>
              <h3 className="mt-5 font-bold text-slate-950 sm:mt-8">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 sm:mt-3">{description}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
