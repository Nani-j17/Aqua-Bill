-- Run this in Supabase SQL Editor.
-- It allows authenticated users to read/insert/update only their own profile row.

alter table if exists public.profiles enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_select_own'
  ) then
    create policy profiles_select_own
      on public.profiles
      for select
      to authenticated
      using (auth.uid() = id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_insert_own'
  ) then
    create policy profiles_insert_own
      on public.profiles
      for insert
      to authenticated
      with check (auth.uid() = id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_update_own'
  ) then
    create policy profiles_update_own
      on public.profiles
      for update
      to authenticated
      using (auth.uid() = id)
      with check (auth.uid() = id);
  end if;
end
$$;

-- Optional: prevent duplicate rows for same user id.
-- Run only if your table does not already enforce this.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_id_unique'
  ) then
    alter table public.profiles
      add constraint profiles_id_unique unique (id);
  end if;
exception
  when duplicate_table then null;
  when duplicate_object then null;
end
$$;

