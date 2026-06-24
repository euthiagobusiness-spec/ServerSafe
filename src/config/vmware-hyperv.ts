export const vmwareHypervLanding = {
  nav: [
    { label: "Servico", href: "#servico" },
    { label: "Metodo", href: "#metodo" },
    { label: "FAQ", href: "#faq" },
    { label: "Contato", href: "#contato" },
  ],
  ctas: {
    primary: "Agendar uma reuniao",
    secondary: "Saiba mais",
    header: "Fale conosco",
    final: "Solicitar avaliacao",
  },
  hero: {
    badge: "Migracao VMware para Hyper-V",
    title: "Migre seu ambiente VMware para Hyper-V com planejamento tecnico.",
    description:
      "A ServerSafe ajuda sua empresa a avaliar workloads, preparar a arquitetura Hyper-V e executar a migracao com backup, rollback e validacao pos-mudanca.",
    highlights: [
      "Diagnostico do ambiente atual",
      "Plano de migracao e rollback",
      "Execucao por janela planejada",
      "Suporte na estabilizacao",
    ],
  },
  proof: {
    eyebrow: "Servico consultivo para ambientes corporativos",
    title: "Menos improviso. Mais previsibilidade para servidores criticos.",
    items: [
      "Infraestrutura",
      "Backup",
      "Firewall",
      "Redes",
      "Continuidade",
      "Suporte tecnico",
    ],
  },
  service: {
    badge: "O que a ServerSafe faz",
    title: "Da leitura do VMware atual ao Hyper-V pronto para operar.",
    description:
      "O projeto combina avaliacao, arquitetura, execucao controlada e documentacao. O escopo final depende da quantidade de hosts, VMs, criticidade e requisitos do ambiente.",
    cards: [
      {
        title: "Avaliacao tecnica",
        description: "Mapeamento de hosts, VMs, rede, storage, backup, dependencias e riscos.",
      },
      {
        title: "Arquitetura Hyper-V",
        description: "Definicao de hosts, armazenamento, rede, organizacao das VMs e criterios de continuidade.",
      },
      {
        title: "Migracao controlada",
        description: "Conversao e ativacao por ordem de criticidade, com janela planejada e validacao.",
      },
      {
        title: "Estabilizacao",
        description: "Acompanhamento pos-migracao, ajustes tecnicos e documentacao do ambiente.",
      },
    ],
  },
  process: {
    badge: "Metodo de trabalho",
    title: "Como conduzimos a migracao",
    steps: [
      {
        title: "Diagnostico",
        description: "Entendimento do ambiente VMware, workloads, dependencias e criticidade.",
      },
      {
        title: "Plano tecnico",
        description: "Definicao de arquitetura, janela, ordem de migracao, backup e rollback.",
      },
      {
        title: "Execucao",
        description: "Migracao das VMs para Hyper-V com configuracao de rede, storage e servicos.",
      },
      {
        title: "Validacao",
        description: "Testes de acesso, aplicacoes, performance, backup e documentacao final.",
      },
    ],
  },
  form: {
    badge: "Fale com especialistas",
    title: "Solicite uma avaliacao inicial",
    description:
      "Envie os dados basicos e conte, de forma resumida, o que sua empresa precisa migrar. A ServerSafe retorna com os proximos passos.",
    securityNotice:
      "Nao envie senhas, tokens, IPs publicos, credenciais ou informacoes sensiveis pelo formulario.",
    submitLabel: "Enviar solicitacao",
    whatsappLabel: "Chamar no WhatsApp",
  },
  faq: {
    badge: "Duvidas frequentes",
    title: "Perguntas comuns antes da migracao",
    items: [
      {
        question: "Toda VM pode ser migrada?",
        answer:
          "Depende do sistema operacional, aplicacoes, drivers, rede, storage e dependencias. A avaliacao tecnica identifica restricoes antes da execucao.",
      },
      {
        question: "A empresa precisa parar?",
        answer:
          "Alguns workloads podem exigir janela planejada. O objetivo e reduzir risco com ordem de migracao, backup, validacao e plano de rollback.",
      },
      {
        question: "O Hyper-V ja fica configurado?",
        answer:
          "Pode ficar, conforme o escopo aprovado. O projeto pode incluir hosts, rede, storage, organizacao das VMs, backup e documentacao.",
      },
      {
        question: "O servico pode ser remoto?",
        answer:
          "Em muitos cenarios sim, desde que existam acesso seguro, informacoes tecnicas confiaveis e apoio local quando necessario.",
      },
      {
        question: "Quanto tempo demora?",
        answer:
          "Varia conforme quantidade de hosts, VMs, volume de dados, criticidade, testes e janelas disponiveis. A estimativa vem apos o diagnostico.",
      },
    ],
  },
  finalCta: {
    title: "Pronto para planejar a migracao?",
    description:
      "Fale com a ServerSafe e entenda o caminho mais seguro para migrar seu ambiente VMware para Hyper-V.",
  },
} as const;
