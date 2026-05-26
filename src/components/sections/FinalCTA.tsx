import { ArrowRight, ShieldCheck } from "lucide-react";

import { links } from "@/config/links";
import { contactLinks } from "@/config/site";
import { Button } from "@/components/ui/Button";
import { FloatingOrb } from "@/components/ui/FloatingOrb";
import { GlassCard } from "@/components/ui/GlassCard";
import { IconFrame } from "@/components/ui/IconFrame";
import { SectionIntro } from "@/components/ui/SectionIntro";

export function FinalCTA() {
  return (
    <section id="diagnostico" className="relative overflow-hidden bg-white/34 px-4 py-14 sm:px-6 sm:py-28 lg:px-8">
      <FloatingOrb className="left-1/2 top-0 h-80 w-[620px] -translate-x-1/2" intensity="medium" />
      <div className="relative mx-auto max-w-5xl">
        <GlassCard className="px-4 py-8 text-center sm:px-10 sm:py-14">
          <IconFrame icon={ShieldCheck} className="mx-auto h-12 w-12 sm:h-14 sm:w-14" iconClassName="h-6 w-6 sm:h-7 sm:w-7" />
          <SectionIntro
            badge="Próximo passo"
            title="Sua infraestrutura está pronta para crescer sem parar?"
            className="mx-auto mt-6 max-w-3xl"
            titleClassName="mx-auto mt-5 sm:mt-6"
            descriptionClassName="mx-auto max-w-2xl"
            description={
              <>
                Solicite um diagnóstico técnico para entender riscos, prioridades e caminhos
                de evolução da sua base de cloud, servidores, rede, segurança e governança.
              </>
            }
          />
          <div className="mt-6 flex justify-center sm:mt-8">
            <Button href={links.diagnostics}>
              Solicitar diagnóstico
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
            </Button>
          </div>

          <div className="mx-auto mt-7 grid max-w-2xl gap-3 sm:grid-cols-2">
            {contactLinks.map(({ label, href, icon: Icon }) => (
              <a
                key={href}
                href={href}
                className="inline-flex min-h-12 items-center justify-center gap-3 rounded-[8px] border border-white/70 bg-white/58 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/70 hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
              >
                <Icon className="h-4 w-4 text-blue-700" aria-hidden="true" />
                {label}
              </a>
            ))}
          </div>
        </GlassCard>
      </div>
    </section>
  );
}
