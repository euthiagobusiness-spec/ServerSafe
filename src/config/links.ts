export const links = {
  diagnostics: "#diagnostico",
  solutions: "#solucoes",
  continuity: "#continuidade",
  industries: "#setores",
  about: "#sobre",
  governance: "#governanca",
  process: "#processo",
  privacy: "#privacidade",
  terms: "#termos",
} as const;

export const navigationLinks = [
  { label: "Soluções", href: links.solutions },
  { label: "Continuidade", href: links.continuity },
  { label: "Governança", href: links.governance },
  { label: "Setores", href: links.industries },
  { label: "Processo", href: links.process },
] as const;
