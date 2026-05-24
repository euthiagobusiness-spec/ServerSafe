import { ArrowRight, CheckCircle2, DatabaseBackup, Network, Server, ShieldCheck } from "lucide-react";

import { links } from "@/config/links";
import { metrics, site, trustSignals } from "@/config/site";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { InteractiveGlowCard } from "@/components/ui/InteractiveGlowCard";
import { SectionBadge } from "@/components/ui/SectionBadge";
import { TechGrid } from "@/components/ui/TechGrid";

function HeroCoreVisual() {
  return (
    <div className="hero-visual relative mx-auto w-full max-w-[560px]">
      <GlassCard className="p-3 sm:p-6">
        <div className="relative overflow-hidden rounded-[8px] border border-white/60 bg-white/38 p-4 shadow-sm sm:p-5">
          <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-blue-400/8" />
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4 sm:items-center sm:gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Resumo operacional
              </p>
              <h2 className="mt-2 text-base font-bold leading-snug text-slate-950 sm:text-xl">Base técnica protegida e monitorada</h2>
            </div>
            <span className="shrink-0 rounded-[8px] bg-emerald-50 px-2 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-emerald-700 sm:px-3 sm:py-2 sm:text-xs">
              Em controle
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 sm:mt-5 sm:gap-4">
            {[
              { label: "Cloud", icon: Server },
              { label: "Segurança", icon: ShieldCheck },
              { label: "Rede", icon: Network },
            ].map(({ label, icon: Icon }) => (
              <div key={label} className="rounded-[8px] border border-white/60 bg-white/42 p-3 shadow-sm sm:p-4">
                <Icon className="h-5 w-5 text-blue-700 sm:h-6 sm:w-6" aria-hidden="true" />
                <p className="mt-2 text-xs font-semibold text-slate-900 sm:mt-3 sm:text-sm">{label}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-[8px] border border-white/60 bg-white/42 p-3 shadow-sm sm:mt-5 sm:p-4">
            <div className="flex items-center justify-between gap-3 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-slate-500 sm:text-xs">
              <span>Continuidade</span>
              <span className="text-blue-700">Alta disponibilidade</span>
            </div>
            <div className="mt-3 flex items-end gap-1.5 sm:mt-4 sm:gap-2">
              {[42, 58, 50, 76, 68, 84, 79].map((height, index) => (
                <span
                  key={index}
                  className="hero-bar w-full rounded-sm bg-gradient-to-t from-blue-700 to-cyan-500"
                  style={{ height: `${height}px` }}
                />
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-[8px] border border-blue-100/80 bg-blue-50/60 px-3 py-3 sm:mt-5 sm:px-4">
            <DatabaseBackup className="h-5 w-5 shrink-0 text-blue-700" aria-hidden="true" />
            <span className="text-xs font-semibold leading-5 text-slate-800 sm:text-sm">
              Backup, firewall, failover e resposta planejada
            </span>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

export function Hero() {
  return (
    <section id="top" className="hero-section relative isolate overflow-hidden bg-transparent pb-12 pt-8 sm:pt-16 lg:pb-24">
      <div className="hero-wallpaper absolute inset-0 -z-30 scale-[1.015] bg-[url('/assets/brand/server-safe-3d-wallpaper.png')] bg-cover bg-center opacity-75 blur-[3px]" aria-hidden="true" />
      <div className="hero-wash absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(245,248,251,0.76)_0%,rgba(245,248,251,0.26)_42%,rgba(245,248,251,0.03)_100%)]" aria-hidden="true" />
      <TechGrid />
      <div className="hero-sheen absolute inset-0 -z-10 bg-gradient-to-b from-white/18 via-white/6 to-white/5" />
      <div className="mx-auto grid max-w-7xl items-start gap-8 px-4 sm:gap-12 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:px-8">
        <div className="relative z-10 max-w-3xl">
          <SectionBadge>Infraestrutura empresarial</SectionBadge>
          <h1 className="mt-6 max-w-4xl text-balance text-[2.2rem] font-black leading-[1.04] tracking-normal text-slate-950 sm:mt-7 sm:text-5xl xl:text-6xl">
            Infraestrutura em nuvem para empresas que não podem parar.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            Cloud computing, servidores, segurança e continuidade operacional para
            negócios que dependem de estabilidade, proteção e alta disponibilidade.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button href={links.diagnostics}>
              {site.diagnosticCta}
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
            </Button>
            <Button href={links.solutions} variant="secondary">
              {site.solutionsCta}
            </Button>
          </div>
          <div className="mt-6 grid max-w-2xl grid-cols-3 gap-2 sm:mt-7 sm:gap-3">
            {metrics.map((metric) => (
              <GlassCard key={metric.label} className="px-3 py-3 sm:px-4 sm:py-4">
                <span className="block font-mono text-xl font-bold text-blue-800 sm:text-2xl">{metric.value}</span>
                <span className="mt-1 block text-[0.58rem] uppercase tracking-[0.08em] text-slate-500 sm:text-xs sm:tracking-[0.10em]">
                  {metric.label}
                </span>
              </GlassCard>
            ))}
          </div>
        </div>

        <InteractiveGlowCard className="relative">
          <HeroCoreVisual />
        </InteractiveGlowCard>
      </div>

      <div className="mx-auto mt-8 max-w-7xl px-4 sm:mt-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-3 border-y border-slate-200 py-4 sm:grid-cols-4 sm:py-5 lg:grid-cols-8">
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
