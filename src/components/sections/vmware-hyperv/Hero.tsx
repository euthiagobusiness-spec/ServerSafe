import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { vmwareHypervLanding } from "@/config/vmware-hyperv";
import { HeroFloatingContact } from "./HeroFloatingContact";
import { HeroMigrationVisual } from "./HeroMigrationVisual";
import { HeroRecognition } from "./HeroRecognition";

export function Hero() {
  const { ctas, hero } = vmwareHypervLanding;

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

        <HeroMigrationVisual />
      </div>

      <div className="absolute bottom-5 left-1/2 hidden -translate-x-1/2 items-center gap-2 lg:flex" aria-hidden="true">
        <span className="h-2 w-2 rounded-full bg-blue-700" />
        <span className="h-2 w-2 rounded-full bg-slate-300" />
      </div>

      <HeroRecognition />
      <HeroFloatingContact />
    </section>
  );
}
