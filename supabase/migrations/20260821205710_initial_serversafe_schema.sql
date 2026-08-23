begin;

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create or replace function private.set_serversafe_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

revoke all on function private.set_serversafe_updated_at() from public, anon, authenticated;
grant execute on function private.set_serversafe_updated_at() to service_role;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_check check (
    display_name is null
    or char_length(btrim(display_name)) between 1 and 200
  )
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete restrict,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_name_check check (
    char_length(btrim(name)) between 1 and 200
  ),
  constraint projects_id_owner_key unique (id, owner_id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete restrict,
  project_id uuid,
  title text not null default 'Nova conversa',
  documents_permanent boolean not null default false,
  model_key text,
  effort text,
  model_config_version integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_title_check check (
    char_length(btrim(title)) between 1 and 200
  ),
  constraint conversations_model_key_check check (
    model_key is null
    or char_length(btrim(model_key)) between 1 and 100
  ),
  constraint conversations_effort_check check (
    effort is null
    or effort in ('low', 'medium', 'high', 'xhigh', 'max')
  ),
  constraint conversations_model_config_version_check check (
    model_config_version is null
    or model_config_version > 0
  ),
  constraint conversations_id_owner_key unique (id, owner_id),
  constraint conversations_id_owner_project_key unique (id, owner_id, project_id),
  constraint conversations_project_owner_fkey
    foreign key (project_id, owner_id)
    references public.projects (id, owner_id)
    on delete set null (project_id)
);

comment on column public.conversations.project_id is
  'A remoção de um projeto preserva a conversa e apenas limpa sua associação ao projeto.';

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  conversation_id uuid not null,
  role text not null,
  content text not null,
  sequence bigint not null,
  client_request_id uuid,
  created_at timestamptz not null default now(),
  constraint messages_role_check check (role in ('user', 'assistant')),
  constraint messages_sequence_check check (sequence >= 0),
  constraint messages_conversation_sequence_key unique (conversation_id, sequence),
  constraint messages_owner_request_key unique (owner_id, conversation_id, client_request_id),
  constraint messages_id_owner_conversation_key unique (id, owner_id, conversation_id),
  constraint messages_conversation_owner_fkey
    foreign key (conversation_id, owner_id)
    references public.conversations (id, owner_id)
    on delete cascade
);

comment on table public.messages is
  'Armazena somente mensagens textuais; thinking, chain-of-thought e JSON bruto de ferramentas não pertencem aqui.';

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid,
  conversation_id uuid not null,
  original_filename text not null,
  detected_mime text,
  declared_size_bytes bigint not null,
  actual_size_bytes bigint,
  storage_path text,
  sha256 text,
  status text not null default 'reserved',
  token_count bigint,
  page_count integer,
  extractor_version text,
  public_error text,
  expires_at timestamptz,
  uploaded_at timestamptz,
  validation_started_at timestamptz,
  extraction_started_at timestamptz,
  indexing_started_at timestamptz,
  ready_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attachments_filename_check check (
    char_length(btrim(original_filename)) between 1 and 255
  ),
  constraint attachments_detected_mime_check check (
    detected_mime is null
    or char_length(btrim(detected_mime)) between 1 and 255
  ),
  constraint attachments_declared_size_check check (declared_size_bytes >= 0),
  constraint attachments_actual_size_check check (
    actual_size_bytes is null
    or actual_size_bytes >= 0
  ),
  constraint attachments_storage_path_check check (
    storage_path is null
    or char_length(btrim(storage_path)) between 1 and 1024
  ),
  constraint attachments_sha256_check check (
    sha256 is null
    or sha256 ~ '^[0-9a-f]{64}$'
  ),
  constraint attachments_status_check check (
    status in (
      'reserved',
      'uploaded',
      'validating',
      'extracting',
      'indexing',
      'ready',
      'failed',
      'expired',
      'deleted'
    )
  ),
  constraint attachments_token_count_check check (
    token_count is null
    or token_count between 0 and 2000000
  ),
  constraint attachments_page_count_check check (
    page_count is null
    or page_count >= 0
  ),
  constraint attachments_extractor_version_check check (
    extractor_version is null
    or char_length(btrim(extractor_version)) between 1 and 100
  ),
  constraint attachments_public_error_check check (
    public_error is null
    or char_length(public_error) <= 1000
  ),
  constraint attachments_storage_path_key unique (storage_path),
  constraint attachments_id_owner_key unique (id, owner_id),
  constraint attachments_id_owner_conversation_key unique (id, owner_id, conversation_id),
  constraint attachments_id_owner_conversation_project_key unique (
    id,
    owner_id,
    conversation_id,
    project_id
  ),
  constraint attachments_conversation_owner_fkey
    foreign key (conversation_id, owner_id)
    references public.conversations (id, owner_id)
    on delete cascade,
  constraint attachments_conversation_owner_project_fkey
    foreign key (conversation_id, owner_id, project_id)
    references public.conversations (id, owner_id, project_id)
    on update cascade
    on delete cascade
);

comment on table public.attachments is
  'O objeto privado no Storage deve ser removido pela aplicação antes da exclusão definitiva desta metadata.';

create table public.document_extractions (
  id uuid primary key default gen_random_uuid(),
  attachment_id uuid not null,
  owner_id uuid not null,
  extractor_version text not null,
  canonical_storage_path text,
  checksum text,
  character_count bigint,
  token_count bigint,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_extractions_extractor_version_check check (
    char_length(btrim(extractor_version)) between 1 and 100
  ),
  constraint document_extractions_storage_path_check check (
    canonical_storage_path is null
    or char_length(btrim(canonical_storage_path)) between 1 and 1024
  ),
  constraint document_extractions_checksum_check check (
    checksum is null
    or checksum ~ '^[0-9a-f]{64}$'
  ),
  constraint document_extractions_character_count_check check (
    character_count is null
    or character_count >= 0
  ),
  constraint document_extractions_token_count_check check (
    token_count is null
    or token_count between 0 and 2000000
  ),
  constraint document_extractions_status_check check (
    status in ('pending', 'complete', 'failed', 'deleted')
  ),
  constraint document_extractions_storage_path_key unique (canonical_storage_path),
  constraint document_extractions_attachment_version_key unique (
    attachment_id,
    extractor_version
  ),
  constraint document_extractions_attachment_owner_fkey
    foreign key (attachment_id, owner_id)
    references public.attachments (id, owner_id)
    on delete cascade
);

comment on column public.document_extractions.canonical_storage_path is
  'Aponta para o artefato canônico grande no Storage privado; o conteúdo integral não é duplicado nesta tabela.';

create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid,
  conversation_id uuid not null,
  attachment_id uuid not null,
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
  constraint document_chunks_ordinal_check check (ordinal >= 0),
  constraint document_chunks_content_check check (char_length(content) > 0),
  constraint document_chunks_page_number_check check (
    page_number is null
    or page_number > 0
  ),
  constraint document_chunks_section_check check (
    section is null
    or char_length(section) <= 500
  ),
  constraint document_chunks_token_start_check check (
    token_start is null
    or token_start >= 0
  ),
  constraint document_chunks_token_end_check check (
    token_end is null
    or token_end >= 0
  ),
  constraint document_chunks_token_range_check check (
    token_start is null
    or token_end is null
    or token_end >= token_start
  ),
  constraint document_chunks_token_count_check check (token_count > 0),
  constraint document_chunks_checksum_check check (
    checksum ~ '^[0-9a-f]{64}$'
  ),
  constraint document_chunks_attachment_ordinal_key unique (attachment_id, ordinal),
  constraint document_chunks_attachment_owner_conversation_fkey
    foreign key (attachment_id, owner_id, conversation_id)
    references public.attachments (id, owner_id, conversation_id)
    on delete cascade,
  constraint document_chunks_attachment_owner_conversation_project_fkey
    foreign key (attachment_id, owner_id, conversation_id, project_id)
    references public.attachments (id, owner_id, conversation_id, project_id)
    on update cascade
    on delete cascade
);

comment on column public.document_chunks.search_vector is
  'FTS multilíngue inicial com configuração simple; embeddings e pgvector ficam fora desta migration.';

create table public.message_attachments (
  owner_id uuid not null,
  conversation_id uuid not null,
  message_id uuid not null,
  attachment_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (message_id, attachment_id),
  constraint message_attachments_message_owner_conversation_fkey
    foreign key (message_id, owner_id, conversation_id)
    references public.messages (id, owner_id, conversation_id)
    on delete cascade,
  constraint message_attachments_attachment_owner_conversation_fkey
    foreign key (attachment_id, owner_id, conversation_id)
    references public.attachments (id, owner_id, conversation_id)
    on delete cascade
);

create table public.processing_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  attachment_id uuid not null,
  job_type text not null,
  status text not null default 'queued',
  attempt integer not null default 0,
  max_attempts integer not null default 3,
  lease_until timestamptz,
  idempotency_key text not null,
  public_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint processing_jobs_type_check check (
    job_type in ('validate', 'extract', 'index', 'purge')
  ),
  constraint processing_jobs_status_check check (
    status in ('queued', 'leased', 'processing', 'succeeded', 'failed', 'cancelled')
  ),
  constraint processing_jobs_attempt_check check (
    attempt >= 0
    and max_attempts > 0
    and attempt <= max_attempts
  ),
  constraint processing_jobs_idempotency_key_check check (
    char_length(btrim(idempotency_key)) between 1 and 200
  ),
  constraint processing_jobs_public_error_check check (
    public_error is null
    or char_length(public_error) <= 1000
  ),
  constraint processing_jobs_completed_at_check check (
    completed_at is null
    or status in ('succeeded', 'failed', 'cancelled')
  ),
  constraint processing_jobs_owner_idempotency_key unique (owner_id, idempotency_key),
  constraint processing_jobs_attachment_owner_fkey
    foreign key (attachment_id, owner_id)
    references public.attachments (id, owner_id)
    on delete cascade
);

create table public.upload_reservations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  project_id uuid,
  conversation_id uuid not null,
  attachment_id uuid not null,
  idempotency_key text not null,
  reserved_bytes bigint not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  consumed_at timestamptz,
  constraint upload_reservations_idempotency_key_check check (
    char_length(btrim(idempotency_key)) between 1 and 200
  ),
  constraint upload_reservations_reserved_bytes_check check (reserved_bytes > 0),
  constraint upload_reservations_expiry_check check (expires_at > created_at),
  constraint upload_reservations_consumed_at_check check (
    consumed_at is null
    or consumed_at >= created_at
  ),
  constraint upload_reservations_owner_project_idempotency_key
    unique nulls not distinct (owner_id, project_id, idempotency_key),
  constraint upload_reservations_attachment_owner_conversation_fkey
    foreign key (attachment_id, owner_id, conversation_id)
    references public.attachments (id, owner_id, conversation_id)
    on delete cascade,
  constraint upload_reservations_attachment_owner_conversation_project_fkey
    foreign key (attachment_id, owner_id, conversation_id, project_id)
    references public.attachments (id, owner_id, conversation_id, project_id)
    on update cascade
    on delete cascade
);

create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  conversation_id uuid not null,
  message_id uuid,
  model_key text not null,
  effort text,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  cache_read_tokens bigint not null default 0,
  cache_write_tokens bigint not null default 0,
  latency_ms bigint,
  status text not null,
  created_at timestamptz not null default now(),
  constraint ai_usage_model_key_check check (
    char_length(btrim(model_key)) between 1 and 100
  ),
  constraint ai_usage_effort_check check (
    effort is null
    or effort in ('low', 'medium', 'high', 'xhigh', 'max')
  ),
  constraint ai_usage_token_counts_check check (
    input_tokens >= 0
    and output_tokens >= 0
    and cache_read_tokens >= 0
    and cache_write_tokens >= 0
  ),
  constraint ai_usage_latency_check check (
    latency_ms is null
    or latency_ms >= 0
  ),
  constraint ai_usage_status_check check (
    status in ('succeeded', 'failed', 'cancelled')
  ),
  constraint ai_usage_conversation_owner_fkey
    foreign key (conversation_id, owner_id)
    references public.conversations (id, owner_id)
    on delete cascade,
  constraint ai_usage_message_owner_conversation_fkey
    foreign key (message_id, owner_id, conversation_id)
    references public.messages (id, owner_id, conversation_id)
    on delete set null (message_id)
);

comment on table public.ai_usage is
  'Registra somente telemetria de uso; prompts, mensagens, documentos, thinking e secrets são proibidos.';

create table private.legacy_owner_migrations (
  id uuid primary key default gen_random_uuid(),
  legacy_owner_hash text not null,
  user_id uuid not null references auth.users (id) on delete restrict,
  source_digest text,
  status text not null default 'pending',
  attempt_count integer not null default 0,
  migrated_record_count bigint not null default 0,
  migrated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint legacy_owner_migrations_owner_hash_check check (
    legacy_owner_hash ~ '^[0-9a-f]{64}$'
  ),
  constraint legacy_owner_migrations_source_digest_check check (
    source_digest is null
    or source_digest ~ '^[0-9a-f]{64}$'
  ),
  constraint legacy_owner_migrations_status_check check (
    status in ('pending', 'running', 'succeeded', 'failed')
  ),
  constraint legacy_owner_migrations_attempt_count_check check (attempt_count >= 0),
  constraint legacy_owner_migrations_record_count_check check (migrated_record_count >= 0),
  constraint legacy_owner_migrations_owner_hash_key unique (legacy_owner_hash)
);

comment on table private.legacy_owner_migrations is
  'Controle técnico server-only para uma futura migração explícita do Redis legado.';

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_serversafe_updated_at();

create trigger projects_set_updated_at
before update on public.projects
for each row execute function private.set_serversafe_updated_at();

create trigger conversations_set_updated_at
before update on public.conversations
for each row execute function private.set_serversafe_updated_at();

create trigger attachments_set_updated_at
before update on public.attachments
for each row execute function private.set_serversafe_updated_at();

create trigger document_extractions_set_updated_at
before update on public.document_extractions
for each row execute function private.set_serversafe_updated_at();

create trigger processing_jobs_set_updated_at
before update on public.processing_jobs
for each row execute function private.set_serversafe_updated_at();

create trigger legacy_owner_migrations_set_updated_at
before update on private.legacy_owner_migrations
for each row execute function private.set_serversafe_updated_at();

create index projects_owner_updated_idx
  on public.projects (owner_id, updated_at desc);

create index conversations_owner_updated_idx
  on public.conversations (owner_id, updated_at desc);

create index conversations_project_owner_idx
  on public.conversations (project_id, owner_id)
  where project_id is not null;

create index messages_owner_conversation_sequence_idx
  on public.messages (owner_id, conversation_id, sequence);

create index messages_conversation_owner_idx
  on public.messages (conversation_id, owner_id);

create index attachments_owner_conversation_created_idx
  on public.attachments (owner_id, conversation_id, created_at desc);

create index attachments_owner_status_updated_idx
  on public.attachments (owner_id, status, updated_at desc);

create index attachments_conversation_owner_project_idx
  on public.attachments (conversation_id, owner_id, project_id);

create index attachments_expires_at_idx
  on public.attachments (expires_at)
  where expires_at is not null
    and status not in ('expired', 'deleted');

create index document_extractions_owner_attachment_idx
  on public.document_extractions (owner_id, attachment_id);

create index document_extractions_attachment_owner_idx
  on public.document_extractions (attachment_id, owner_id);

create index document_chunks_owner_conversation_attachment_idx
  on public.document_chunks (owner_id, conversation_id, attachment_id, ordinal);

create index document_chunks_attachment_owner_conversation_project_idx
  on public.document_chunks (attachment_id, owner_id, conversation_id, project_id);

create index document_chunks_search_vector_idx
  on public.document_chunks using gin (search_vector);

create index message_attachments_owner_conversation_idx
  on public.message_attachments (owner_id, conversation_id);

create index message_attachments_attachment_owner_conversation_idx
  on public.message_attachments (attachment_id, owner_id, conversation_id);

create index processing_jobs_owner_attachment_created_idx
  on public.processing_jobs (owner_id, attachment_id, created_at desc);

create index processing_jobs_attachment_owner_idx
  on public.processing_jobs (attachment_id, owner_id);

create index processing_jobs_claim_idx
  on public.processing_jobs (status, lease_until, created_at)
  where status in ('queued', 'leased', 'processing');

create index upload_reservations_owner_conversation_created_idx
  on public.upload_reservations (owner_id, conversation_id, created_at desc);

create index upload_reservations_attachment_owner_conversation_project_idx
  on public.upload_reservations (attachment_id, owner_id, conversation_id, project_id);

create index upload_reservations_expires_at_idx
  on public.upload_reservations (expires_at)
  where consumed_at is null;

create index ai_usage_owner_conversation_created_idx
  on public.ai_usage (owner_id, conversation_id, created_at desc);

create index ai_usage_conversation_owner_idx
  on public.ai_usage (conversation_id, owner_id);

create index ai_usage_message_owner_conversation_idx
  on public.ai_usage (message_id, owner_id, conversation_id)
  where message_id is not null;

create index legacy_owner_migrations_user_idx
  on private.legacy_owner_migrations (user_id);

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.attachments enable row level security;
alter table public.document_extractions enable row level security;
alter table public.document_chunks enable row level security;
alter table public.message_attachments enable row level security;
alter table public.processing_jobs enable row level security;
alter table public.upload_reservations enable row level security;
alter table public.ai_usage enable row level security;
alter table private.legacy_owner_migrations enable row level security;

create policy profiles_select_own
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy profiles_insert_own
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

create policy profiles_update_own
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy profiles_delete_own
on public.profiles for delete
to authenticated
using ((select auth.uid()) = id);

create policy projects_select_own
on public.projects for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy projects_insert_own
on public.projects for insert
to authenticated
with check ((select auth.uid()) = owner_id);

create policy projects_update_own
on public.projects for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy projects_delete_own
on public.projects for delete
to authenticated
using ((select auth.uid()) = owner_id);

create policy conversations_select_own
on public.conversations for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy conversations_insert_own
on public.conversations for insert
to authenticated
with check ((select auth.uid()) = owner_id);

create policy conversations_update_own
on public.conversations for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy conversations_delete_own
on public.conversations for delete
to authenticated
using ((select auth.uid()) = owner_id);

create policy messages_select_own
on public.messages for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy messages_insert_own
on public.messages for insert
to authenticated
with check ((select auth.uid()) = owner_id);

create policy messages_update_own
on public.messages for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy messages_delete_own
on public.messages for delete
to authenticated
using ((select auth.uid()) = owner_id);

create policy attachments_select_own
on public.attachments for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy message_attachments_select_own
on public.message_attachments for select
to authenticated
using ((select auth.uid()) = owner_id);

revoke all on table public.profiles from public, anon, authenticated, service_role;
revoke all on table public.projects from public, anon, authenticated, service_role;
revoke all on table public.conversations from public, anon, authenticated, service_role;
revoke all on table public.messages from public, anon, authenticated, service_role;
revoke all on table public.attachments from public, anon, authenticated, service_role;
revoke all on table public.document_extractions from public, anon, authenticated, service_role;
revoke all on table public.document_chunks from public, anon, authenticated, service_role;
revoke all on table public.message_attachments from public, anon, authenticated, service_role;
revoke all on table public.processing_jobs from public, anon, authenticated, service_role;
revoke all on table public.upload_reservations from public, anon, authenticated, service_role;
revoke all on table public.ai_usage from public, anon, authenticated, service_role;
revoke all on table private.legacy_owner_migrations from public, anon, authenticated, service_role;

grant select, insert, update, delete on table
  public.profiles,
  public.projects,
  public.conversations,
  public.messages
to authenticated;

grant select on table
  public.attachments,
  public.message_attachments
to authenticated;

grant select, insert, update, delete on table
  public.profiles,
  public.projects,
  public.conversations,
  public.messages,
  public.attachments,
  public.document_extractions,
  public.document_chunks,
  public.message_attachments,
  public.processing_jobs,
  public.upload_reservations,
  public.ai_usage
to service_role;

grant select, insert, update on table private.legacy_owner_migrations to service_role;

comment on table public.processing_jobs is
  'Tabela operacional server-only; nenhum worker ou cron é criado por esta migration.';

comment on table public.upload_reservations is
  'Tabela operacional server-only para reservar quota antes do upload direto.';

comment on table public.document_chunks is
  'Conteúdo jurídico derivado server-only; authenticated não recebe grant direto.';

commit;
