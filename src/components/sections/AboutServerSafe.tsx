import { Building2, ClipboardCheck, Headset, ShieldCheck } from "lucide-react";

import { GlassCard } from "@/components/ui/GlassCard";
import { IconFrame } from "@/components/ui/IconFrame";
import { SectionIntro } from "@/components/ui/SectionIntro";
import { SectionShell } from "@/components/ui/SectionShell";

const principles = [
  {
    title: "Atendimento proximo",
    description: "Contato direto, leitura do contexto e orientacao tecnica sem excesso de formalidade.",
    icon: Headset,
  },
  {
    title: "Ambientes organizados",
    description: "Padronizacao, documentacao e rotinas pensadas para suporte e continuidade.",
    icon: ClipboardCheck,
  },
  {
    title: "Seguranca aplicada",
    description: "Controles praticos para reduzir exposicao e proteger informacoes corporativas.",
    icon: ShieldCheck,
  },
] as const;

export function AboutServerSafe() {
  return (
    <SectionShell
      id="sobre"
      tone="solid"
      overlay={<div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.22),transparent_30%)]" />}
    >
      <div className="relative mx-auto grid max-w-7xl gap-8 px-4 sm:gap-10 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
        <GlassCard className="p-4 sm:p-7">
          <div className="relative overflow-hidden rounded-[8px] border border-white/50 bg-white/26 p-4 shadow-sm sm:p-6">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-700 via-cyan-600 to-slate-300" />
            <div className="flex items-start gap-4 border-b border-white/40 pb-5">
              <IconFrame icon={Building2} className="h-11 w-11" iconClassName="h-5 w-5" />
              <div>
                <h3 className="font-bold text-slate-950">ServerSafe</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Empresa de infraestrutura em nuvem, seguranca e suporte para rotinas corporativas.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {principles.map(({ title, description, icon: Icon }) => (
                <div key={title} className="rounded-[8px] border border-white/50 bg-white/34 p-4">
                  <div className="flex items-start gap-3">
                    <IconFrame icon={Icon} className="h-10 w-10" iconClassName="h-5 w-5" />
                    <div>
                      <h3 className="font-bold text-slate-950">{title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>

        <div className="self-center">
          <SectionIntro
            badge="Sobre ServerSafe"
            title="Infraestrutura tratada como base da operacao."
            description={
              <>
                A ServerSafe atua na organizacao, protecao e continuidade de ambientes
                tecnologicos para empresas que precisam manter rotina, dados e comunicacao
                funcionando com previsibilidade.
              </>
            }
          />
          <p className="mt-4 text-sm leading-7 text-slate-600 sm:mt-5 sm:text-base sm:leading-8">
            O trabalho combina cloud computing, firewall, backup, monitoramento, suporte e
            automacao de processos. A comunicacao e direta, o escopo e objetivo e as decisoes
            tecnicas sao conduzidas com foco em continuidade, seguranca e eficiencia operacional.
          </p>
        </div>
      </div>
    </SectionShell>
  );
}
