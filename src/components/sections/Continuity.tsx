import { Activity, ClipboardCheck, DatabaseBackup, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { FloatingOrb } from "@/components/ui/FloatingOrb";
import { GlassCard } from "@/components/ui/GlassCard";
import { IconFrame } from "@/components/ui/IconFrame";
import { SectionIntro } from "@/components/ui/SectionIntro";
import { SectionShell } from "@/components/ui/SectionShell";
import { site } from "@/config/site";

const pillars = [
  {
    title: "Prevencao",
    description: "Organizacao, monitoramento e revisoes para reduzir riscos antes que virem parada.",
    icon: ShieldCheck,
  },
  {
    title: "Backup",
    description: "Rotinas de protecao e recuperacao para preservar informacoes importantes.",
    icon: DatabaseBackup,
  },
  {
    title: "Resposta",
    description: "Atendimento tecnico com prioridade definida e comunicacao objetiva.",
    icon: Activity,
  },
  {
    title: "Documentacao",
    description: "Informacoes tecnicas registradas para facilitar suporte e continuidade.",
    icon: ClipboardCheck,
  },
] as const;

export function Continuity() {
  return (
    <SectionShell id="continuidade" tone="solid">
      <FloatingOrb className="-right-20 top-10 h-80 w-96" intensity="low" />
      <div className="relative mx-auto grid max-w-7xl gap-8 px-4 sm:gap-10 sm:px-6 lg:grid-cols-[1fr_0.88fr] lg:px-8">
        <div>
          <SectionIntro
            badge="Continuidade operacional"
            title="Tecnologia organizada para a empresa continuar operando."
            size="large"
            description={
              <>
                Continuidade depende de rotina, protecao, backup, monitoramento e suporte.
                A ServerSafe ajuda a estruturar essa base de forma clara, acompanhavel e
                adequada ao porte da operacao.
              </>
            }
          />
          <div className="mt-6 sm:mt-8">
            <Button href={site.contact.supportHref} target="_blank" variant="outline">
              Falar com suporte
            </Button>
          </div>
        </div>

        <GlassCard className="p-4 sm:p-8">
          <div className="relative overflow-hidden rounded-[8px] border border-white/50 bg-white/30 p-4 shadow-sm sm:p-5">
            <div className="relative grid gap-3 sm:gap-4">
              {pillars.map(({ title, description, icon: Icon }, index) => (
                <div
                  key={title}
                  className="flex items-start gap-3 rounded-[8px] border border-white/50 bg-white/34 p-3 shadow-sm sm:gap-4 sm:p-4"
                >
                  <IconFrame icon={Icon} className="h-10 w-10 sm:h-11 sm:w-11" iconClassName="h-5 w-5" />
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-cyan-300">0{index + 1}</span>
                      <h3 className="font-bold text-slate-950">{title}</h3>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      </div>
    </SectionShell>
  );
}
