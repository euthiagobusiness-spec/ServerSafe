import { industries } from "@/config/site";
import { GlassCard } from "@/components/ui/GlassCard";
import { InteractiveGlowCard } from "@/components/ui/InteractiveGlowCard";
import { SectionBadge } from "@/components/ui/SectionBadge";

export function Industries() {
  return (
    <section id="setores" className="bg-white/18 py-14 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
          <div>
            <SectionBadge>Setores atendidos</SectionBadge>
            <h2 className="mt-5 text-balance text-[1.8rem] font-black leading-tight text-slate-950 sm:mt-6 sm:text-5xl">
              Infraestrutura para empresas que lidam com rotina sensível.
            </h2>
          </div>
          <p className="text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            Sem uso de marcas ou logos de clientes. A ServerSafe atua em ambientes que
            precisam de estabilidade, governança técnica e continuidade operacional.
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:mt-12 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
          {industries.map(({ title, description, icon: Icon }) => (
            <InteractiveGlowCard key={title}>
              <GlassCard className="h-full px-4 py-4 sm:px-5 sm:py-6">
                <div className="flex items-start gap-3 sm:gap-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] border border-blue-200 bg-blue-50 sm:h-11 sm:w-11">
                    <Icon className="h-5 w-5 text-blue-700" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-950">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
                  </div>
                </div>
              </GlassCard>
            </InteractiveGlowCard>
          ))}
        </div>
      </div>
    </section>
  );
}
