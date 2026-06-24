import Image from "next/image";
import { ArrowRight, CheckCircle2, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { site } from "@/config/site";
import { vmwareHypervLanding } from "@/config/vmware-hyperv";

export function Hero() {
  const { ctas, hero, recognition } = vmwareHypervLanding;

  return (
    <section id="top" className="relative isolate overflow-hidden bg-white">
      <div className="mx-auto grid min-h-[720px] max-w-7xl gap-12 px-4 pb-16 pt-24 sm:px-6 sm:pt-28 lg:grid-cols-[0.42fr_0.58fr] lg:items-center lg:px-8">
        <div className="relative z-10">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">{hero.badge}</p>
          <h1 className="mt-6 max-w-xl text-balance text-[2.6rem] font-black leading-[1.03] tracking-normal text-slate-950 sm:text-6xl lg:text-[4.1rem]">
            {hero.title} <span className="text-blue-700">{hero.titleAccent}</span>
          </h1>
          <p className="mt-6 max-w-md text-base leading-8 text-slate-500 sm:text-lg">
            {hero.description}
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Button href="#contato" className="bg-blue-700 px-6 shadow-[0_16px_38px_rgba(29,78,216,0.22)]">
              {ctas.primary}
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
            </Button>
            <Button href="#servico" variant="outline" className="border-slate-950 bg-white px-6 text-slate-950 hover:border-blue-700">
              {ctas.secondary}
            </Button>
          </div>
        </div>

        <div className="relative min-h-[420px] overflow-hidden bg-[#142925] lg:min-h-[490px]">
          <Image
            src="/assets/brand/server-safe-3d-wallpaper.png"
            alt="Infraestrutura corporativa preparada para migracao de virtualizacao"
            width={1280}
            height={780}
            priority
            className="absolute inset-0 h-full w-full object-cover opacity-82"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(20,41,37,0.82),rgba(20,41,37,0.24)_48%,rgba(20,41,37,0.08))]" />
          <div className="absolute bottom-8 left-8 right-8 grid gap-3 sm:grid-cols-2">
            <BannerPanel label="Ambiente atual" value="VMware" />
            <BannerPanel label="Destino planejado" value="Hyper-V" />
          </div>
        </div>
      </div>

      <div className="absolute bottom-5 left-1/2 hidden -translate-x-1/2 items-center gap-2 lg:flex" aria-hidden="true">
        <span className="h-2 w-2 rounded-full bg-blue-700" />
        <span className="h-2 w-2 rounded-full bg-slate-300" />
      </div>

      <div className="border-y border-slate-100 bg-[#f8fafc]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <p className="text-center text-lg font-bold text-slate-700 sm:text-xl">{recognition.title}</p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {recognition.items.map((item) => (
              <div key={item} className="flex min-h-16 items-center justify-center gap-2 border border-slate-200 bg-white px-3 py-3 text-center text-sm font-bold text-slate-700">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
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
        className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-emerald-500 text-white shadow-[0_12px_28px_rgba(16,185,129,0.35)] transition hover:bg-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-600"
        aria-label="Falar com a ServerSafe pelo WhatsApp"
      >
        <MessageCircle className="h-7 w-7" aria-hidden="true" />
      </a>
    </section>
  );
}

function BannerPanel({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/30 bg-white/16 px-5 py-4 text-white backdrop-blur-md">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}
