import { industries } from "@/config/site";
import { FeatureCard } from "@/components/ui/FeatureCard";
import { SectionIntro } from "@/components/ui/SectionIntro";
import { SectionShell } from "@/components/ui/SectionShell";

export function Industries() {
  return (
    <SectionShell id="setores">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
          <SectionIntro
            badge="Setores atendidos"
            title="Infraestrutura para empresas que lidam com rotina sensível."
            descriptionClassName="lg:hidden"
          />
          <p className="text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            Sem uso de marcas ou logos de clientes. A ServerSafe atua em ambientes que
            precisam de estabilidade, governança técnica e continuidade operacional.
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:mt-12 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
          {industries.map(({ title, description, icon: Icon }) => (
            <FeatureCard
              key={title}
              layout="row"
              title={title}
              description={description}
              icon={Icon}
              titleClassName="font-bold"
            />
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
