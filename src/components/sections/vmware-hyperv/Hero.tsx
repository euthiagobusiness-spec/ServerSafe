import Image from "next/image";
import { ArrowRight, CheckCircle2, MoveRight, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { SectionBadge } from "@/components/ui/SectionBadge";
import { site } from "@/config/site";
import { vmwareHypervLanding } from "@/config/vmware-hyperv";

export function Hero() {
  const { ctas, hero, proof } = vmwareHypervLanding;

  return (
    <section id="top" className="relative isolate overflow-hidden bg-white pt-8">
      <div
        className="absolute inset-x-0 top-0 -z-10 h-[78%] bg-[linear-gradient(135deg,#eef7ff_0%,#ffffff_42%,#dff8ff_100%)]"
        aria-hidden="true"
      />
      <div
        className="absolute right-0 top-20 -z-10 h-80 w-1/2 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.14),transparent_64%)]"
        aria-hidden="true"
      />

      <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-12 pt-7 sm:px-6 sm:pb-16 sm:pt-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8 lg:pb-20">
        <div>
          <SectionBadge>{hero.badge}</SectionBadge>
          <h1 className="mt-6 max-w-4xl text-balance text-[2.25rem] font-black leading-[1.02] tracking-normal text-slate-950 sm:text-5xl xl:text-6xl">
            {hero.title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            {hero.description}
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button href="#contato">
              {ctas.primary}
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
            </Button>
            <Button href="#servico" variant="outline">
              {ctas.secondary}
            </Button>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[8px] border border-slate-200 bg-slate-950 shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
          <Image
            src="/assets/brand/server-safe-3d-wallpaper.png"
            alt="Infraestrutura de servidores e seguranca corporativa"
            width={1200}
            height={760}
            priority
            className="h-[360px] w-full object-cover opacity-72 sm:h-[460px]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.86),rgba(15,23,42,0.34)_55%,rgba(8,47,73,0.28))]" />
          <div className="absolute inset-x-4 bottom-4 grid gap-3 sm:inset-x-6 sm:bottom-6 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <VisualBlock label="Ambiente atual" title="VMware" />
            <MoveRight className="mx-auto hidden h-6 w-6 text-cyan-200 sm:block" aria-hidden="true" />
            <VisualBlock label="Ambiente planejado" title="Hyper-V" />
          </div>
          <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-[8px] border border-cyan-200/30 bg-slate-950/62 px-3 py-2 text-xs font-bold uppercase tracking-[0.10em] text-cyan-100 sm:left-6 sm:top-6">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Backup + rollback
          </div>
        </div>
      </div>

      <div className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-7 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">{proof.eyebrow}</p>
            <h2 className="mt-2 max-w-xl text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
              {proof.title}
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {proof.items.map((item) => (
              <div key={item} className="flex min-h-12 items-center gap-2 rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-700" aria-hidden="true" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      <a
        href={site.contact.supportHref}
        target="_blank"
        rel="noopener noreferrer"
        className="sr-only"
      >
        Contato direto ServerSafe
      </a>
    </section>
  );
}

function VisualBlock({ label, title }: { label: string; title: string }) {
  return (
    <div className="rounded-[8px] border border-white/18 bg-white/12 p-4 text-white shadow-[0_12px_40px_rgba(0,0,0,0.22)] backdrop-blur-md">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-100">{label}</p>
      <p className="mt-2 text-2xl font-black">{title}</p>
    </div>
  );
}
