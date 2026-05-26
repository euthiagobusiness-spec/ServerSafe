import { governanceItems } from "@/config/site";
import { FeatureCard } from "@/components/ui/FeatureCard";
import { GlassCard } from "@/components/ui/GlassCard";
import { SectionIntro } from "@/components/ui/SectionIntro";
import { SectionShell } from "@/components/ui/SectionShell";

export function Governance() {
  return (
    <SectionShell id="governanca">
      <div className="relative mx-auto grid max-w-7xl gap-8 px-4 sm:gap-10 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
        <div>
          <SectionIntro
            badge="Criptografia, LGPD e governança"
            title="Proteção de dados precisa aparecer na arquitetura, não só na política."
            description={
              <>
                A ServerSafe conecta infraestrutura, criptografia, controle de acesso e LGPD
                para que ambientes críticos tenham proteção técnica, evidências de governança
                e critérios claros de responsabilidade.
              </>
            }
          />
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
            <FeatureCard key={title} title={title} description={description} icon={Icon} />
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
