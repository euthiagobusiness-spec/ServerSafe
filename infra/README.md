# ServerSafe Infrastructure v1

Scaffolding local e provider-agnostic para uma futura infraestrutura em VMs Ubuntu. As Fases A, B1 e B2 não alteram o runtime Next.js, o Upstash Redis v2, o Supabase Auth, o OpenHarness do Preview ou qualquer recurso remoto.

## Arquitetura

```text
Supabase Auth (inicial) -> user_id UUID canônico
                                  |
                    PostgreSQL + pgvector (dados persistentes)
                                  |
                    Valkey (cache, locks, rate limits, filas)
                                  |
         storage provider-agnostic (objetos fora do PostgreSQL)
                                  |
                    workers de documentos e planilhas
                                  |
             OpenHarness operacional via APIs controladas
```

- `infra/compose/docker-compose.yml` define PostgreSQL com pgvector e Valkey para desenvolvimento/futura Ubuntu.
- `infra/postgres/migrations/0001_infrastructure_v1.sql` é uma migration do banco próprio. Ela não referencia `auth.users`, `auth.uid()` nem objetos específicos do Supabase.
- `infra/storage/storage.ts` define a fronteira de object storage sem escolher fornecedor.
- `infra/workers/contracts.ts` e `infra/openharness/contracts.ts` são contratos, não implementações nem alterações no agente atual.
- `infra/postgres/` contém uma migration B2 e adapters SQL preparados por
  parâmetros. O executor PostgreSQL e a unidade de trabalho são injetados; não
  há driver, conexão ou credencial no repositório.
- `infra/scripts/` separa preflight, bootstrap, deploy, health-check e backup/restore. Somente o preflight e o health-check são read-only.

## Fase B1 — Document Platform Core

A B1 adiciona, ainda sem adapter produtivo, o núcleo provider-neutral da
plataforma documental:

- `infra/documents/domain.ts`, `repository.ts` e `service.ts` definem IDs,
  metadata, versões, disponibilidade por conversa e a API de aplicação.
- A API documental recebe somente `TrustedDocumentContext`, criado na fronteira
  server-side a partir de `auth.uid()`/`claims.sub` já validado. Não existe
  construtor público de owner por string; browser, prompt, cookie legado e job
  não escolhem o owner.
- `infra/storage/local.ts` é um adapter somente para desenvolvimento/testes.
  Ele deriva o caminho do objeto de owner/document/version, grava em streaming,
  verifica tamanho e SHA-256, canonicaliza o root, rejeita symlink/reparse,
  traversal e overwrite concorrente sem condição, e não cria URLs assinadas ou
  uploads multipart fictícios. A proteção contra TOCTOU é best-effort dentro
  das limitações do filesystem local e não torna este adapter produtivo.
- `infra/jobs/service.ts` cria jobs idempotentes dos tipos
  `document.extract`, `document.classify`, `document.chunk` e
  `spreadsheet.process`. `infra/workers/contracts.ts` mantém a fronteira
  futura: a fila carrega IDs e operação, nunca bytes ou conteúdo documental.
- `infra/openharness/contracts.ts` rejeita recursivamente argumentos que tentem
  transportar owner, user, principal, request ou conversation; identidade e
  conversa são server-issued no contexto autenticado.

O ciclo futuro é `initialize upload -> object storage -> complete -> version
current -> queued job`. A seleção continua explícita: `conversation_documents`
indica disponibilidade; somente `message_documents` selecionados podem formar
o contexto de uma mensagem. A identidade é fornecida pelo serviço autenticado
como owner canônico; agentes e clientes não escolhem `ownerId`.

## Fase B2 — transações e execução assíncrona

`DocumentUnitOfWork` é a fronteira para os fluxos que alteram mais de uma
entidade. O adapter local restaura snapshots em caso de erro; o
`PostgresDocumentUnitOfWork` constrói repository, jobs e upload intents com o
mesmo client transacional. A conclusão do upload torna versão, versão atual,
status `ready`, job e intent `completed` uma operação única. O object storage
continua externo: se a transação posterior falhar, o objeto é um órfão sujeito
a limpeza operacional futura, sem ser tratado como dado PostgreSQL.

`0002_infrastructure_b2.sql` adiciona o status `archived` separado do estado
terminal `deleted`, os campos de heartbeat/erro, job types pontilhados, upload intents e
um outbox transacional de metadata para publicação posterior na fila. Nenhum
binário é salvo no PostgreSQL.

`InMemoryValkeyQueue` valida envelopes, deduplica por owner/idempotency key,
controla visibility lease, heartbeat, retry, cancelamento e DLQ. O
`ValkeyQueueAdapter` recebe apenas um executor compatível com Valkey; nenhuma
operação remota é feita nesta fase. `DocumentWorkerRuntime` reserva, valida o
envelope, busca o job oficial usando contexto autorizado, compara owner,
documento, versão e operação, executa o handler metadata-only e atualiza o
ciclo `queued -> processing -> completed/failed/cancelled`.

## Fonte de verdade e cutover

Hoje, o Supabase Auth continua ativo como provedor de identidade e o runtime
atual continua usando sua arquitetura existente, incluindo ownership v2 e
Upstash Redis. Não há conexão desta Fase A com o PostgreSQL próprio e não há
dual-write.

No futuro, o PostgreSQL próprio da Infrastructure v1 será a fonte oficial dos
dados operacionais. O Supabase continuará inicialmente somente como Auth; a
migration Supabase existente não será uma segunda fonte operacional paralela.
Qualquer cutover será explícito, migrado e testado, sem dual-write permanente.

## Uso local futuro

1. Copie `infra/compose/.env.example` para um arquivo local de ambiente e substitua os placeholders por valores locais.
2. Valide a configuração com `docker compose --env-file .env -f infra/compose/docker-compose.yml config --quiet`.
3. Somente após revisão e autorização explícita, suba os serviços com Docker Compose.

Nenhum container é iniciado por esta tarefa. O `.env.example` contém somente placeholders; segredos reais não pertencem ao Git.

O arquivo SQL montado pelo Compose é uma migration do banco próprio. Nenhuma
migration foi executada nesta fase; qualquer inicialização local de um volume
PostgreSQL novo deverá ser uma ação operacional explicitamente autorizada.

## Regra documental

`documents` representa o documento persistente; `conversation_documents` representa a disponibilidade do documento em uma conversa; `message_documents` registra a seleção exata daquela mensagem. Estar disponível na conversa não autoriza incluir o documento no contexto do modelo. Uma futura camada de serviço deve enviar ao OpenHarness somente as linhas de `message_documents` explicitamente selecionadas.

## Limites desta fase

Não há migração do Redis atual, pipeline de embeddings/RAG, editor XLSX,
adapter produtivo de storage, publicação remota de fila, ferramenta OpenHarness
nova, bootstrap de VM, backup real ou deploy. O adapter local da B1/B2 é
restrito a desenvolvimento/testes e não representa persistência de produção. A primeira
VM exigirá confirmação de CPU, memória, disco, rede, domínio, política de
backup e operador responsável.
