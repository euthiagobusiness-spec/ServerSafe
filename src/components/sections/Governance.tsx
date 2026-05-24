import { governanceItems } from "@/config/site";
import { GlassCard } from "@/components/ui/GlassCard";
import { InteractiveGlowCard } from "@/components/ui/InteractiveGlowCard";
import { SectionBadge } from "@/components/ui/SectionBadge";

export function Governance() {
  return (
    <section id="governanca" className="relative overflow-hidden bg-white/18 py-14 sm:py-28">
      <div className="relative mx-auto grid max-w-7xl gap-8 px-4 sm:gap-10 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
        <div>
          <SectionBadge>Criptografia, LGPD e governança</SectionBadge>
          <h2 className="mt-5 text-balance text-[1.8rem] font-black leading-tight text-slate-950 sm:mt-6 sm:text-5xl">
            Proteção de dados precisa aparecer na arquitetura, não só na política.
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600 sm:mt-5 sm:text-lg sm:leading-8">
            A ServerSafe conecta infraestrutura, criptografia, controle de acesso e LGPD
            para que ambientes críticos tenham proteção técnica, evidências de governança
            e critérios claros de responsabilidade.
          </p>
          <GlassCard className="mt-6 p-4 sm:mt-7 sm:p-5">
            <p className="text-sm leading-7 text-slate-600">
              O trabalho considera dados em trânsito e em repouso, privilégio mínimo,
              retenção, rastreabilidade e resposta a incidentes, sempre sem promessas
              absolutas de segurança.
            </p>
          </GlassCard>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          {governanceItems.map(({ title, description, icon: Icon }) => (
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
