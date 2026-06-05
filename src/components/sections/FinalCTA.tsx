import Image from "next/image";
import { ArrowRight, Mail, MessageCircle, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { FloatingOrb } from "@/components/ui/FloatingOrb";
import { GlassCard } from "@/components/ui/GlassCard";
import { IconFrame } from "@/components/ui/IconFrame";
import { SectionIntro } from "@/components/ui/SectionIntro";
import { site } from "@/config/site";

export function FinalCTA() {
  return (
    <section id="contato" className="relative overflow-hidden bg-white/34 px-4 py-14 sm:px-6 sm:py-28 lg:px-8">
      <FloatingOrb className="left-1/2 top-0 h-80 w-[620px] -translate-x-1/2" intensity="medium" />
      <div className="relative mx-auto max-w-5xl">
        <GlassCard className="grid gap-8 px-4 py-8 text-center sm:px-10 sm:py-14 lg:grid-cols-[1fr_260px] lg:items-center lg:text-left">
          <div>
            <IconFrame
              icon={ShieldCheck}
              className="mx-auto h-12 w-12 sm:h-14 sm:w-14 lg:mx-0"
              iconClassName="h-6 w-6 sm:h-7 sm:w-7"
            />
            <SectionIntro
              badge="Proximo passo"
              title="Sua infraestrutura esta pronta para crescer sem parar?"
              className="mx-auto mt-6 max-w-3xl lg:mx-0"
              titleClassName="mx-auto mt-5 sm:mt-6 lg:mx-0"
              descriptionClassName="mx-auto max-w-2xl lg:mx-0"
              description={
                <>
                  Solicite um diagnostico tecnico para entender riscos, prioridades e caminhos
                  de evolucao da sua base de cloud, servidores, rede, seguranca e governanca.
                </>
              }
            />

            <div className="mt-6 flex justify-center sm:mt-8 lg:justify-start">
              <Button href={site.contact.phoneHref} target="_blank">
                Solicitar diagnostico
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
              </Button>
            </div>

            <a
              href={site.contact.emailHref}
              className="mx-auto mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-[8px] px-3 py-2 text-sm font-semibold text-slate-400 transition hover:text-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-400 lg:mx-0"
            >
              <Mail className="h-4 w-4 text-cyan-300/80" aria-hidden="true" />
              {site.contact.email}
            </a>
          </div>

          <div className="mx-auto w-full max-w-[240px] lg:ml-auto">
            <a
              href={site.contact.phoneHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Abrir WhatsApp da ServerSafe pelo QR Code"
              className="group block rounded-[8px] border border-cyan-200/20 bg-white p-3 shadow-[0_18px_44px_rgba(3,7,18,0.22)] transition duration-300 hover:-translate-y-1 hover:border-cyan-200/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
            >
              <span className="relative block overflow-hidden rounded-[6px] bg-white">
                <Image
                  src="/assets/brand/server-safe-whatsapp-qr.svg"
                  alt="QR Code para contato da ServerSafe no WhatsApp"
                  width={720}
                  height={720}
                  className="h-auto w-full"
                />
                <span className="absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[6px] border-white bg-[#25d366] shadow-[0_10px_24px_rgba(3,7,18,0.26)] sm:h-16 sm:w-16">
                  <MessageCircle className="h-7 w-7 text-white sm:h-8 sm:w-8" aria-hidden="true" />
                </span>
              </span>
            </a>
            <p className="mt-3 text-center text-xs font-semibold uppercase tracking-[0.08em] text-cyan-100/75">
              Escaneie para falar no WhatsApp
            </p>
          </div>
        </GlassCard>
      </div>
    </section>
  );
}
