import { Activity, Cable, DatabaseBackup, RadioTower, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { FloatingOrb } from "@/components/ui/FloatingOrb";
import { GlassCard } from "@/components/ui/GlassCard";
import { SectionBadge } from "@/components/ui/SectionBadge";

const pillars = [
  {
    title: "Alta disponibilidade",
    description: "Redundância de serviços, links e pontos críticos para preservar operação.",
    icon: RadioTower,
  },
  {
    title: "Prevenção",
    description: "Monitoramento, documentação e correção antes que o risco vire parada.",
    icon: ShieldCheck,
  },
  {
    title: "Resposta rápida",
    description: "Processos claros para restaurar serviços e reduzir impacto operacional.",
    icon: Activity,
  },
  {
    title: "Recuperação de desastres",
    description: "Plano de recuperação, testes de backup e critérios claros de retorno.",
    icon: DatabaseBackup,
  },
] as const;

export function Continuity() {
  return (
    <section id="continuidade" className="relative overflow-hidden bg-white/34 py-14 sm:py-28">
      <FloatingOrb className="-right-20 top-10 h-80 w-96" intensity="low" />
      <div className="relative mx-auto grid max-w-7xl gap-8 px-4 sm:gap-10 sm:px-6 lg:grid-cols-[1fr_0.88fr] lg:px-8">
        <div>
          <SectionBadge>Continuidade operacional</SectionBadge>
          <h2 className="mt-5 text-balance text-[2rem] font-black leading-tight text-slate-950 sm:mt-6 sm:text-6xl">
            Quando sua infraestrutura para, sua empresa para.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:mt-6 sm:text-lg sm:leading-8">
            Continuidade não é improviso depois da crise. É arquitetura, redundância,
            backup testado, segurança, documentação, recuperação de desastres e suporte
            preparados antes do incidente.
          </p>
          <div className="mt-6 sm:mt-8">
            <Button href="#diagnostico" variant="outline">
              Solicitar diagnóstico
            </Button>
          </div>
        </div>

        <GlassCard className="p-4 sm:p-8">
          <div className="relative overflow-hidden rounded-[8px] border border-white/60 bg-white/48 p-4 shadow-sm sm:min-h-[360px] sm:p-5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_18%,rgba(255,255,255,0.42),transparent_36%)]" />
            <div className="relative grid gap-3 sm:gap-4">
              {pillars.map(({ title, description, icon: Icon }, index) => (
                <div
                  key={title}
                  className="flex items-start gap-3 rounded-[8px] border border-white/60 bg-white/62 p-3 shadow-sm sm:gap-4 sm:p-4"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] border border-blue-200 bg-blue-50 sm:h-11 sm:w-11">
                    <Icon className="h-5 w-5 text-blue-700" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-blue-700">0{index + 1}</span>
                      <h3 className="font-bold text-slate-950">{title}</h3>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
                  </div>
                </div>
              ))}
            </div>
            <Cable className="absolute bottom-5 right-5 hidden h-16 w-16 text-blue-200 sm:block" aria-hidden="true" />
          </div>
        </GlassCard>
      </div>
    </section>
  );
}
