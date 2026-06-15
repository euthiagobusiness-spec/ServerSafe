import { Activity, ClipboardCheck, DatabaseBackup } from "lucide-react";

import { FloatingOrb } from "@/components/ui/FloatingOrb";
import { IconFrame } from "@/components/ui/IconFrame";
import { SectionIntro } from "@/components/ui/SectionIntro";
import { SectionShell } from "@/components/ui/SectionShell";
import { industries } from "@/config/site";

const pillars = [
  {
    title: "Protecao e backup",
    description: "Rotinas verificaveis para preservar dados, acessos e informacoes importantes.",
    icon: DatabaseBackup,
  },
  {
    title: "Monitoramento e resposta",
    description: "Acompanhamento de eventos e atendimento tecnico com prioridade definida.",
    icon: Activity,
  },
  {
    title: "Documentacao tecnica",
    description: "Informacoes registradas para facilitar suporte, continuidade e crescimento.",
    icon: ClipboardCheck,
  },
] as const;

export function Continuity() {
  return (
    <SectionShell id="continuidade" tone="solid">
      <span id="setores" className="absolute -top-24" aria-hidden="true" />
      <FloatingOrb className="-right-20 top-6 h-72 w-96" intensity="low" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.86fr_1.14fr] lg:items-end">
          <SectionIntro
            badge="Continuidade e atuacao"
            title="Base tecnica para rotinas corporativas, juridicas e de transporte."
            size="large"
            description={
              <>
                A ServerSafe estrutura cloud, seguranca, backup e suporte para empresas
                que precisam manter operacao, comunicacao, arquivos e acessos funcionando
                com estabilidade.
              </>
            }
          />

          <div className="grid gap-3 border-y border-white/15 py-5 sm:grid-cols-3">
            {pillars.map(({ title, description, icon: Icon }) => (
              <div key={title} className="grid gap-3">
                <IconFrame icon={Icon} className="h-10 w-10" iconClassName="h-5 w-5" />
                <div>
                  <h3 className="text-base font-bold text-slate-950">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 grid gap-3 md:grid-cols-3">
          {industries.map(({ title, description, icon: Icon }) => (
            <div
              key={title}
              className="flex items-start gap-4 border-t border-white/18 pt-5 md:min-h-36"
            >
              <Icon className="mt-1 h-5 w-5 shrink-0 text-cyan-300" aria-hidden="true" />
              <div>
                <h3 className="text-base font-bold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
