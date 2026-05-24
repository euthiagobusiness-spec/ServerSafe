import { ClipboardCheck, FileLock, Server, ShieldCheck } from "lucide-react";

import { GlassCard } from "@/components/ui/GlassCard";
import { SectionBadge } from "@/components/ui/SectionBadge";

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
    <section id="sobre" className="relative overflow-hidden bg-white/34 py-20 sm:py-28">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.44),transparent_30%)]" />
      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <GlassCard className="p-6 sm:p-8">
          <div className="relative min-h-[360px] overflow-hidden rounded-[8px] border border-white/60 bg-white/48 p-6 shadow-sm">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-700 via-cyan-600 to-slate-300" />
            <div className="grid gap-4">
              {expertise.map(({ title, description, icon: Icon }) => (
                <div key={title} className="rounded-[8px] border border-white/60 bg-white/62 p-5 shadow-sm">
                  <div className="flex items-start gap-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[8px] border border-blue-200 bg-blue-50">
                      <Icon className="h-5 w-5 text-blue-700" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="font-bold text-slate-950">{title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <ShieldCheck className="absolute bottom-5 right-5 h-14 w-14 text-blue-200" aria-hidden="true" />
          </div>
        </GlassCard>

        <div className="self-center">
          <SectionBadge>Sobre Neto</SectionBadge>
          <h2 className="mt-6 text-balance text-3xl font-black leading-tight text-slate-950 sm:text-5xl">
            Autoridade técnica com proximidade de operação.
          </h2>
          <p className="mt-6 text-lg leading-8 text-slate-700">
            À frente da ServerSafe, Neto lidera projetos de infraestrutura, cloud
            computing, servidores, redes e segurança para empresas que precisam de
            estabilidade, proteção e continuidade operacional.
          </p>
          <p className="mt-5 text-base leading-8 text-slate-600">
            Com mais de 10 anos de experiência, sua atuação combina governança de TI,
            segurança da informação, privacidade, criptografia aplicada e repertório em
            DPO, LGPD e referências como ISO/IEC 27001 e ISO/IEC 27701. A abordagem é
            consultiva, próxima e orientada à realidade de cada operação.
          </p>
        </div>
      </div>
    </section>
  );
}
