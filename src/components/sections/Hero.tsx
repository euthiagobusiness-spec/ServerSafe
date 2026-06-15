import { ArrowRight, CheckCircle2, Cloud, DatabaseBackup, Headset, MonitorCheck, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { IconFrame } from "@/components/ui/IconFrame";
import { SectionBadge } from "@/components/ui/SectionBadge";
import { TechGrid } from "@/components/ui/TechGrid";
import { site, trustSignals } from "@/config/site";

const heroServices = [
  {
    title: "Cloud Computing",
    description: "Ambientes em nuvem com controle, estabilidade e suporte tecnico.",
    icon: Cloud,
  },
  {
    title: "Seguranca e firewall",
    description: "Protecao de acesso, politicas e reducao de exposicao operacional.",
    icon: ShieldCheck,
  },
  {
    title: "Backup e monitoramento",
    description: "Rotinas de continuidade, acompanhamento e resposta organizada.",
    icon: DatabaseBackup,
  },
  {
    title: "Suporte corporativo",
    description: "Atendimento para empresas que precisam de previsibilidade no dia a dia.",
    icon: Headset,
  },
] as const;

function InstitutionalServicePanel() {
  return (
    <GlassCard className="p-4 sm:p-6">
      <div className="rounded-[8px] border border-white/50 bg-white/24 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4 border-b border-white/40 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-100/75">Atuacao principal</p>
            <h2 className="mt-2 text-xl font-bold leading-snug text-slate-950">Servicos para operacao corporativa</h2>
          </div>
          <IconFrame icon={MonitorCheck} className="h-11 w-11" iconClassName="h-5 w-5" />
        </div>

        <div className="mt-4 grid gap-3">
          {heroServices.map(({ title, description, icon: Icon }) => (
            <div key={title} className="rounded-[8px] border border-white/50 bg-white/30 p-4">
              <div className="flex items-start gap-3">
                <Icon className="mt-1 h-5 w-5 shrink-0 text-cyan-300" aria-hidden="true" />
                <div>
                  <h3 className="text-sm font-bold text-slate-950">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}

export function Hero() {
  return (
    <section id="top" className="hero-section relative isolate overflow-hidden bg-transparent pb-12 pt-8 sm:pt-16 lg:pb-24">
      <div className="hero-wallpaper absolute inset-0 -z-30 scale-[1.015] bg-[url('/assets/brand/server-safe-3d-wallpaper.png')] bg-cover bg-center opacity-75 blur-[3px]" aria-hidden="true" />
      <div className="hero-wash absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(245,248,251,0.76)_0%,rgba(245,248,251,0.26)_42%,rgba(245,248,251,0.03)_100%)]" aria-hidden="true" />
      <TechGrid />
      <div className="hero-sheen absolute inset-0 -z-10 bg-gradient-to-b from-white/18 via-white/6 to-white/5" />

      <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 sm:gap-12 sm:px-6 lg:grid-cols-[1.04fr_0.96fr] lg:px-8">
        <div className="relative z-10 max-w-3xl">
          <SectionBadge>Institucional</SectionBadge>
          <h1 className="mt-6 max-w-4xl text-balance text-[2.15rem] font-black leading-[1.05] tracking-normal text-slate-950 sm:mt-7 sm:text-5xl xl:text-6xl">
            Infraestrutura em nuvem e seguranca para operacoes corporativas.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            A ServerSafe apoia empresas com cloud computing, firewall, backup,
            monitoramento, suporte tecnico e automacao para manter ambientes estaveis,
            protegidos e preparados para crescer.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button href={site.contact.supportHref} target="_blank">
              {site.diagnosticCta}
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
            </Button>
          </div>
        </div>

        <div className="relative">
          <InstitutionalServicePanel />
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-7xl px-4 sm:mt-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-3 border-y border-slate-200 py-4 sm:grid-cols-3 sm:py-5 lg:grid-cols-6">
          {trustSignals.map(({ label, icon: Icon }) => (
            <div key={label} className="flex items-center gap-2 text-xs text-slate-700 sm:gap-3 sm:text-sm">
              <CheckCircle2 className="h-4 w-4 text-blue-700" aria-hidden="true" />
              <Icon className="h-4 w-4 text-cyan-700" aria-hidden="true" />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
