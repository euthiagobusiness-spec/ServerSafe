# Custos e licenças — Fase A

Valores de infraestrutura de VM não são estimados antes de conhecer CPU, RAM, disco, região, fornecedor e SLA.

| Componente | Função | Software/licença | Custo atual | Custo futuro | Observação |
| --- | --- | --- | ---: | ---: | --- |
| PostgreSQL | Dados persistentes | PostgreSQL, PostgreSQL License | US$ 0 | US$ 0 software | VM, disco, backup e operação ainda não estimados |
| pgvector | Preparação semântica | PostgreSQL License / extensão open source | US$ 0 | US$ 0 software | Nenhum embedding é gerado nesta fase |
| Valkey | Cache, locks, rate limits e filas | BSD-3-Clause | US$ 0 | US$ 0 software | Não é fonte oficial dos dados |
| Docker Engine em Ubuntu | Runtime dos containers no alvo operacional | Open source / distribuição Docker Engine | US$ 0 | US$ 0 licença de software prevista | Alvo para VM; custos de VM, disco e operação são separados |
| Docker Compose plugin | Orquestração inicial | Apache 2.0 | US$ 0 | US$ 0 software | Não usar Kubernetes nesta fase |
| Docker Desktop | Ambiente desktop opcional | Termos comerciais próprios | não aplicável | não presumido | Não é requisito e não deve ser pressuposto para Production/VM |
| Workers | Jobs de documentos/planilhas | Código do projeto | US$ 0 | US$ 0 software | CPU, memória e armazenamento da VM ainda pendentes |
| Storage abstraction | Interface de objetos | Código do projeto | US$ 0 | US$ 0 software | Fornecedor S3-compatible ainda não escolhido |
| Ubuntu scripts | Preflight e operação futura | Shell / distribuição Ubuntu | US$ 0 | US$ 0 software | Não conectam nem provisionam hosts nesta fase |
| Supabase Auth | Identidade inicial | Plano Free, sujeito a limites do provedor | existente | Free inicialmente | Nenhuma alteração remota foi feita |
| Bedrock | Inferência do runtime AI atual | Serviço pago por uso | existente | variável por uso | Fora do escopo; nenhum modelo foi chamado |

As tags atuais do Compose serão posteriormente fixadas por digest; o digest
depende da arquitetura/plataforma final e as versões devem ser reconfirmadas
antes do rollout.

O custo total futuro depende principalmente da VM, disco, tráfego, retenção de backup, object storage e uso de Bedrock. A tabela não substitui uma cotação.
