import { solutions } from "@/config/site";
import { GlassCard } from "@/components/ui/GlassCard";
import { InteractiveGlowCard } from "@/components/ui/InteractiveGlowCard";
import { SectionBadge } from "@/components/ui/SectionBadge";

export function Solutions() {
  return (
    <section id="solucoes" className="relative overflow-hidden bg-white/18 py-14 sm:py-28">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_10%,rgba(255,255,255,0.42),transparent_30%)]" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <SectionBadge>Soluções ServerSafe</SectionBadge>
          <h2 className="mt-5 text-balance text-[1.8rem] font-black leading-tight text-slate-950 sm:mt-6 sm:text-5xl">
            Cloud, servidores e segurança para operações críticas.
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600 sm:mt-5 sm:text-lg sm:leading-8">
            Cada camada é pensada para estabilidade, proteção e resposta. Sem excesso visual,
            sem complexidade artificial, com decisões técnicas que sustentam a operação.
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:mt-12 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
          {solutions.map(({ title, description, icon: Icon }) => (
            <InteractiveGlowCard key={title}>
              <GlassCard className="h-full px-4 py-4 sm:px-5 sm:py-6">
                <div className="grid h-10 w-10 place-items-center rounded-[8px] border border-blue-200 bg-blue-50 shadow-sm sm:h-12 sm:w-12">
                  <Icon className="h-5 w-5 text-blue-700 sm:h-6 sm:w-6" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-950 sm:mt-5 sm:text-lg">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 sm:mt-3 sm:leading-7">{description}</p>
              </GlassCard>
            </InteractiveGlowCard>
          ))}
        </div>
      </div>
    </section>
  );
}
