export const links = {
  diagnostics: "#diagnostico",
  solutions: "#solucoes",
  continuity: "#continuidade",
  industries: "#setores",
  about: "#sobre",
  process: "#processo",
  privacy: "#privacidade",
  terms: "#termos",
} as const;

export const navigationLinks = [
  { label: "Soluções", href: links.solutions },
  { label: "Continuidade", href: links.continuity },
  { label: "Pré-atendimento", href: links.diagnostics },
  { label: "Setores", href: links.industries },
  { label: "Processo", href: links.process },
] as const;
