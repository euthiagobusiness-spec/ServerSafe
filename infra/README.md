# ServerSafe Infrastructure v1

Scaffolding local e provider-agnostic para uma futura infraestrutura em VMs Ubuntu. Esta Fase A não altera o runtime Next.js, o Upstash Redis v2, o Supabase Auth, o OpenHarness do Preview ou qualquer recurso remoto.

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
- `infra/scripts/` separa preflight, bootstrap, deploy, health-check e backup/restore. Somente o preflight e o health-check são read-only.

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

Não há migração do Redis atual, pipeline de embeddings/RAG, editor XLSX, adapter de storage, worker executável, ferramenta OpenHarness nova, bootstrap de VM, backup real ou deploy. A primeira VM exigirá confirmação de CPU, memória, disco, rede, domínio, política de backup e operador responsável.
