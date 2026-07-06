-- Founder OS — durable memory store backing table.
-- Apply ONCE per Supabase project (SQL editor or `supabase db push`).
-- Idempotent: safe to run repeatedly.

create table if not exists public.founder_os_memory (
  namespace   text        not null,
  id          text        not null,
  key         text        not null,
  data        jsonb       not null default '{}'::jsonb,
  tags        text[]      not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  expires_at  timestamptz null,
  primary key (namespace, id)
);

-- Query-shape indexes matching store.ts's matchQuery filters.
create index if not exists founder_os_memory_namespace_idx on public.founder_os_memory (namespace);
create index if not exists founder_os_memory_updated_at_idx on public.founder_os_memory (updated_at desc);
create index if not exists founder_os_memory_expires_at_idx on public.founder_os_memory (expires_at);
create index if not exists founder_os_memory_tags_idx on public.founder_os_memory using gin (tags);

-- The server connects with the service_role key, which bypasses RLS. Enable
-- RLS with NO policies so the anon/publishable key (and the browser) can never
-- read or write this table directly — only the server-side service_role can.
alter table public.founder_os_memory enable row level security;
