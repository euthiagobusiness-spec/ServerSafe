import { ArrowRight, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { SectionBadge } from "@/components/ui/SectionBadge";
import { TechGrid } from "@/components/ui/TechGrid";
import { site, trustSignals } from "@/config/site";

export function Hero() {
  return (
    <section id="top" className="hero-section relative isolate overflow-hidden bg-transparent pb-12 pt-8 sm:pt-16 lg:pb-24">
      <div className="hero-wallpaper absolute inset-0 -z-30 scale-[1.015] bg-[url('/assets/brand/server-safe-3d-wallpaper.png')] bg-cover bg-center opacity-75 blur-[3px]" aria-hidden="true" />
      <div className="hero-wash absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(245,248,251,0.76)_0%,rgba(245,248,251,0.26)_42%,rgba(245,248,251,0.03)_100%)]" aria-hidden="true" />
      <TechGrid />
      <div className="hero-sheen absolute inset-0 -z-10 bg-gradient-to-b from-white/18 via-white/6 to-white/5" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative z-10 max-w-4xl">
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
