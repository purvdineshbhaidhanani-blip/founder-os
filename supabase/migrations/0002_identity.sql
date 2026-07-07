-- Production identity foundation — multi-tenant users, organizations, teams,
-- RBAC (roles/permissions), profiles, database-backed sessions, and audit log.
-- Apply ONCE per Supabase project (SQL editor or `supabase db push`), after
-- 0001_founder_os_memory.sql. Idempotent: safe to run repeatedly.
--
-- Design notes:
--   - `users` is the global identity; `organizations` is the tenant boundary;
--     `memberships` is the join between them (one row per user per org they
--     belong to), carrying the user's role in that org.
--   - `teams` are sub-groups within an organization; `team_members` is the
--     join between `teams` and `users` (a user must have a `memberships` row
--     for the team's organization before they can join one of its teams —
--     enforced in application code, not a DB constraint, since Postgres has
--     no cross-table CHECK).
--   - `roles` holds both system-wide role templates (`organization_id` is
--     null: "owner", "admin", "member") and org-specific custom roles
--     (`organization_id` set). `role_permissions` is the many-to-many between
--     roles and the static `permissions` catalog.
--   - `sessions` stores a SHA-256 hash of the opaque session token, never the
--     token itself — mirrors how a password hash is stored, so a database
--     read alone can never yield a usable session token.
--   - Every table enables RLS with NO policies: only the server's
--     service_role key (which bypasses RLS) can read/write. The anon/publishable
--     key and the browser can never touch these tables directly.

create extension if not exists pgcrypto;

-- ── users ────────────────────────────────────────────────────────────────
create table if not exists public.users (
  id                uuid        primary key default gen_random_uuid(),
  email             text        not null,
  password_hash     text        not null,
  email_verified_at timestamptz null,
  last_login_at     timestamptz null,
  disabled_at       timestamptz null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create unique index if not exists users_email_lower_idx on public.users (lower(email));

-- ── organizations ───────────────────────────────────────────────────────
create table if not exists public.organizations (
  id            uuid        primary key default gen_random_uuid(),
  name          text        not null,
  slug          text        not null,
  owner_user_id uuid        not null references public.users (id) on delete restrict,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index if not exists organizations_slug_idx on public.organizations (lower(slug));

-- ── teams ───────────────────────────────────────────────────────────────
create table if not exists public.teams (
  id              uuid        primary key default gen_random_uuid(),
  organization_id uuid        not null references public.organizations (id) on delete cascade,
  name            text        not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, name)
);
create index if not exists teams_organization_id_idx on public.teams (organization_id);

-- ── roles (system templates: organization_id is null; custom: set) ────────
create table if not exists public.roles (
  id              uuid        primary key default gen_random_uuid(),
  organization_id uuid        null references public.organizations (id) on delete cascade,
  name            text        not null,
  is_system       boolean     not null default false,
  created_at      timestamptz not null default now()
);
create unique index if not exists roles_system_name_idx on public.roles (name) where organization_id is null;
create unique index if not exists roles_org_name_idx on public.roles (organization_id, name) where organization_id is not null;

-- ── permissions (static catalog) ───────────────────────────────────────────
create table if not exists public.permissions (
  id          uuid        primary key default gen_random_uuid(),
  key         text        not null,
  description text        not null,
  created_at  timestamptz not null default now()
);
create unique index if not exists permissions_key_idx on public.permissions (key);

-- ── role_permissions (many-to-many) ────────────────────────────────────────
create table if not exists public.role_permissions (
  role_id       uuid not null references public.roles (id) on delete cascade,
  permission_id uuid not null references public.permissions (id) on delete cascade,
  primary key (role_id, permission_id)
);

-- ── memberships (user <-> organization, carries the user's role) ──────────
create table if not exists public.memberships (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references public.users (id) on delete cascade,
  organization_id uuid        not null references public.organizations (id) on delete cascade,
  role_id         uuid        not null references public.roles (id) on delete restrict,
  status          text        not null default 'active' check (status in ('active', 'invited', 'suspended')),
  invited_by      uuid        null references public.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, organization_id)
);
create index if not exists memberships_user_id_idx on public.memberships (user_id);
create index if not exists memberships_organization_id_idx on public.memberships (organization_id);

-- ── team_members (user <-> team) ───────────────────────────────────────────
create table if not exists public.team_members (
  team_id    uuid        not null references public.teams (id) on delete cascade,
  user_id    uuid        not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);
create index if not exists team_members_user_id_idx on public.team_members (user_id);

-- ── profiles (1:1 with users, display-facing data separate from auth) ─────
create table if not exists public.profiles (
  user_id      uuid        primary key references public.users (id) on delete cascade,
  display_name text        null,
  avatar_url   text        null,
  timezone     text        null,
  locale       text        null,
  bio          text        null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── sessions (database-backed; token itself is never stored) ──────────────
create table if not exists public.sessions (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references public.users (id) on delete cascade,
  organization_id uuid        null references public.organizations (id) on delete set null,
  token_hash      text        not null,
  user_agent      text        null,
  ip_address      text        null,
  created_at      timestamptz not null default now(),
  last_seen_at    timestamptz not null default now(),
  expires_at      timestamptz not null,
  revoked_at      timestamptz null
);
create unique index if not exists sessions_token_hash_idx on public.sessions (token_hash);
create index if not exists sessions_user_id_idx on public.sessions (user_id);
create index if not exists sessions_expires_at_idx on public.sessions (expires_at);

-- ── audit_logs (database-backed, append-only) ──────────────────────────────
create table if not exists public.audit_logs (
  id              uuid        primary key default gen_random_uuid(),
  organization_id uuid        null references public.organizations (id) on delete cascade,
  actor_user_id   uuid        null references public.users (id) on delete set null,
  action          text        not null,
  target_type     text        null,
  target_id       text        null,
  metadata        jsonb       not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);
create index if not exists audit_logs_organization_id_idx on public.audit_logs (organization_id);
create index if not exists audit_logs_actor_user_id_idx on public.audit_logs (actor_user_id);
create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);

-- ── seed: system roles + permission catalog + default mapping ─────────────
insert into public.permissions (key, description) values
  ('organization.manage', 'Update organization settings.'),
  ('organization.delete', 'Delete the organization.'),
  ('members.invite', 'Invite or add members to the organization.'),
  ('members.remove', 'Remove members from the organization.'),
  ('members.role.manage', 'Change a member''s role.'),
  ('teams.manage', 'Create, rename, delete teams and manage their membership.'),
  ('audit.view', 'View the organization''s audit log.')
on conflict (key) do nothing;

-- Conflict inference targets the partial unique index directly (it's an
-- index predicate, not a named table constraint, so `ON CONFLICT ON
-- CONSTRAINT` doesn't apply here).
insert into public.roles (name, is_system, organization_id) values
  ('owner', true, null),
  ('admin', true, null),
  ('member', true, null)
on conflict (name) where organization_id is null do nothing;

-- owner: every permission
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.name = 'owner' and r.organization_id is null
on conflict do nothing;

-- admin: every permission except deleting the organization
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.name = 'admin' and r.organization_id is null and p.key != 'organization.delete'
on conflict do nothing;

-- member: no elevated permissions (base membership grants read access in application code)

-- The server connects with the service_role key, which bypasses RLS. Enable
-- RLS with NO policies on every table so the anon/publishable key (and the
-- browser) can never read or write identity data directly.
alter table public.users enable row level security;
alter table public.organizations enable row level security;
alter table public.teams enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.memberships enable row level security;
alter table public.team_members enable row level security;
alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.audit_logs enable row level security;
