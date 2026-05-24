import { governanceItems } from "@/config/site";
import { GlassCard } from "@/components/ui/GlassCard";
import { InteractiveGlowCard } from "@/components/ui/InteractiveGlowCard";
import { SectionBadge } from "@/components/ui/SectionBadge";

export function Governance() {
  return (
    <section id="governanca" className="relative overflow-hidden bg-white/18 py-20 sm:py-28">
      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
        <div>
          <SectionBadge>Criptografia, LGPD e governança</SectionBadge>
          <h2 className="mt-6 text-balance text-3xl font-black leading-tight text-slate-950 sm:text-5xl">
            Proteção de dados precisa aparecer na arquitetura, não só na política.
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            A ServerSafe conecta infraestrutura, criptografia, controle de acesso e LGPD
            para que ambientes críticos tenham proteção técnica, evidências de governança
            e critérios claros de responsabilidade.
          </p>
          <GlassCard className="mt-7 p-5">
            <p className="text-sm leading-7 text-slate-600">
              O trabalho considera dados em trânsito e em repouso, privilégio mínimo,
              retenção, rastreabilidade e resposta a incidentes, sempre sem promessas
              absolutas de segurança.
            </p>
          </GlassCard>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {governanceItems.map(({ title, description, icon: Icon }) => (
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
