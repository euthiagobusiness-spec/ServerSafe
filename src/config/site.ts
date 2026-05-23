import {
  Activity,
  Ambulance,
  BadgeCheck,
  BrickWallShield,
  BriefcaseBusiness,
  Building2,
  ChartBar,
  Cloud,
  DatabaseBackup,
  FileCheck2,
  FileLock,
  Gauge,
  Gavel,
  GitBranch,
  Headset,
  HeartPulse,
  KeyRound,
  Layers3,
  LockKeyhole,
  Mail,
  MonitorCheck,
  Network,
  Phone,
  RotateCcw,
  Route,
  Scale,
  ScanSearch,
  Server,
  ShieldCheck,
  Truck,
  UserCheck,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export const site = {
  name: "ServerSafe",
  slogan: "Infraestrutura em nuvem e segurança para empresas que não podem parar.",
  description:
    "Cloud computing, servidores e continuidade operacional para negócios que dependem de estabilidade, proteção e alta disponibilidade.",
  diagnosticCta: "Solicitar diagnóstico",
  solutionsCta: "Conhecer soluções",
  contact: {
    email: "neto@serversafe.com.br",
    phone: "+55 31 99310-2035",
    phoneHref: "tel:+5531993102035",
    emailHref: "mailto:neto@serversafe.com.br",
  },
} as const;

export const metrics = [
  { value: "24/7", label: "visão operacional" },
  { value: "HA", label: "arquitetura redundante" },
  { value: "DR", label: "recuperação planejada" },
] as const;

export const criticalProblems = [
  "Servidores instáveis",
  "Rede lenta",
  "Backup inseguro",
  "Risco de indisponibilidade",
  "Falta de monitoramento",
  "Ambiente sem documentação",
  "Ausência de plano de contingência",
  "Governança e privacidade sem responsável claro",
] as const;

export type IconItem = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export const solutions: IconItem[] = [
  {
    title: "Cloud Computing",
    description:
      "Ambientes em nuvem desenhados para estabilidade, elasticidade e governança técnica.",
    icon: Cloud,
  },
  {
    title: "Servidores",
    description:
      "Arquitetura, manutenção e organização de servidores para workloads corporativos.",
    icon: Server,
  },
  {
    title: "Firewall e Segurança",
    description:
      "Camadas de proteção, políticas de acesso e perímetro alinhados ao risco do negócio.",
    icon: BrickWallShield,
  },
  {
    title: "Backup e Recuperação",
    description:
      "Rotinas verificáveis de backup, recuperação e continuidade para reduzir exposição.",
    icon: RotateCcw,
  },
  {
    title: "Failover de Links",
    description:
      "Redundância de conectividade para preservar operações quando o link principal falha.",
    icon: GitBranch,
  },
  {
    title: "Monitoramento",
    description:
      "Observabilidade de servidores, rede e eventos críticos com resposta orientada por dados.",
    icon: MonitorCheck,
  },
  {
    title: "Redes Corporativas",
    description:
      "Topologias, segmentação e desempenho para ambientes que precisam escalar com controle.",
    icon: Network,
  },
  {
    title: "Suporte e Outsourcing de TI",
    description:
      "Operação técnica consultiva para empresas que precisam de proximidade e previsibilidade.",
    icon: Headset,
  },
  {
    title: "Consultoria Estratégica em TI",
    description:
      "Diagnóstico, priorização e plano de evolução para alinhar tecnologia, risco e operação.",
    icon: BriefcaseBusiness,
  },
  {
    title: "Governança e Privacidade",
    description:
      "Apoio em segurança da informação, privacidade, LGPD, classificação de dados e controles de acesso.",
    icon: FileLock,
  },
  {
    title: "BI e Indicadores",
    description:
      "Visão de dados para acompanhar disponibilidade, risco, atendimento e desempenho operacional.",
    icon: ChartBar,
  },
  {
    title: "Automação de Processos",
    description:
      "Padronização e automação de rotinas para reduzir retrabalho e aumentar controle.",
    icon: Workflow,
  },
];

export const governanceItems: IconItem[] = [
  {
    title: "Criptografia aplicada",
    description:
      "Orientação para proteger dados em trânsito e em repouso, com gestão de chaves e escopo definido.",
    icon: KeyRound,
  },
  {
    title: "Segurança da informação",
    description:
      "Políticas, controles técnicos e arquitetura para reduzir exposição sem promessas absolutas.",
    icon: LockKeyhole,
  },
  {
    title: "LGPD na operação",
    description:
      "Mapeamento de dados, bases legais, retenção, acesso e rotinas alinhadas à realidade da empresa.",
    icon: FileLock,
  },
  {
    title: "DPO e orientação executiva",
    description:
      "Apoio consultivo em proteção de dados, com comunicação técnica clara para decisores.",
    icon: UserCheck,
  },
  {
    title: "Controle e rastreabilidade",
    description:
      "Princípio do menor privilégio, revisão de acessos e evidências para reduzir dependência de informalidade.",
    icon: ShieldCheck,
  },
  {
    title: "ISO 27001 e ISO 27701",
    description:
      "Referências de boas práticas para segurança, privacidade e maturidade operacional.",
    icon: BadgeCheck,
  },
];

export const industries = [
  { title: "Jurídico", description: "Disponibilidade para prazos, documentos e operações sensíveis.", icon: Gavel },
  { title: "Saúde", description: "Base técnica estável para rotinas clínicas e administrativas.", icon: HeartPulse },
  { title: "Transporte", description: "Conectividade, dados e suporte para operações distribuídas.", icon: Truck },
  { title: "Institucional", description: "Infraestrutura organizada para governança e continuidade.", icon: Building2 },
  { title: "Operações críticas", description: "Ambientes preparados para redução de risco operacional.", icon: Activity },
  { title: "Escritórios corporativos", description: "Rede, segurança e servidores para produtividade diária.", icon: FileCheck2 },
] satisfies IconItem[];

export const processSteps = [
  {
    title: "Diagnóstico",
    description: "Leitura técnica do ambiente, prioridades e dependências de operação.",
    icon: ScanSearch,
  },
  {
    title: "Mapeamento de riscos",
    description: "Identificação de pontos de falha, exposições e fragilidades de continuidade.",
    icon: ShieldCheck,
  },
  {
    title: "Arquitetura da solução",
    description: "Desenho de cloud, servidores, rede, segurança e contingência.",
    icon: Layers3,
  },
  {
    title: "Implementação",
    description: "Execução organizada, validação técnica e documentação do ambiente.",
    icon: Route,
  },
  {
    title: "Monitoramento e suporte",
    description: "Acompanhamento contínuo, resposta técnica e evolução controlada.",
    icon: Gauge,
  },
] satisfies IconItem[];

export const trustSignals = [
  { label: "Cloud", icon: Cloud },
  { label: "Segurança", icon: ShieldCheck },
  { label: "Servidores", icon: Server },
  { label: "Rede", icon: Network },
  { label: "Continuidade", icon: Scale },
  { label: "Resposta", icon: Ambulance },
  { label: "Privacidade", icon: FileLock },
  { label: "Backup", icon: DatabaseBackup },
] as const;

export const contactLinks = [
  { label: site.contact.email, href: site.contact.emailHref, icon: Mail },
  { label: site.contact.phone, href: site.contact.phoneHref, icon: Phone },
] as const;
