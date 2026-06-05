import { contact } from "@/config/contact";
import { bypassQuestionnaireName } from "@/config/preService";

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function selectedAreas(formData: FormData) {
  return formData.getAll("areas").map(String).filter(Boolean);
}

export function isQuestionnaireBypassed(formData: FormData) {
  return formData.get(bypassQuestionnaireName) === "on";
}

export function buildPreServiceMessage(formData: FormData) {
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

export function buildBypassMessage() {
  return [
    "*Solicitacao de diagnostico ServerSafe*",
    "",
    "Cliente solicitou diagnostico sem preencher o questionario de pre-atendimento.",
    "",
    "Solicito retorno da equipe ServerSafe para iniciar o atendimento.",
  ].join("\n");
}

export function buildWhatsAppUrl(message: string) {
  const url = new URL(`https://wa.me/${contact.whatsappPhone}`);
  url.searchParams.set("text", message);
  return url.toString();
}
