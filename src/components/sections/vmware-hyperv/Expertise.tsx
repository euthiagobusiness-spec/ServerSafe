import { Award, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { vmwareHypervLanding } from "@/config/vmware-hyperv";

export function Expertise() {
  const { expertise } = vmwareHypervLanding;

  return (
    <section id="especialistas" className="relative overflow-hidden bg-white px-4 py-14 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.42fr_0.58fr] lg:items-center">
        <div>
          <h2 className="text-balance text-[2rem] font-black leading-tight text-slate-950 sm:text-5xl">
            {expertise.title}
          </h2>
          <div className="mt-7 inline-flex items-center gap-3 border border-blue-100 bg-blue-50 px-5 py-4 text-blue-900">
            <Award className="h-8 w-8 text-blue-700" aria-hidden="true" />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em]">Capacidades ServerSafe</p>
              <p className="mt-1 text-sm font-semibold text-slate-600">Infraestrutura, seguranca e continuidade</p>
            </div>
          </div>
        </div>

        <div>
          <p className="text-base leading-8 text-slate-600 sm:text-lg">{expertise.description}</p>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {expertise.badges.map((badge) => (
              <div key={badge} className="flex min-h-12 items-center gap-2 border-b border-slate-200 text-sm font-bold text-slate-700">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
                {badge}
              </div>
            ))}
          </div>
          <Button href="#servico" variant="outline" className="mt-8 border-slate-950 bg-white text-slate-950 hover:border-blue-700">
            Conheca os servicos
          </Button>
        </div>
      </div>
    </section>
  );
}
