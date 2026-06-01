"use client";

import type { FormEvent } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { contact } from "@/config/contact";
import { GlassCard } from "@/components/ui/GlassCard";

const areaOptions = [
  "Cloud computing",
  "Servidores",
  "Firewall e seguranca",
  "Backup e recuperacao",
  "Failover de links",
  "Monitoramento",
  "Rede corporativa",
  "LGPD e privacidade",
] as const;

const urgencyOptions = [
  "Operacao parada agora",
  "Instabilidade recorrente",
  "Risco alto identificado",
  "Melhoria planejada",
] as const;

const selectClass =
  "min-h-12 w-full rounded-[8px] border border-white/60 bg-white/38 px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-300 focus-visible:ring-2 focus-visible:ring-blue-500/40";

const inputClass =
  "min-h-12 w-full rounded-[8px] border border-white/60 bg-white/38 px-3 text-sm font-semibold text-slate-900 placeholder:text-slate-500 outline-none transition focus:border-blue-300 focus-visible:ring-2 focus-visible:ring-blue-500/40";

const textAreaClass =
  "min-h-28 w-full resize-y rounded-[8px] border border-white/60 bg-white/38 px-3 py-3 text-sm font-semibold leading-6 text-slate-900 placeholder:text-slate-500 outline-none transition focus:border-blue-300 focus-visible:ring-2 focus-visible:ring-blue-500/40";

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function selectedAreas(formData: FormData) {
  return formData.getAll("areas").map(String).filter(Boolean);
}

function buildMessage(formData: FormData) {
  const areas = selectedAreas(formData);

  return [
    "*Pre-atendimento ServerSafe*",
    "",
    `Nome: ${field(formData, "name")}`,
    `Empresa: ${field(formData, "company")}`,
    `Contato: ${field(formData, "contact")}`,
    `E-mail: ${field(formData, "email") || "Nao informado"}`,
    "",
    `Urgencia: ${field(formData, "urgency") || "Nao informada"}`,
    `Areas envolvidas: ${areas.length ? areas.join(", ") : "Nao informado"}`,
    `Impacto atual: ${field(formData, "impact") || "Nao informado"}`,
    `Tamanho do ambiente: ${field(formData, "environmentSize") || "Nao informado"}`,
    "",
    `Backup: ${field(formData, "backup") || "Nao informado"}`,
    `Monitoramento: ${field(formData, "monitoring") || "Nao informado"}`,
    `Documentacao: ${field(formData, "documentation") || "Nao informado"}`,
    `Prazo esperado: ${field(formData, "timeline") || "Nao informado"}`,
    "",
    "Resumo tecnico:",
    field(formData, "summary"),
    "",
    "Observacao: nao foram enviados dados sensiveis neste pre-atendimento.",
  ].join("\n");
}

function buildWhatsAppUrl(message: string) {
  const url = new URL(contact.whatsappHref);
  url.searchParams.set("text", message);
  return url.toString();
}

export function PreServiceQuestionnaireForm() {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    const message = buildMessage(new FormData(form));
    const opened = window.open(buildWhatsAppUrl(message), "_blank", "noopener,noreferrer");

    if (!opened) {
      window.location.href = buildWhatsAppUrl(message);
    }
  }

  return (
    <GlassCard className="p-4 sm:p-6">
      <form onSubmit={handleSubmit} className="grid gap-5">
        <div>
          <h3 className="text-xl font-black text-slate-950 sm:text-2xl">Questionario de pre-atendimento</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Campos objetivos para orientar o primeiro diagnostico tecnico.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold text-slate-800">
            Nome
            <input name="name" required autoComplete="name" placeholder="Seu nome" className={inputClass} />
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-800">
            Empresa
            <input name="company" required autoComplete="organization" placeholder="Nome da empresa" className={inputClass} />
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
              <option>Sem parada, mas com risco</option>
              <option>Lentidao ou instabilidade</option>
              <option>Servico critico indisponivel</option>
              <option>Auditoria, LGPD ou governanca</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-800">
            Tamanho do ambiente
            <select name="environmentSize" className={selectClass} defaultValue="">
              <option value="" disabled>
                Selecione
              </option>
              <option>Ate 20 usuarios</option>
              <option>21 a 80 usuarios</option>
              <option>81 a 200 usuarios</option>
              <option>Mais de 200 usuarios</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-800">
            Backup atual
            <select name="backup" className={selectClass} defaultValue="">
              <option value="" disabled>
                Selecione
              </option>
              <option>Existe e e testado</option>
              <option>Existe, mas nao e testado</option>
              <option>Nao existe rotina clara</option>
              <option>Nao sei informar</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-800">
            Monitoramento
            <select name="monitoring" className={selectClass} defaultValue="">
              <option value="" disabled>
                Selecione
              </option>
              <option>Ativo com alertas</option>
              <option>Parcial</option>
              <option>Nao existe</option>
              <option>Nao sei informar</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-800">
            Documentacao
            <select name="documentation" className={selectClass} defaultValue="">
              <option value="" disabled>
                Selecione
              </option>
              <option>Atualizada</option>
              <option>Parcial ou antiga</option>
              <option>Inexistente</option>
              <option>Nao sei informar</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-800">
            Prazo esperado
            <select name="timeline" className={selectClass} defaultValue="">
              <option value="" disabled>
                Selecione
              </option>
              <option>Hoje</option>
              <option>Esta semana</option>
              <option>Proximos 30 dias</option>
              <option>Projeto planejado</option>
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
            <span>
              Ao clicar em solicitar diagnostico, o WhatsApp abrira com as respostas organizadas.
            </span>
          </div>
        </div>

        <button
          type="submit"
          className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-[8px] border border-blue-700 bg-blue-700 px-5 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-white shadow-[0_12px_28px_rgba(29,78,216,0.18)] transition duration-300 hover:bg-blue-800 hover:shadow-[0_16px_34px_rgba(29,78,216,0.22)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
        >
          Solicitar diagnostico
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
        </button>
      </form>
    </GlassCard>
  );
}
