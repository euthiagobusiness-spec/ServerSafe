# Operação futura em Ubuntu

Este documento é um runbook de preparação. Nenhum passo remoto ou destrutivo faz parte das Fases A ou B1.

## Fluxo de dados

1. Supabase Auth continua sendo o provedor inicial de identidade. O serviço traduz `auth.uid()`/`claims.sub` para o `user_id` UUID canônico.
2. PostgreSQL próprio é a fonte oficial de projetos, conversas, mensagens, documentos, versões, jobs, auditoria e uso de IA.
3. Valkey contém somente estado transitório: cache, locks, rate limits, filas e leases. Nunca é fonte oficial de dados.
4. Binários originais e artefatos grandes ficam em object storage através de `StorageProvider`; PostgreSQL guarda metadata, checksum e `storage_key`.
5. Workers consomem jobs controlados e atualizam status/auditoria. Nenhum worker é iniciado pela aplicação atual.

Este é um desenho futuro. Hoje, o runtime continua na arquitetura existente,
com Supabase Auth e Upstash Redis v2; não há conexão com esta stack e não há
dual-write. A migration Supabase existente não é uma segunda fonte operacional
paralela. Um cutover futuro será explícito, migrado e testado, sem dual-write
permanente; o Supabase permanecerá inicialmente somente como Auth.

## Fase B1 — ciclo documental local

A camada de aplicação da B1 recebe um `TrustedDocumentContext` criado somente
na fronteira server-side após validar `auth.uid()`/`claims.sub` como owner
canônico. Ela coordena o repositório de metadata, o `StorageProvider` e o
`JobService` sem acoplamento ao Next.js, Redis, Supabase, S3 ou OpenHarness. O
owner não é aceito como string livre de browser, prompt, cookie ou job. O ciclo é:

1. `initializeUpload` cria o documento pendente e deriva um locator de
   `owner/document/version`.
2. O objeto é gravado pelo provider; o adapter local aceita somente
   desenvolvimento/testes, usa streaming, confirma tamanho e SHA-256,
   canonicaliza o root e verifica cada diretório/final path contra symlink,
   reparse point, traversal e locator adulterado.
3. `completeUpload` faz `head`, cria a versão, aponta a versão atual e deixa o
   documento pronto.
4. Um job é criado como `queued`, com idempotência por owner/chave.

O adapter local não emite signed URLs nem simula multipart. Essas capacidades
permanecem tipadas como não suportadas até existir um provider explícito. O
worker também é apenas uma fronteira futura: o payload contém owner, document,
version, job e operation, mas nunca bytes, texto extraído, prompt ou conteúdo
do documento. O worker deverá buscar o estado por IDs através de uma camada
autorizada.

O contrato OpenHarness também é fail-closed: argumentos são percorridos
recursivamente e não podem conter `ownerId`, `userId`, `requestId`,
`authenticatedOwner`, `principal` ou variantes snake_case, nem identidade ou
conversa server-issued dentro de estruturas genéricas.

## Isolamento documental

`conversation_documents` registra documentos disponíveis na conversa. `message_documents` registra a seleção explícita por mensagem. O serviço deve montar contexto exclusivamente a partir de `message_documents` da mensagem atual, verificar `owner_id` e `conversation_id` e rejeitar referências órfãs ou indisponíveis.

`listConversationDocuments` nunca significa “enviar todos ao modelo”. A
operação explícita `selectDocumentsForMessage` recebe somente os IDs escolhidos
para a mensagem; uma lista vazia produz contexto vazio, e documentos de outra
conversa, owner, versão, expirados, removidos ou arquivados são rejeitados.

## Serviços locais

O Compose usa PostgreSQL 16 com pgvector `0.8.6-pg16` e Valkey
`8.1.9-alpine`. Portas são publicadas somente em loopback, a rede dos serviços
é interna, volumes são persistentes e ambos têm health check. As tags são
apenas pins de versão: antes da primeira VM, devem ser fixadas por digest,
considerando a arquitetura/plataforma final. Tags, compatibilidade e política
de atualização devem ser reconfirmadas antes do rollout; esta fase não salta
para Valkey 9.x.

O arquivo `infra/compose/.env.example` é apenas um modelo. Crie o arquivo local fora do Git, substitua os placeholders e execute somente:

```bash
docker compose --env-file .env -f infra/compose/docker-compose.yml config --quiet
```

Não executar `up` sem autorização operacional específica.

## Sequência de VM

Quando houver uma VM, a sequência será: `preflight.sh` read-only, revisão humana, bootstrap do host, revisão, deploy da stack, health-check, e só então cadastro do serviço na operação. Bootstrap/deploy/backup/restore permanecem templates, retornam `NOT_IMPLEMENTED` com exit code não-zero e aguardam especificações de host e aprovação.

## Backup e restore

- PostgreSQL: `pg_dump` em formato custom, criptografado fora da VM, com retenção e teste periódico de `pg_restore` em ambiente isolado.
- Object storage: versionamento/replicação e inventário separado; o dump SQL não contém binários.
- Valkey: snapshots podem ajudar na recuperação operacional, mas não são backup de negócio.
- Auditabilidade: registrar janela, operador, checksum, origem, destino e resultado sem registrar segredos, prompts ou conteúdo sensível.

Detalhes e decisões pendentes estão em `infra/docs/costs.md` e na documentação de arquitetura do repositório.

## O que não foi feito

Não houve migração Redis v2, conexão com Supabase, alteração do Preview/Production,
criação de usuário/role remoto, upload remoto de objetos, execução de worker,
geração de embeddings, RAG, editor XLSX, novas tools ativas do OpenHarness ou
alteração do runtime Next.js. A B1 somente implementa contratos e o adapter de
storage local restrito a desenvolvimento/testes.
