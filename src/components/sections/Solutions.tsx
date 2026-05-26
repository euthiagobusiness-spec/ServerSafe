import { solutions } from "@/config/site";
import { FeatureCard } from "@/components/ui/FeatureCard";
import { SectionIntro } from "@/components/ui/SectionIntro";
import { SectionShell } from "@/components/ui/SectionShell";

export function Solutions() {
  return (
    <SectionShell
      id="solucoes"
      overlay={<div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_10%,rgba(255,255,255,0.42),transparent_30%)]" />}
    >
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionIntro
          badge="Soluções ServerSafe"
          title="Cloud, servidores e segurança para operações críticas."
          className="max-w-3xl"
          description={
            <>
              Cada camada é pensada para estabilidade, proteção e resposta. Sem excesso visual,
              sem complexidade artificial, com decisões técnicas que sustentam a operação.
            </>
          }
        />

        <div className="mt-8 grid gap-3 sm:mt-12 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
          {solutions.map(({ title, description, icon: Icon }) => (
            <FeatureCard key={title} title={title} description={description} icon={Icon} />
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
