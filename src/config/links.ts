export const links = {
  solutions: "#solucoes",
  continuity: "#continuidade",
  industries: "#setores",
  about: "#sobre",
  process: "#processo",
  contact: "#contato",
  privacy: "#privacidade",
  terms: "#termos",
} as const;

export const navigationLinks = [
  { label: "Servicos", href: links.solutions },
  { label: "Continuidade", href: links.continuity },
  { label: "Setores", href: links.industries },
  { label: "Sobre", href: links.about },
  { label: "Processo", href: links.process },
] as const;
