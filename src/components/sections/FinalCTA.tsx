import { ArrowRight, Mail, Phone, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { FloatingOrb } from "@/components/ui/FloatingOrb";
import { GlassCard } from "@/components/ui/GlassCard";
import { IconFrame } from "@/components/ui/IconFrame";
import { SectionIntro } from "@/components/ui/SectionIntro";
import { site } from "@/config/site";

export function FinalCTA() {
  return (
    <section id="contato" className="relative overflow-hidden bg-white/34 px-4 py-14 sm:px-6 sm:py-24 lg:px-8">
      <FloatingOrb className="left-1/2 top-0 h-80 w-[620px] -translate-x-1/2" intensity="low" />
      <div className="relative mx-auto max-w-5xl">
        <GlassCard className="px-4 py-8 text-center sm:px-10 sm:py-12">
          <IconFrame icon={ShieldCheck} className="mx-auto h-12 w-12 sm:h-14 sm:w-14" iconClassName="h-6 w-6 sm:h-7 sm:w-7" />
          <SectionIntro
            badge="Contato"
            title="Fale com a ServerSafe"
            className="mx-auto mt-6 max-w-3xl"
            titleClassName="mx-auto mt-5 sm:mt-6"
            descriptionClassName="mx-auto max-w-2xl"
            description={
              <>
                Para atendimento, suporte ou avaliacao inicial de infraestrutura, entre em
                contato pelos canais oficiais da ServerSafe.
              </>
            }
          />

          <div className="mt-6 flex justify-center sm:mt-8">
            <Button href={site.contact.supportHref} target="_blank">
              Solicitar atendimento
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
            </Button>
          </div>

          <div className="mx-auto mt-6 grid max-w-xl gap-3 sm:grid-cols-2">
            <a
              href={site.contact.emailHref}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] border border-cyan-200/20 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-400 transition hover:text-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-400"
            >
              <Mail className="h-4 w-4 text-cyan-300/80" aria-hidden="true" />
              {site.contact.email}
            </a>
            <a
              href={site.contact.supportHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] border border-cyan-200/20 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-400 transition hover:text-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-400"
            >
              <Phone className="h-4 w-4 text-cyan-300/80" aria-hidden="true" />
              {site.contact.phone}
            </a>
          </div>
        </GlassCard>
      </div>
    </section>
  );
}
