import { ClipboardList, MessageCircle, ShieldAlert } from "lucide-react";

import { GlassCard } from "@/components/ui/GlassCard";
import { IconFrame } from "@/components/ui/IconFrame";
import { SectionIntro } from "@/components/ui/SectionIntro";
import { SectionShell } from "@/components/ui/SectionShell";
import { PreServiceQuestionnaireForm } from "@/components/sections/PreServiceQuestionnaireForm";

export function PreServiceQuestionnaire() {
  return (
    <SectionShell id="diagnostico" tone="solid">
      <div className="relative mx-auto grid max-w-7xl gap-8 px-4 sm:gap-10 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:px-8">
        <div>
          <SectionIntro
            badge="Pre-atendimento"
            title="Antes do diagnostico, organize o cenario tecnico."
            description={
              <>
                Responda as perguntas principais para a ServerSafe entender prioridade,
                impacto, ambiente e risco antes do primeiro contato. O resumo sera enviado
                pelo WhatsApp ao solicitar o diagnostico.
              </>
            }
          />

          <div className="mt-6 grid gap-3 sm:mt-8">
            <GlassCard className="p-4 sm:p-5">
              <div className="flex items-start gap-4">
                <IconFrame icon={ClipboardList} className="h-10 w-10" iconClassName="h-5 w-5" />
                <div>
                  <h3 className="font-bold text-slate-950">Triagem objetiva</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    O suporte recebe o contexto inicial sem precisar refazer perguntas basicas.
                  </p>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-4 sm:p-5">
              <div className="flex items-start gap-4">
                <IconFrame icon={ShieldAlert} className="h-10 w-10" iconClassName="h-5 w-5" />
                <div>
                  <h3 className="font-bold text-slate-950">Sem dados sensiveis</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Nao inclua senhas, tokens, chaves, IPs publicos criticos ou credenciais.
                  </p>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-4 sm:p-5">
              <div className="flex items-start gap-4">
                <IconFrame icon={MessageCircle} className="h-10 w-10" iconClassName="h-5 w-5" />
                <div>
                  <h3 className="font-bold text-slate-950">Envio pelo WhatsApp</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Ao finalizar, o WhatsApp abre com uma mensagem pronta para acelerar o atendimento.
                  </p>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>

        <PreServiceQuestionnaireForm />
      </div>
    </SectionShell>
  );
}
