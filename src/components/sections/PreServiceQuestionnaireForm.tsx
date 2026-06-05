"use client";

import type { FormEvent } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import {
  areaOptions,
  backupOptions,
  bypassQuestionnaireName,
  documentationOptions,
  environmentSizeOptions,
  impactOptions,
  monitoringOptions,
  timelineOptions,
  urgencyOptions,
} from "@/config/preService";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  buildBypassMessage,
  buildPreServiceMessage,
  buildWhatsAppUrl,
  isQuestionnaireBypassed,
} from "@/lib/preServiceWhatsApp";

const selectClass =
  "min-h-12 w-full rounded-[8px] border border-white/60 bg-white/38 px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-300 focus-visible:ring-2 focus-visible:ring-blue-500/40";

const inputClass =
  "min-h-12 w-full rounded-[8px] border border-white/60 bg-white/38 px-3 text-sm font-semibold text-slate-900 placeholder:text-slate-500 outline-none transition focus:border-blue-300 focus-visible:ring-2 focus-visible:ring-blue-500/40";

const textAreaClass =
  "min-h-28 w-full resize-y rounded-[8px] border border-white/60 bg-white/38 px-3 py-3 text-sm font-semibold leading-6 text-slate-900 placeholder:text-slate-500 outline-none transition focus:border-blue-300 focus-visible:ring-2 focus-visible:ring-blue-500/40";

function SubmitButton({ centered = false }: { centered?: boolean }) {
  return (
    <button
      type="submit"
      className={`group inline-flex min-h-12 items-center justify-center gap-2 rounded-[8px] border border-blue-700 bg-blue-700 px-5 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-white shadow-[0_12px_28px_rgba(29,78,216,0.18)] transition duration-300 hover:bg-blue-800 hover:shadow-[0_16px_34px_rgba(29,78,216,0.22)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 ${centered ? "w-full max-w-sm" : ""}`}
    >
      Solicitar diagnostico
      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
    </button>
  );
}

function RestoreQuestionnaireButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 inline-flex min-h-10 items-center justify-center rounded-[8px] border border-cyan-200/20 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-cyan-100/80 transition duration-300 hover:border-cyan-200/40 hover:bg-cyan-100/10 hover:text-cyan-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
    >
      Preencher questionario
    </button>
  );
}

type PreServiceQuestionnaireFormProps = {
  bypassQuestionnaire: boolean;
  onBypassChange: (checked: boolean) => void;
};

function QuestionnaireFields({ onBypassChange }: Pick<PreServiceQuestionnaireFormProps, "onBypassChange">) {
  return (
    <>
      <div>
        <h3 className="text-xl font-black text-slate-950 sm:text-2xl">Questionario de pre-atendimento</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Campos objetivos para orientar o primeiro diagnostico tecnico.
        </p>
      </div>

      <label className="flex items-start gap-3 rounded-[8px] border border-cyan-200/30 bg-cyan-50/10 p-3 text-sm font-semibold leading-6 text-slate-600">
        <input
          type="checkbox"
          name={bypassQuestionnaireName}
          onChange={(event) => onBypassChange(event.currentTarget.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-blue-600"
        />
        <span>Clique aqui para enviar uma solicitacao de diagnostico sem preencher o questionario.</span>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold text-slate-800">
          Nome
          <input name="name" required autoComplete="name" placeholder="Seu nome" className={inputClass} />
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-800">
          Empresa
          <input
            name="company"
            required
            autoComplete="organization"
            placeholder="Nome da empresa"
            className={inputClass}
          />
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-800">
          WhatsApp ou telefone
          <input name="contact" required autoComplete="tel" placeholder="Contato para retorno" className={inputClass} />
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-800">
          E-mail
          <input name="email" type="email" autoComplete="email" placeholder="email@empresa.com.br" className={inputClass} />
        </label>
      </div>

      <fieldset className="grid gap-3">
        <legend className="text-sm font-bold text-slate-800">Urgencia</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {urgencyOptions.map((option) => (
            <label
              key={option}
              className="flex min-h-11 items-center gap-3 rounded-[8px] border border-white/60 bg-white/38 px-3 text-sm font-semibold text-slate-700"
            >
              <input required type="radio" name="urgency" value={option} className="h-4 w-4 accent-blue-600" />
              {option}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="text-sm font-bold text-slate-800">O que precisa ser avaliado?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {areaOptions.map((option) => (
            <label
              key={option}
              className="flex min-h-11 items-center gap-3 rounded-[8px] border border-white/60 bg-white/38 px-3 text-sm font-semibold text-slate-700"
            >
              <input type="checkbox" name="areas" value={option} className="h-4 w-4 accent-blue-600" />
              {option}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold text-slate-800">
          Impacto atual
          <select name="impact" className={selectClass} defaultValue="">
            <option value="" disabled>
              Selecione
            </option>
            {impactOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-800">
          Tamanho do ambiente
          <select name="environmentSize" className={selectClass} defaultValue="">
            <option value="" disabled>
              Selecione
            </option>
            {environmentSizeOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-800">
          Backup atual
          <select name="backup" className={selectClass} defaultValue="">
            <option value="" disabled>
              Selecione
            </option>
            {backupOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-800">
          Monitoramento
          <select name="monitoring" className={selectClass} defaultValue="">
            <option value="" disabled>
              Selecione
            </option>
            {monitoringOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-800">
          Documentacao
          <select name="documentation" className={selectClass} defaultValue="">
            <option value="" disabled>
              Selecione
            </option>
            {documentationOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-800">
          Prazo esperado
          <select name="timeline" className={selectClass} defaultValue="">
            <option value="" disabled>
              Selecione
            </option>
            {timelineOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="grid gap-2 text-sm font-bold text-slate-800">
        Descreva o cenario
        <textarea
          name="summary"
          required
          className={textAreaClass}
          placeholder="Ex.: servidores instaveis, rede lenta, backup sem teste, migracao para cloud, firewall, indisponibilidade ou necessidade de governanca."
        />
      </label>

      <div className="rounded-[8px] border border-cyan-200/30 bg-cyan-50/10 px-3 py-3 text-left text-xs leading-5 text-slate-500">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" aria-hidden="true" />
          <span>Ao clicar em solicitar diagnostico, o WhatsApp abrira com as respostas organizadas.</span>
        </div>
      </div>
    </>
  );
}

export function PreServiceQuestionnaireForm({
  bypassQuestionnaire,
  onBypassChange,
}: PreServiceQuestionnaireFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const bypassed = isQuestionnaireBypassed(formData);

    if (!bypassed && !form.reportValidity()) return;

    const message = bypassed ? buildBypassMessage() : buildPreServiceMessage(formData);
    const opened = window.open(buildWhatsAppUrl(message), "_blank", "noopener,noreferrer");

    if (!opened) {
      window.location.href = buildWhatsAppUrl(message);
    }
  }

  return (
    <GlassCard className={bypassQuestionnaire ? "mx-auto w-full max-w-xl p-4 sm:p-6" : "p-4 sm:p-6"}>
      <form onSubmit={handleSubmit} noValidate className={bypassQuestionnaire ? "grid place-items-center py-4 sm:py-6" : "grid gap-5"}>
        {bypassQuestionnaire ? (
          <>
            <input type="hidden" name={bypassQuestionnaireName} value="on" />
            <SubmitButton centered />
            <RestoreQuestionnaireButton onClick={() => onBypassChange(false)} />
          </>
        ) : (
          <>
            <QuestionnaireFields onBypassChange={onBypassChange} />
            <SubmitButton />
          </>
        )}
      </form>
    </GlassCard>
  );
}
