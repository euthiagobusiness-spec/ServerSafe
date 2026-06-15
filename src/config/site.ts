import {
  BriefcaseBusiness,
  Building2,
  Cloud,
  DatabaseBackup,
  FileCheck2,
  Gavel,
  Headset,
  Mail,
  MonitorCheck,
  Phone,
  Route,
  ScanSearch,
  ShieldCheck,
  Truck,
  Workflow,
  type LucideIcon,
} from "lucide-react";

import { contact } from "@/config/contact";

export const site = {
  name: "ServerSafe",
  slogan: "Infraestrutura em nuvem e seguranca para operacoes corporativas.",
  description:
    "Cloud computing, seguranca, backup, monitoramento e suporte tecnico para empresas que precisam de estabilidade e continuidade.",
  diagnosticCta: "Solicitar atendimento",
  solutionsCta: "Conhecer servicos",
  contact: {
    email: contact.email,
    phone: contact.phone,
    phoneHref: contact.whatsappSupportHref,
    supportHref: contact.whatsappSupportHref,
    emailHref: contact.emailHref,
  },
} as const;

export type IconItem = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export const services: IconItem[] = [
  {
    title: "Cloud Computing",
    description:
      "Ambientes em nuvem estruturados para estabilidade, controle de acesso e evolucao segura.",
    icon: Cloud,
  },
  {
    title: "Firewall e Seguranca",
    description:
      "Politicas de protecao, perimetro, acesso e reducao de exposicao para ambientes corporativos.",
    icon: ShieldCheck,
  },
  {
    title: "Backup e Recuperacao",
    description:
      "Rotinas verificaveis de backup, recuperacao e continuidade para reduzir risco operacional.",
    icon: DatabaseBackup,
  },
  {
    title: "Monitoramento",
    description:
      "Acompanhamento de disponibilidade, eventos criticos e alertas para antecipar incidentes.",
    icon: MonitorCheck,
  },
  {
    title: "Suporte e Outsourcing de TI",
    description:
      "Atendimento tecnico consultivo para empresas que precisam de previsibilidade e resposta organizada.",
    icon: Headset,
  },
  {
    title: "Automacao de Processos",
    description:
      "Padronizacao de rotinas operacionais para reduzir retrabalho e melhorar o controle interno.",
    icon: Workflow,
  },
];

export const solutions = services;

export const industries = [
  {
    title: "Juridico",
    description: "Infraestrutura para escritorios e equipes que dependem de disponibilidade e sigilo.",
    icon: Gavel,
  },
  {
    title: "Corporativo",
    description: "Base tecnica para empresas com operacao administrativa, arquivos e comunicacao diaria.",
    icon: Building2,
  },
  {
    title: "Transporte",
    description: "Conectividade, suporte e continuidade para operacoes distribuidas e rotinas logisticas.",
    icon: Truck,
  },
] satisfies IconItem[];

export const processSteps = [
  {
    title: "Entendimento",
    description: "Leitura objetiva do ambiente, prioridades e riscos que impactam a operacao.",
    icon: ScanSearch,
  },
  {
    title: "Plano tecnico",
    description: "Definicao de escopo, ordem de execucao e criterios claros para evolucao.",
    icon: FileCheck2,
  },
  {
    title: "Implementacao",
    description: "Execucao organizada, comunicacao direta e controle das etapas de mudanca.",
    icon: Route,
  },
  {
    title: "Acompanhamento",
    description: "Monitoramento, suporte e ajustes para manter o ambiente estavel no dia a dia.",
    icon: MonitorCheck,
  },
] satisfies IconItem[];

export const trustSignals = [
  { label: "Cloud", icon: Cloud },
  { label: "Seguranca", icon: ShieldCheck },
  { label: "Backup", icon: DatabaseBackup },
  { label: "Monitoramento", icon: MonitorCheck },
  { label: "Suporte", icon: Headset },
  { label: "Automacao", icon: Workflow },
] as const;

export const institutionalHighlights = [
  {
    title: "Atuacao corporativa",
    description: "Projetos conduzidos com escopo claro, comunicacao objetiva e responsabilidade operacional.",
    icon: BriefcaseBusiness,
  },
  {
    title: "Servico continuo",
    description: "Acompanhamento tecnico para reduzir improvisos e manter a rotina da empresa protegida.",
    icon: MonitorCheck,
  },
  {
    title: "Base documentada",
    description: "Organizacao de informacoes tecnicas para facilitar suporte, crescimento e tomada de decisao.",
    icon: FileCheck2,
  },
] satisfies IconItem[];

export const contactLinks = [
  { label: site.contact.email, href: site.contact.emailHref, icon: Mail },
  { label: site.contact.phone, href: site.contact.supportHref, icon: Phone },
] as const;
