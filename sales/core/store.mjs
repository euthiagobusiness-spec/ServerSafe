import { isValidStage } from "./pipeline.mjs";

export function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function normalizeDomain(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "";
  const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
  return url.hostname.replace(/^www\./, "");
}

export function validateSalesData({ prospects, interactions, suppressions, activityLog }) {
  const errors = [];
  const prospectIds = new Set();
  const domains = new Map();
  const contactEmails = new Map();
  const suppressedEmails = new Set(
    suppressions.map((item) => normalizeEmail(item.email)).filter(Boolean),
  );

  for (const prospect of prospects) {
    if (!prospect.id) errors.push("Prospect sem id.");
    if (prospectIds.has(prospect.id)) errors.push(`Prospect ID duplicado: ${prospect.id}.`);
    prospectIds.add(prospect.id);

    const domain = normalizeDomain(prospect.domain);
    if (domain) {
      if (domains.has(domain)) {
        errors.push(`Dominio duplicado: ${domain} (${domains.get(domain)} e ${prospect.id}).`);
      }
      domains.set(domain, prospect.id);
    }

    if (!isValidStage(prospect.stage)) {
      errors.push(`Estagio invalido em ${prospect.id}: ${prospect.stage}.`);
    }
    if (prospect.score !== null && prospect.score !== undefined) {
      if (!Number.isInteger(prospect.score) || prospect.score < 0 || prospect.score > 100) {
        errors.push(`Score invalido em ${prospect.id}.`);
      }
    }
    if (!Array.isArray(prospect.statusHistory) || prospect.statusHistory.length === 0) {
      errors.push(`Historico de status ausente em ${prospect.id}.`);
    }

    for (const contact of prospect.contacts ?? []) {
      const email = normalizeEmail(contact.email);
      if (!email) continue;
      if (contactEmails.has(email)) {
        errors.push(`Email duplicado: ${email} (${contactEmails.get(email)} e ${prospect.id}).`);
      }
      contactEmails.set(email, prospect.id);

      if ((prospect.optOut || suppressedEmails.has(email)) && prospect.nextAction) {
        errors.push(`Prospect suprimido ${prospect.id} nao pode ter proxima acao comercial.`);
      }
    }

    if (prospect.optOut && prospect.nextAction) {
      errors.push(`Prospect opt-out ${prospect.id} nao pode ter proxima acao.`);
    }
  }

  const interactionIds = new Set();
  for (const interaction of interactions) {
    if (!interaction.id) errors.push("Interacao sem id.");
    if (interactionIds.has(interaction.id)) errors.push(`Interacao duplicada: ${interaction.id}.`);
    interactionIds.add(interaction.id);
    if (!prospectIds.has(interaction.prospectId)) {
      errors.push(`Interacao ${interaction.id} referencia prospect inexistente.`);
    }
  }

  const activityIds = new Set();
  for (const event of activityLog) {
    if (!event.id) errors.push("Evento de atividade sem id.");
    if (activityIds.has(event.id)) errors.push(`Evento de atividade duplicado: ${event.id}.`);
    activityIds.add(event.id);
  }

  return errors;
}
