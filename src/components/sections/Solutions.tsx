import { solutions } from "@/config/site";
import { FeatureCard } from "@/components/ui/FeatureCard";
import { SectionIntro } from "@/components/ui/SectionIntro";
import { SectionShell } from "@/components/ui/SectionShell";

export function Solutions() {
  return (
    <SectionShell
      id="solucoes"
      overlay={<div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_10%,rgba(255,255,255,0.18),transparent_30%)]" />}
    >
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionIntro
          badge="Servicos ServerSafe"
          title="Servicos essenciais para manter a operacao sob controle."
          className="max-w-3xl"
          description={
            <>
              A ServerSafe estrutura e acompanha camadas praticas de cloud, seguranca,
              backup, monitoramento, suporte e automacao para empresas que precisam de
              continuidade e previsibilidade.
            </>
          }
        />

        <div className="mt-8 grid gap-3 sm:mt-12 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
          {solutions.map(({ title, description, icon: Icon }) => (
            <FeatureCard key={title} title={title} description={description} icon={Icon} />
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
