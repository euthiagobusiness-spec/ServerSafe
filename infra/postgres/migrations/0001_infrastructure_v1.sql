begin;

-- This schema is for the future self-hosted PostgreSQL service. Supabase Auth
-- remains the initial identity provider, but no Supabase-only object is used.
create schema serversafe;
create extension vector;

create table serversafe.users (
  user_id uuid primary key,
  auth_provider text not null default 'supabase',
  auth_subject text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_auth_provider_check check (char_length(btrim(auth_provider)) between 1 and 64),
  constraint users_auth_subject_check check (char_length(btrim(auth_subject)) between 1 and 255),
  constraint users_provider_subject_key unique (auth_provider, auth_subject)
);

create table serversafe.profiles (
  user_id uuid primary key references serversafe.users (user_id) on delete cascade,
  display_name text,
  timezone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_check check (
    display_name is null or char_length(btrim(display_name)) between 1 and 200
  ),
  constraint profiles_timezone_check check (
    timezone is null or char_length(btrim(timezone)) between 1 and 100
  )
);

create table serversafe.projects (
  project_id uuid primary key,
  owner_id uuid not null references serversafe.users (user_id) on delete restrict,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_owner_key unique (project_id, owner_id),
  constraint projects_name_check check (char_length(btrim(name)) between 1 and 200)
);

create table serversafe.conversations (
  conversation_id uuid primary key,
  owner_id uuid not null references serversafe.users (user_id) on delete restrict,
  project_id uuid,
  title text not null default 'Nova conversa',
  model_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_owner_key unique (conversation_id, owner_id),
  constraint conversations_project_owner_fkey
    foreign key (project_id, owner_id)
    references serversafe.projects (project_id, owner_id)
    on delete set null (project_id),
  constraint conversations_title_check check (char_length(btrim(title)) between 1 and 200),
  constraint conversations_model_key_check check (
    model_key is null or char_length(btrim(model_key)) between 1 and 100
  )
);

create table serversafe.messages (
  message_id uuid primary key,
  owner_id uuid not null,
  conversation_id uuid not null,
  role text not null,
  content text not null,
  sequence_no bigint not null,
  client_request_id uuid,
  created_at timestamptz not null default now(),
  constraint messages_owner_conversation_key unique (message_id, owner_id, conversation_id),
  constraint messages_conversation_sequence_key unique (conversation_id, sequence_no),
  constraint messages_conversation_owner_fkey
    foreign key (conversation_id, owner_id)
    references serversafe.conversations (conversation_id, owner_id)
    on delete cascade,
  constraint messages_role_check check (role in ('user', 'assistant')),
  constraint messages_content_check check (char_length(content) > 0),
  constraint messages_sequence_check check (sequence_no >= 0)
);

create unique index messages_request_id_key
  on serversafe.messages (owner_id, conversation_id, client_request_id)
  where client_request_id is not null;

create table serversafe.documents (
  document_id uuid primary key,
  owner_id uuid not null references serversafe.users (user_id) on delete restrict,
  project_id uuid,
  name text not null,
  media_type text not null,
  size_bytes bigint not null,
  status text not null default 'pending',
  current_version integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint documents_owner_key unique (document_id, owner_id),
  constraint documents_project_owner_fkey
    foreign key (project_id, owner_id)
    references serversafe.projects (project_id, owner_id)
    on delete set null (project_id),
  constraint documents_name_check check (char_length(btrim(name)) between 1 and 255),
  constraint documents_media_type_check check (char_length(btrim(media_type)) between 1 and 255),
  constraint documents_size_check check (size_bytes >= 0),
  constraint documents_status_check check (
    status in ('pending', 'processing', 'ready', 'failed', 'expired', 'deleted')
  ),
  constraint documents_current_version_check check (current_version is null or current_version > 0)
);

create table serversafe.document_versions (
  version_id uuid primary key,
  owner_id uuid not null,
  document_id uuid not null,
  version_number integer not null,
  storage_key text not null,
  checksum text not null,
  size_bytes bigint not null,
  media_type text not null,
  created_at timestamptz not null default now(),
  constraint document_versions_owner_document_key unique (version_id, owner_id, document_id),
  constraint document_versions_owner_version_key unique (version_id, owner_id),
  constraint document_versions_number_key unique (document_id, version_number),
  constraint document_versions_document_owner_number_key unique (document_id, owner_id, version_number),
  constraint document_versions_storage_key_key unique (storage_key),
  constraint document_versions_document_owner_fkey
    foreign key (document_id, owner_id)
    references serversafe.documents (document_id, owner_id)
    on delete restrict,
  constraint document_versions_number_check check (version_number > 0),
  constraint document_versions_storage_key_check check (char_length(btrim(storage_key)) between 1 and 1024),
  constraint document_versions_checksum_check check (checksum ~ '^[0-9a-f]{64}$'),
  constraint document_versions_size_check check (size_bytes >= 0),
  constraint document_versions_media_type_check check (char_length(btrim(media_type)) between 1 and 255)
);

alter table serversafe.documents
  add constraint documents_current_version_fkey
  foreign key (document_id, owner_id, current_version)
  references serversafe.document_versions (document_id, owner_id, version_number)
  deferrable initially deferred;

create table serversafe.conversation_documents (
  conversation_id uuid not null,
  owner_id uuid not null,
  document_id uuid not null,
  available boolean not null default true,
  added_at timestamptz not null default now(),
  removed_at timestamptz,
  primary key (conversation_id, document_id),
  constraint conversation_documents_owner_key unique (conversation_id, owner_id, document_id),
  constraint conversation_documents_conversation_owner_fkey
    foreign key (conversation_id, owner_id)
    references serversafe.conversations (conversation_id, owner_id)
    on delete cascade,
  constraint conversation_documents_document_owner_fkey
    foreign key (document_id, owner_id)
    references serversafe.documents (document_id, owner_id)
    on delete restrict,
  constraint conversation_documents_availability_check check (
    (available and removed_at is null)
    or (not available and removed_at is not null)
  )
);

create table serversafe.message_documents (
  message_id uuid not null,
  owner_id uuid not null,
  conversation_id uuid not null,
  document_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (message_id, document_id),
  constraint message_documents_message_owner_conversation_fkey
    foreign key (message_id, owner_id, conversation_id)
    references serversafe.messages (message_id, owner_id, conversation_id)
    on delete cascade,
  constraint message_documents_conversation_owner_document_fkey
    foreign key (conversation_id, owner_id, document_id)
    references serversafe.conversation_documents (conversation_id, owner_id, document_id)
    on delete cascade
);

comment on table serversafe.conversation_documents is
  'Disponibilidade do documento na conversa; disponibilidade não autoriza uso no contexto da IA.';
comment on table serversafe.message_documents is
  'Seleção explícita por mensagem. Somente estas referências podem ser enviadas ao OpenHarness.';

create table serversafe.jobs (
  job_id uuid primary key,
  owner_id uuid not null references serversafe.users (user_id) on delete restrict,
  document_id uuid,
  document_version_id uuid,
  job_type text not null,
  status text not null default 'queued',
  attempt integer not null default 0,
  max_attempts integer not null default 3,
  available_at timestamptz not null default now(),
  lease_until timestamptz,
  idempotency_key text not null,
  parameters jsonb not null default '{}'::jsonb,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint jobs_owner_idempotency_key unique (owner_id, idempotency_key),
  constraint jobs_document_owner_fkey
    foreign key (document_id, owner_id)
    references serversafe.documents (document_id, owner_id)
    on delete restrict,
  constraint jobs_document_version_owner_fkey
    foreign key (document_version_id, owner_id)
    references serversafe.document_versions (version_id, owner_id)
    on delete restrict,
  constraint jobs_document_version_owner_document_fkey
    foreign key (document_version_id, owner_id, document_id)
    references serversafe.document_versions (version_id, owner_id, document_id)
    on delete restrict,
  constraint jobs_type_check check (job_type in ('document', 'spreadsheet', 'maintenance')),
  constraint jobs_status_check check (status in ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  constraint jobs_attempt_check check (attempt >= 0 and max_attempts > 0 and attempt <= max_attempts),
  constraint jobs_idempotency_key_check check (char_length(btrim(idempotency_key)) between 1 and 200),
  constraint jobs_completed_at_check check (
    completed_at is null or status in ('completed', 'failed', 'cancelled')
  )
);

create table serversafe.audit_events (
  audit_event_id uuid primary key,
  owner_id uuid not null references serversafe.users (user_id) on delete restrict,
  actor_user_id uuid references serversafe.users (user_id) on delete set null,
  request_id uuid,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_events_entity_type_check check (char_length(btrim(entity_type)) between 1 and 100),
  constraint audit_events_action_check check (char_length(btrim(action)) between 1 and 100)
);

create table serversafe.ai_usage (
  usage_id uuid primary key,
  owner_id uuid not null,
  conversation_id uuid not null,
  message_id uuid,
  request_id uuid,
  model_key text not null,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  latency_ms bigint,
  status text not null,
  created_at timestamptz not null default now(),
  constraint ai_usage_conversation_owner_fkey
    foreign key (conversation_id, owner_id)
    references serversafe.conversations (conversation_id, owner_id)
    on delete cascade,
  constraint ai_usage_message_owner_conversation_fkey
    foreign key (message_id, owner_id, conversation_id)
    references serversafe.messages (message_id, owner_id, conversation_id)
    on delete set null,
  constraint ai_usage_model_key_check check (char_length(btrim(model_key)) between 1 and 100),
  constraint ai_usage_token_check check (input_tokens >= 0 and output_tokens >= 0),
  constraint ai_usage_latency_check check (latency_ms is null or latency_ms >= 0),
  constraint ai_usage_status_check check (status in ('succeeded', 'failed', 'cancelled'))
);

comment on table serversafe.ai_usage is
  'Telemetria sem prompts, mensagens, documentos, thinking, ferramentas brutas ou secrets.';

create table serversafe.document_chunks (
  chunk_id uuid primary key,
  owner_id uuid not null,
  document_id uuid not null,
  version_id uuid not null,
  ordinal integer not null,
  content text not null,
  page_number integer,
  section text,
  token_start bigint,
  token_end bigint,
  token_count integer not null,
  checksum text not null,
  search_vector tsvector generated always as (
    to_tsvector('simple'::regconfig, coalesce(content, ''))
  ) stored,
  created_at timestamptz not null default now(),
  constraint document_chunks_version_owner_document_fkey
    foreign key (version_id, owner_id, document_id)
    references serversafe.document_versions (version_id, owner_id, document_id)
    on delete cascade,
  constraint document_chunks_owner_key unique (chunk_id, owner_id),
  constraint document_chunks_ordinal_key unique (version_id, ordinal),
  constraint document_chunks_ordinal_check check (ordinal >= 0),
  constraint document_chunks_content_check check (char_length(content) > 0),
  constraint document_chunks_page_check check (page_number is null or page_number > 0),
  constraint document_chunks_section_check check (section is null or char_length(section) <= 500),
  constraint document_chunks_token_range_check check (
    token_start is null or token_end is null or token_end >= token_start
  ),
  constraint document_chunks_token_count_check check (token_count > 0),
  constraint document_chunks_checksum_check check (checksum ~ '^[0-9a-f]{64}$')
);

create table serversafe.embeddings (
  embedding_id uuid primary key,
  owner_id uuid not null,
  chunk_id uuid not null,
  embedding_model text not null,
  dimensions integer not null,
  embedding vector not null,
  created_at timestamptz not null default now(),
  constraint embeddings_chunk_owner_fkey
    foreign key (chunk_id, owner_id)
    references serversafe.document_chunks (chunk_id, owner_id)
    on delete cascade,
  constraint embeddings_chunk_model_key unique (chunk_id, embedding_model),
  constraint embeddings_model_check check (char_length(btrim(embedding_model)) between 1 and 150),
  constraint embeddings_dimensions_check check (dimensions > 0),
  constraint embeddings_dimensions_match_check check (vector_dims(embedding) = dimensions)
);

create index projects_owner_updated_idx
  on serversafe.projects (owner_id, updated_at desc);
create index conversations_owner_updated_idx
  on serversafe.conversations (owner_id, updated_at desc);
create index messages_owner_conversation_sequence_idx
  on serversafe.messages (owner_id, conversation_id, sequence_no);
create index documents_owner_status_updated_idx
  on serversafe.documents (owner_id, status, updated_at desc);
create index conversation_documents_owner_idx
  on serversafe.conversation_documents (owner_id, conversation_id, available);
create index message_documents_owner_conversation_idx
  on serversafe.message_documents (owner_id, conversation_id, message_id);
create index jobs_claim_idx
  on serversafe.jobs (status, available_at, lease_until, created_at)
  where status in ('queued', 'processing');
create index audit_events_owner_created_idx
  on serversafe.audit_events (owner_id, created_at desc);
create index ai_usage_owner_created_idx
  on serversafe.ai_usage (owner_id, created_at desc);
create index document_chunks_search_vector_idx
  on serversafe.document_chunks using gin (search_vector);
create index embeddings_owner_chunk_idx
  on serversafe.embeddings (owner_id, chunk_id);

comment on table serversafe.documents is
  'Metadata persistente; binários originais ficam somente no object storage.';
comment on table serversafe.document_versions is
  'Versões apontam para storage_key e checksum; nenhum binário é salvo no PostgreSQL.';
comment on table serversafe.embeddings is
  'Preparação para memória semântica/RAG; nenhum pipeline de embeddings é criado nesta fase.';

commit;
