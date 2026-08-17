-- ============================================================
-- DEADLINE MANAGER — SUPABASE SCHEMA
-- Run this entire file once in Supabase SQL Editor
-- (Project → SQL Editor → New query → paste → Run)
-- ============================================================

-- Needed for password hashing (crypt / gen_salt)
create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. PROFILES
-- ------------------------------------------------------------
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  created_at  timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ------------------------------------------------------------
-- 2. PROJECTS
-- ------------------------------------------------------------
create table if not exists projects (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  description    text,
  password_hash  text not null,      -- bcrypt hash, never plaintext
  created_by     uuid not null references auth.users(id) on delete cascade,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 3. PROJECT MEMBERS
-- ------------------------------------------------------------
create table if not exists project_members (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'member' check (role in ('owner', 'member')),
  created_at  timestamptz not null default now(),
  unique (project_id, user_id)
);

-- ------------------------------------------------------------
-- 4. TASKS
-- ------------------------------------------------------------
create table if not exists tasks (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  title       text not null,
  description text,
  deadline    timestamptz,
  priority    text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  status      text not null default 'todo' check (status in ('todo','in_progress','completed')),
  created_by  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 5. NOTES
-- ------------------------------------------------------------
create table if not exists notes (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  title       text not null,
  content     text,
  created_by  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 6. INDEXES
-- ------------------------------------------------------------
create index if not exists idx_tasks_project_id        on tasks(project_id);
create index if not exists idx_tasks_deadline           on tasks(deadline);
create index if not exists idx_tasks_status             on tasks(status);
create index if not exists idx_notes_project_id         on notes(project_id);
create index if not exists idx_project_members_project  on project_members(project_id);
create index if not exists idx_project_members_user     on project_members(user_id);

-- ------------------------------------------------------------
-- 7. updated_at AUTO-TOUCH TRIGGERS
-- ------------------------------------------------------------
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_projects_touch on projects;
create trigger trg_projects_touch before update on projects
  for each row execute function touch_updated_at();

drop trigger if exists trg_tasks_touch on tasks;
create trigger trg_tasks_touch before update on tasks
  for each row execute function touch_updated_at();

drop trigger if exists trg_notes_touch on notes;
create trigger trg_notes_touch before update on notes
  for each row execute function touch_updated_at();

-- ------------------------------------------------------------
-- 8. HELPER: is current user a member of a project?
-- ------------------------------------------------------------
create or replace function is_project_member(pid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from project_members
    where project_id = pid and user_id = auth.uid()
  );
$$;

create or replace function is_project_owner(pid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from project_members
    where project_id = pid and user_id = auth.uid() and role = 'owner'
  );
$$;

-- ------------------------------------------------------------
-- 9. RPC: create a project (hashes password server-side)
-- ------------------------------------------------------------
create or replace function create_project(p_name text, p_description text, p_password text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if p_password is null or length(p_password) < 4 then
    raise exception 'Password must be at least 4 characters';
  end if;

  insert into projects (name, description, password_hash, created_by)
  values (p_name, p_description, crypt(p_password, gen_salt('bf')), auth.uid())
  returning id into new_id;

  insert into project_members (project_id, user_id, role)
  values (new_id, auth.uid(), 'owner');

  return new_id;
end;
$$;

-- ------------------------------------------------------------
-- 10. RPC: verify a project's password (never exposes the hash)
--     Only callable by users who are already members of the project.
-- ------------------------------------------------------------
create or replace function verify_project_password(p_project_id uuid, p_password text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  stored_hash text;
  is_member boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select is_project_member(p_project_id) into is_member;
  if not is_member then
    raise exception 'Access denied';
  end if;

  select password_hash into stored_hash from projects where id = p_project_id;
  if stored_hash is null then
    return false;
  end if;

  return stored_hash = crypt(p_password, stored_hash);
end;
$$;

-- ------------------------------------------------------------
-- 11. RPC: change a project's password (owner only)
-- ------------------------------------------------------------
create or replace function change_project_password(p_project_id uuid, p_new_password text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_project_owner(p_project_id) then
    raise exception 'Only the owner can change the password';
  end if;
  if p_new_password is null or length(p_new_password) < 4 then
    raise exception 'Password must be at least 4 characters';
  end if;

  update projects
  set password_hash = crypt(p_new_password, gen_salt('bf'))
  where id = p_project_id;
end;
$$;

-- ------------------------------------------------------------
-- 12. ROW LEVEL SECURITY
-- ------------------------------------------------------------
alter table profiles         enable row level security;
alter table projects         enable row level security;
alter table project_members  enable row level security;
alter table tasks            enable row level security;
alter table notes            enable row level security;

-- profiles: a user can read/update only their own profile
drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own" on profiles
  for select using (id = auth.uid());

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles
  for update using (id = auth.uid());

-- projects: only members can read; only authenticated users can insert
-- (insert normally goes through create_project RPC, this policy is a safety net)
drop policy if exists "projects_select_member" on projects;
create policy "projects_select_member" on projects
  for select using (is_project_member(id));

drop policy if exists "projects_insert_self" on projects;
create policy "projects_insert_self" on projects
  for insert with check (created_by = auth.uid());

drop policy if exists "projects_update_owner" on projects;
create policy "projects_update_owner" on projects
  for update using (is_project_owner(id));

drop policy if exists "projects_delete_owner" on projects;
create policy "projects_delete_owner" on projects
  for delete using (is_project_owner(id));

-- project_members: members can see the member list of their own projects
drop policy if exists "members_select_same_project" on project_members;
create policy "members_select_same_project" on project_members
  for select using (is_project_member(project_id));

drop policy if exists "members_insert_owner" on project_members;
create policy "members_insert_owner" on project_members
  for insert with check (is_project_owner(project_id) or user_id = auth.uid());

drop policy if exists "members_delete_owner" on project_members;
create policy "members_delete_owner" on project_members
  for delete using (is_project_owner(project_id));

-- tasks: full CRUD limited to project members
drop policy if exists "tasks_select_member" on tasks;
create policy "tasks_select_member" on tasks
  for select using (is_project_member(project_id));

drop policy if exists "tasks_insert_member" on tasks;
create policy "tasks_insert_member" on tasks
  for insert with check (is_project_member(project_id) and created_by = auth.uid());

drop policy if exists "tasks_update_member" on tasks;
create policy "tasks_update_member" on tasks
  for update using (is_project_member(project_id));

drop policy if exists "tasks_delete_member" on tasks;
create policy "tasks_delete_member" on tasks
  for delete using (is_project_member(project_id));

-- notes: full CRUD limited to project members
drop policy if exists "notes_select_member" on notes;
create policy "notes_select_member" on notes
  for select using (is_project_member(project_id));

drop policy if exists "notes_insert_member" on notes;
create policy "notes_insert_member" on notes
  for insert with check (is_project_member(project_id) and created_by = auth.uid());

drop policy if exists "notes_update_member" on notes;
create policy "notes_update_member" on notes
  for update using (is_project_member(project_id));

drop policy if exists "notes_delete_member" on notes;
create policy "notes_delete_member" on notes
  for delete using (is_project_member(project_id));

-- ============================================================
-- END OF SCHEMA
-- ============================================================
