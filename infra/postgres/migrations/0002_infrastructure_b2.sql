begin;

-- B2 extends the metadata-only lifecycle without changing the v1 migration.
alter table serversafe.documents
  drop constraint if exists documents_status_check;
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'serversafe.documents'::regclass and conname = 'documents_status_check'
  ) then
    alter table serversafe.documents
      add constraint documents_status_check check (
        status in ('pending', 'processing', 'ready', 'failed', 'expired', 'archived', 'deleted')
      );
  end if;
end $$;

alter table serversafe.jobs
  add column if not exists heartbeat_at timestamptz,
  add column if not exists last_error_code text;

do $$
begin
  if exists (
    select 1 from serversafe.jobs
    where job_type not in ('document.extract', 'document.classify', 'document.chunk', 'spreadsheet.process')
  ) then
    raise exception 'B2 refuses ambiguous legacy job types; review jobs before migration';
  end if;
end $$;

alter table serversafe.jobs
  drop constraint if exists jobs_type_check;
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'serversafe.jobs'::regclass and conname = 'jobs_type_check'
  ) then
    alter table serversafe.jobs
      add constraint jobs_type_check check (
        job_type in ('document.extract', 'document.classify', 'document.chunk', 'spreadsheet.process')
      );
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'serversafe.jobs'::regclass and conname = 'jobs_last_error_code_check'
  ) then
    alter table serversafe.jobs
      add constraint jobs_last_error_code_check check (
        last_error_code is null or last_error_code ~ '^[A-Z0-9_]{1,64}$'
      );
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'serversafe.jobs'::regclass and conname = 'jobs_job_owner_key'
  ) then
    alter table serversafe.jobs
      add constraint jobs_job_owner_key unique (job_id, owner_id);
  end if;
end $$;

create table if not exists serversafe.upload_intents (
  upload_intent_id uuid primary key,
  owner_id uuid not null,
  document_id uuid not null,
  document_version_id uuid not null,
  expected_checksum text not null,
  expected_size_bytes bigint not null,
  media_type text not null,
  status text not null default 'pending',
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint upload_intents_document_owner_fkey
    foreign key (document_id, owner_id)
    references serversafe.documents (document_id, owner_id)
    on delete restrict,
  -- The version identifier is reserved at intent creation and becomes an
  -- official document_versions row only after the object metadata is verified.
  -- The completion transaction validates owner/document/version together.
  constraint upload_intents_checksum_check check (expected_checksum ~ '^[0-9a-f]{64}$'),
  constraint upload_intents_size_check check (expected_size_bytes >= 0),
  constraint upload_intents_media_type_check check (char_length(btrim(media_type)) between 1 and 255),
  constraint upload_intents_status_check check (status in ('pending', 'completed', 'expired', 'failed')),
  constraint upload_intents_completed_at_check check (
    completed_at is null or status in ('completed', 'failed', 'expired')
  ),
  constraint upload_intents_expiry_check check (expires_at > created_at)
);

create unique index if not exists upload_intents_owner_document_version_key
  on serversafe.upload_intents (owner_id, document_id, document_version_id);
create index if not exists upload_intents_expiry_idx
  on serversafe.upload_intents (status, expires_at)
  where status = 'pending';
create index if not exists jobs_available_v2_idx
  on serversafe.jobs (status, available_at, lease_until, created_at, job_id)
  where status in ('queued', 'processing');

create table if not exists serversafe.job_outbox (
  outbox_id uuid primary key,
  owner_id uuid not null,
  job_id uuid not null,
  event_type text not null default 'job.queued',
  payload jsonb not null,
  available_at timestamptz not null default now(),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  constraint job_outbox_job_owner_fkey
    foreign key (job_id, owner_id)
    references serversafe.jobs (job_id, owner_id)
    on delete cascade,
  constraint job_outbox_event_type_check check (event_type = 'job.queued'),
  constraint job_outbox_payload_check check (jsonb_typeof(payload) = 'object')
);
create unique index if not exists job_outbox_job_event_key
  on serversafe.job_outbox (job_id, event_type);
create index if not exists job_outbox_publish_idx
  on serversafe.job_outbox (published_at, available_at, created_at)
  where published_at is null;

comment on table serversafe.upload_intents is
  'Upload intent metadata only; raw binaries remain in object storage and are never written to PostgreSQL.';
comment on table serversafe.job_outbox is
  'Transactional metadata-only handoff from the job write to a Valkey-compatible queue publisher.';
comment on column serversafe.jobs.parameters is
  'Metadata-only job parameters. Never store prompts, messages, document content, secrets, stdout or stderr.';
comment on column serversafe.documents.status is
  'archived is a separate non-ready availability state; deleted is a separate terminal data-retention state.';

commit;
