export const links = {
  solutions: "#solucoes",
  continuity: "#continuidade",
  about: "#sobre",
  process: "#processo",
  contact: "#contato",
  privacy: "#privacidade",
  terms: "#termos",
} as const;

export const navigationLinks = [
  { label: "Servicos", href: links.solutions },
  { label: "Continuidade", href: links.continuity },
  { label: "Sobre", href: links.about },
  { label: "Processo", href: links.process },
] as const;
