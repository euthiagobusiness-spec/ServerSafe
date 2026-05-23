import { solutions } from "@/config/site";
import { GlassCard } from "@/components/ui/GlassCard";
import { InteractiveGlowCard } from "@/components/ui/InteractiveGlowCard";
import { SectionBadge } from "@/components/ui/SectionBadge";

export function Solutions() {
  return (
    <section id="solucoes" className="relative overflow-hidden bg-white/18 py-20 backdrop-blur-[1px] sm:py-28">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_10%,rgba(255,255,255,0.42),transparent_30%)]" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <SectionBadge>Soluções ServerSafe</SectionBadge>
          <h2 className="mt-6 text-balance text-3xl font-black leading-tight text-slate-950 sm:text-5xl">
            Cloud, servidores e segurança para operações críticas.
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            Cada camada é pensada para estabilidade, proteção e resposta. Sem excesso visual,
            sem complexidade artificial, com decisões técnicas que sustentam a operação.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {solutions.map(({ title, description, icon: Icon }) => (
            <InteractiveGlowCard key={title}>
              <GlassCard className="h-full px-5 py-6">
                <div className="grid h-12 w-12 place-items-center rounded-[8px] border border-blue-200 bg-blue-50 shadow-sm">
                  <Icon className="h-6 w-6 text-blue-700" aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-slate-950">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
              </GlassCard>
            </InteractiveGlowCard>
          ))}
        </div>
      </div>
    </section>
  );
}
