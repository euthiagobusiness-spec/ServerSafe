-- Esquema de referencia migravel para PostgreSQL/Supabase.
-- Nao aplicado a nenhum banco. Manter em schema privado e acessar apenas pelo backend.

create schema if not exists sales;
revoke all on schema sales from public, anon, authenticated;

create table if not exists sales.prospects (
  id text primary key,
  company text not null,
  normalized_domain text unique,
  site text,
  linkedin_url text,
  city text,
  state text,
  country text,
  segment text,
  company_size text,
  employee_count integer check (employee_count is null or employee_count >= 0),
  estimated_revenue_brl numeric check (estimated_revenue_brl is null or estimated_revenue_brl >= 0),
  apparent_infrastructure jsonb not null default '[]'::jsonb,
  technologies jsonb not null default '[]'::jsonb,
  possible_pains jsonb not null default '[]'::jsonb,
  buying_triggers jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  lead_score integer check (lead_score between 0 and 100),
  score_class text,
  score_justification jsonb not null default '[]'::jsonb,
  stage text not null default 'IDENTIFICADO',
  last_interaction_at timestamptz,
  next_action text,
  next_action_at timestamptz,
  owner text,
  sentiment text,
  objections jsonb not null default '[]'::jsonb,
  estimated_opportunity_brl numeric check (estimated_opportunity_brl is null or estimated_opportunity_brl >= 0),
  opt_out boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sales.contacts (
  id text primary key,
  prospect_id text not null references sales.prospects(id) on delete cascade,
  name text,
  role text,
  normalized_email text unique,
  phone text,
  linkedin_url text,
  relevance text,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sales.interactions (
  id text primary key,
  prospect_id text not null references sales.prospects(id) on delete cascade,
  contact_id text references sales.contacts(id) on delete set null,
  occurred_at timestamptz not null,
  channel text not null,
  direction text not null check (direction in ('INBOUND', 'OUTBOUND', 'INTERNAL')),
  kind text not null,
  subject text,
  summary text not null,
  provider_thread_id text,
  provider_message_id text,
  sentiment text,
  intent text,
  objections jsonb not null default '[]'::jsonb,
  approval_level text check (approval_level is null or approval_level in ('A', 'B', 'C')),
  source_ref text,
  created_at timestamptz not null default now()
);

create table if not exists sales.stage_history (
  id text primary key,
  prospect_id text not null references sales.prospects(id) on delete cascade,
  from_stage text,
  to_stage text not null,
  changed_at timestamptz not null,
  actor text not null,
  reason text not null,
  evidence jsonb not null default '[]'::jsonb
);

create table if not exists sales.messages (
  id text primary key,
  prospect_id text not null references sales.prospects(id) on delete cascade,
  contact_id text references sales.contacts(id) on delete set null,
  interaction_id text references sales.interactions(id) on delete set null,
  cadence_step text,
  subject text,
  body text not null,
  status text not null check (status in ('DRAFT', 'APPROVED', 'SENT', 'FAILED', 'CANCELLED')),
  approval_level text not null check (approval_level in ('A', 'B', 'C')),
  approved_by text,
  approved_at timestamptz,
  sent_at timestamptz,
  experiment_id text,
  created_at timestamptz not null default now()
);

create table if not exists sales.suppressions (
  id text primary key,
  normalized_email text,
  normalized_domain text,
  requested_at timestamptz not null,
  source text not null,
  reason text,
  created_at timestamptz not null default now(),
  check (normalized_email is not null or normalized_domain is not null),
  unique (normalized_email),
  unique (normalized_domain)
);

create table if not exists sales.experiments (
  id text primary key,
  name text not null,
  variable text not null,
  hypothesis text not null,
  status text not null check (status in ('PLANNED', 'RUNNING', 'COMPLETED', 'CANCELLED')),
  started_at timestamptz,
  ended_at timestamptz,
  configuration jsonb not null,
  results jsonb,
  created_at timestamptz not null default now()
);

create table if not exists sales.activity_log (
  id text primary key,
  occurred_at timestamptz not null,
  action text not null,
  prospect_id text references sales.prospects(id) on delete set null,
  contact_id text references sales.contacts(id) on delete set null,
  reason text not null,
  input jsonb,
  result jsonb,
  status text not null,
  error text,
  next_action text,
  actor text not null,
  created_at timestamptz not null default now()
);

create index if not exists prospects_stage_idx on sales.prospects(stage);
create index if not exists prospects_score_idx on sales.prospects(lead_score desc);
create index if not exists prospects_next_action_idx on sales.prospects(next_action_at);
create index if not exists interactions_prospect_time_idx on sales.interactions(prospect_id, occurred_at desc);
create index if not exists activity_log_time_idx on sales.activity_log(occurred_at desc);

alter table sales.prospects enable row level security;
alter table sales.contacts enable row level security;
alter table sales.interactions enable row level security;
alter table sales.stage_history enable row level security;
alter table sales.messages enable row level security;
alter table sales.suppressions enable row level security;
alter table sales.experiments enable row level security;
alter table sales.activity_log enable row level security;

revoke all on all tables in schema sales from public, anon, authenticated;
alter default privileges in schema sales revoke all on tables from public, anon, authenticated;
