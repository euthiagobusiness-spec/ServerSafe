import { industries } from "@/config/site";
import { GlassCard } from "@/components/ui/GlassCard";
import { InteractiveGlowCard } from "@/components/ui/InteractiveGlowCard";
import { SectionBadge } from "@/components/ui/SectionBadge";

export function Industries() {
  return (
    <section id="setores" className="bg-white/18 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
          <div>
            <SectionBadge>Setores atendidos</SectionBadge>
            <h2 className="mt-6 text-balance text-3xl font-black leading-tight text-slate-950 sm:text-5xl">
              Infraestrutura para empresas que lidam com rotina sensível.
            </h2>
          </div>
          <p className="text-lg leading-8 text-slate-600">
            Sem uso de marcas ou logos de clientes. A ServerSafe atua em ambientes que
            precisam de estabilidade, governança técnica e continuidade operacional.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {industries.map(({ title, description, icon: Icon }) => (
            <InteractiveGlowCard key={title}>
              <GlassCard className="h-full px-5 py-6">
                <div className="flex items-start gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[8px] border border-blue-200 bg-blue-50">
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
