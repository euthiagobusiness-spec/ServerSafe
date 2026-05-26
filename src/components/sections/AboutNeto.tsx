import { ClipboardCheck, FileLock, Server, ShieldCheck } from "lucide-react";

import { GlassCard } from "@/components/ui/GlassCard";
import { IconFrame } from "@/components/ui/IconFrame";
import { SectionIntro } from "@/components/ui/SectionIntro";
import { SectionShell } from "@/components/ui/SectionShell";

const expertise = [
  {
    title: "Infraestrutura e cloud",
    description: "Arquitetura de servidores, nuvem e redes com documentação clara.",
    icon: Server,
  },
  {
    title: "Segurança e privacidade",
    description: "Criptografia, controles de acesso e proteção de dados com visão de risco.",
    icon: FileLock,
  },
  {
    title: "Governança técnica",
    description: "Diagnóstico, priorização e execução com responsabilidade operacional.",
    icon: ClipboardCheck,
  },
] as const;

export function AboutNeto() {
  return (
    <SectionShell
      id="sobre"
      tone="solid"
      overlay={<div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.44),transparent_30%)]" />}
    >
      <div className="relative mx-auto grid max-w-7xl gap-8 px-4 sm:gap-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <GlassCard className="p-4 sm:p-8">
          <div className="relative overflow-hidden rounded-[8px] border border-white/60 bg-white/48 p-4 shadow-sm sm:min-h-[360px] sm:p-6">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-700 via-cyan-600 to-slate-300" />
            <div className="grid gap-3 sm:gap-4">
              {expertise.map(({ title, description, icon: Icon }) => (
                <div key={title} className="rounded-[8px] border border-white/60 bg-white/62 p-4 shadow-sm sm:p-5">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <IconFrame icon={Icon} className="h-10 w-10 sm:h-11 sm:w-11" iconClassName="h-5 w-5 sm:h-5 sm:w-5" />
                    <div>
                      <h3 className="font-bold text-slate-950">{title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <ShieldCheck className="absolute bottom-5 right-5 hidden h-14 w-14 text-blue-200 sm:block" aria-hidden="true" />
          </div>
        </GlassCard>

        <div className="self-center">
          <SectionIntro
            badge="Sobre Neto"
            title="Autoridade técnica com proximidade de operação."
            description={
              <>
                À frente da ServerSafe, Neto lidera projetos de infraestrutura, cloud
                computing, servidores, redes e segurança para empresas que precisam de
                estabilidade, proteção e continuidade operacional.
              </>
            }
          />
          <p className="mt-4 text-sm leading-7 text-slate-600 sm:mt-5 sm:text-base sm:leading-8">
            Com mais de 10 anos de experiência, sua atuação combina governança de TI,
            segurança da informação, privacidade, criptografia aplicada e repertório em
            DPO, LGPD e referências como ISO/IEC 27001 e ISO/IEC 27701. A abordagem é
            consultiva, próxima e orientada à realidade de cada operação.
          </p>
        </div>
      </div>
    </SectionShell>
  );
}
