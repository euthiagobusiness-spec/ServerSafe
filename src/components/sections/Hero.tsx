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
      <GlassCard className="p-5 sm:p-6">
        <div className="relative overflow-hidden rounded-[8px] border border-white/60 bg-white/38 p-5 shadow-sm backdrop-blur-md">
          <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-blue-400/8" />
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Resumo operacional
              </p>
              <h2 className="mt-2 text-xl font-bold text-slate-950">Base técnica protegida e monitorada</h2>
            </div>
            <span className="rounded-[8px] bg-emerald-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700">
              Em controle
            </span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {[
              { label: "Cloud", icon: Server },
              { label: "Segurança", icon: ShieldCheck },
              { label: "Rede", icon: Network },
            ].map(({ label, icon: Icon }) => (
              <div key={label} className="rounded-[8px] border border-white/60 bg-white/42 p-4 shadow-sm backdrop-blur-sm">
                <Icon className="h-6 w-6 text-blue-700" aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold text-slate-900">{label}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-[8px] border border-white/60 bg-white/42 p-4 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
              <span>Continuidade</span>
              <span className="text-blue-700">Alta disponibilidade</span>
            </div>
            <div className="mt-4 flex items-end gap-2">
              {[42, 58, 50, 76, 68, 84, 79].map((height, index) => (
                <span
                  key={index}
                  className="w-full rounded-sm bg-gradient-to-t from-blue-700 to-cyan-500"
                  style={{ height: `${height}px` }}
                />
              ))}
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3 rounded-[8px] border border-blue-100/80 bg-blue-50/60 px-4 py-3 backdrop-blur-sm">
            <DatabaseBackup className="h-5 w-5 text-blue-700" aria-hidden="true" />
            <span className="text-sm font-semibold text-slate-800">
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
    <section id="top" className="relative isolate overflow-hidden bg-transparent pb-16 pt-10 sm:pt-16 lg:pb-24">
      <div className="absolute inset-0 -z-30 scale-[1.015] bg-[url('/assets/brand/server-safe-3d-wallpaper.png')] bg-cover bg-center opacity-75 blur-[3px]" aria-hidden="true" />
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(245,248,251,0.76)_0%,rgba(245,248,251,0.26)_42%,rgba(245,248,251,0.03)_100%)]" aria-hidden="true" />
      <TechGrid />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-white/18 via-white/6 to-white/5" />
      <div className="mx-auto grid max-w-7xl items-start gap-12 px-4 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:px-8">
        <div className="relative z-10 max-w-3xl">
          <SectionBadge>Infraestrutura empresarial</SectionBadge>
          <h1 className="mt-7 max-w-4xl text-balance text-4xl font-black leading-[1.04] tracking-normal text-slate-950 sm:text-5xl xl:text-6xl">
            Infraestrutura em nuvem para empresas que não podem parar.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
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
          <div className="mt-7 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
            {metrics.map((metric) => (
              <GlassCard key={metric.label} className="px-4 py-4">
                <span className="block font-mono text-2xl font-bold text-blue-800">{metric.value}</span>
                <span className="mt-1 block text-xs uppercase tracking-[0.10em] text-slate-500">
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

      <div className="mx-auto mt-10 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-3 border-y border-slate-200 py-5 sm:grid-cols-4 lg:grid-cols-8">
          {trustSignals.map(({ label, icon: Icon }) => (
            <div key={label} className="flex items-center gap-3 text-sm text-slate-700">
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
