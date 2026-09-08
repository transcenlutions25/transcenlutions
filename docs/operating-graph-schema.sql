-- Tay Operating Graph v1
-- Append-only evidence layer. Safe to run repeatedly.

create extension if not exists pgcrypto;

create table if not exists tay_tenants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists tay_organizations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tay_tenants(id) on delete cascade,
  name text not null,
  kind text not null default 'business',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists tay_actors (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tay_tenants(id) on delete cascade,
  organization_id uuid references tay_organizations(id) on delete set null,
  actor_key text not null,
  actor_type text not null check (actor_type in ('human','ai_agent','contractor','automation','service')),
  display_name text not null,
  role_name text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (tenant_id, actor_key)
);

create table if not exists tay_skills (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tay_tenants(id) on delete cascade,
  skill_key text not null,
  name text not null,
  version integer not null default 1,
  status text not null default 'draft',
  definition jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (tenant_id, skill_key, version)
);

create table if not exists tay_policies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tay_tenants(id) on delete cascade,
  rule_id text not null,
  version integer not null default 1,
  domain text not null,
  permission_default text not null,
  definition jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (tenant_id, rule_id, version)
);

create table if not exists tay_workflows (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tay_tenants(id) on delete cascade,
  organization_id uuid references tay_organizations(id) on delete set null,
  workflow_key text not null,
  name text not null,
  goal text,
  baseline_minutes numeric,
  skill_id uuid references tay_skills(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (tenant_id, workflow_key)
);

create table if not exists tay_authority_grants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tay_tenants(id) on delete cascade,
  actor_id uuid references tay_actors(id) on delete cascade,
  resource_scope text not null,
  capability text not null,
  permission text not null check (permission in ('see','suggest','assist','act','represent')),
  approval_rule text,
  granted_by_actor_id uuid references tay_actors(id) on delete set null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists tay_operating_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tay_tenants(id) on delete cascade,
  event_key text not null,
  event_type text not null,
  occurred_at timestamptz not null default now(),
  correlation_id text not null,
  causation_id text,
  workflow_id uuid references tay_workflows(id) on delete set null,
  organization_id uuid references tay_organizations(id) on delete set null,
  actor_id uuid references tay_actors(id) on delete set null,
  skill_id uuid references tay_skills(id) on delete set null,
  policy_id uuid references tay_policies(id) on delete set null,
  intent text,
  action_type text,
  permission_status text,
  governance_rule_id text,
  risk_tier text,
  risk_score integer,
  audit_status text,
  execution_status text,
  result_summary text,
  duration_ms integer,
  estimated_cost_usd numeric(12,6),
  human_intervention_count integer not null default 0,
  failure_code text,
  recovery_code text,
  feedback_rating text,
  source text not null default 'tay',
  environment text not null default 'unknown',
  metadata jsonb not null default '{}'::jsonb,
  supersedes_event_id uuid references tay_operating_events(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (tenant_id, event_key)
);

create index if not exists tay_operating_events_tenant_time_idx
  on tay_operating_events (tenant_id, occurred_at desc);
create index if not exists tay_operating_events_corr_idx
  on tay_operating_events (tenant_id, correlation_id, occurred_at);
create index if not exists tay_operating_events_workflow_idx
  on tay_operating_events (tenant_id, workflow_id, occurred_at);
create index if not exists tay_operating_events_type_idx
  on tay_operating_events (tenant_id, event_type, occurred_at desc);

-- Read model: measured evidence only. No hard-coded traction.
create or replace view tay_workflow_evidence as
select
  tenant_id,
  count(distinct correlation_id) filter (where event_type = 'intent') as workflows_started,
  count(distinct correlation_id) filter (where event_type = 'result' and execution_status = 'completed') as workflows_completed,
  count(*) filter (where event_type = 'approval' and permission_status = 'approved') as approvals,
  count(*) filter (where event_type = 'approval' and permission_status = 'declined') as declines,
  count(*) filter (where event_type = 'recovery') as recoveries,
  count(*) filter (where failure_code is not null) as failures,
  sum(human_intervention_count) as human_interventions,
  percentile_cont(0.5) within group (order by duration_ms) filter (where duration_ms is not null) as median_duration_ms,
  sum(estimated_cost_usd) filter (where estimated_cost_usd is not null) as measured_cost_usd
from tay_operating_events
group by tenant_id;

-- Bootstrap an internal tenant only when explicitly desired.
-- insert into tay_tenants (slug, name) values ('transcenlutions-internal','Transcenlutions Internal') on conflict (slug) do nothing;
