create extension if not exists "pgcrypto";

create table if not exists public.references (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  source_url text not null,
  thumbnail_url text,
  summary text,
  tags text[] not null default '{}',
  note text,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists references_user_created_at_idx on public.references (user_id, created_at desc);
create index if not exists references_user_tags_idx on public.references using gin (tags);

alter table public.references add column if not exists summary text;
alter table public.references add column if not exists tags text[] not null default '{}';
alter table public.references add column if not exists note text;
alter table public.references add column if not exists is_favorite boolean not null default false;

create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.reference_boards (
  id uuid primary key default gen_random_uuid(),
  reference_id uuid not null references public.references(id) on delete cascade,
  board_id uuid not null references public.boards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint reference_boards_reference_board_unique unique (reference_id, board_id)
);

create index if not exists boards_user_created_at_idx on public.boards (user_id, created_at desc);
create unique index if not exists boards_user_name_unique_idx on public.boards (user_id, lower(name));
create index if not exists reference_boards_user_board_idx on public.reference_boards (user_id, board_id);
create index if not exists reference_boards_reference_idx on public.reference_boards (reference_id);

alter table public.boards add column if not exists description text;
alter table public.boards alter column user_id set default auth.uid();
alter table public.reference_boards alter column user_id set default auth.uid();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'reference-thumbnails',
  'reference-thumbnails',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Compatibility migration for older MVP data.
-- Old `memo` and `importance` columns can remain in the database, but the app no longer uses them.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'references'
      and column_name = 'memo'
  ) then
    update public.references
    set note = coalesce(note, memo)
    where note is null and memo is not null;
  end if;
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_references_updated_at on public.references;
create trigger set_references_updated_at
before update on public.references
for each row
execute function public.set_updated_at();

alter table public.references enable row level security;
alter table public.boards enable row level security;
alter table public.reference_boards enable row level security;

drop policy if exists "Users can select own references" on public.references;
create policy "Users can select own references"
on public.references
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own references" on public.references;
create policy "Users can insert own references"
on public.references
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own references" on public.references;
create policy "Users can update own references"
on public.references
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own references" on public.references;
create policy "Users can delete own references"
on public.references
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can select own boards" on public.boards;
create policy "Users can select own boards"
on public.boards
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own boards" on public.boards;
create policy "Users can insert own boards"
on public.boards
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own boards" on public.boards;
create policy "Users can update own boards"
on public.boards
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own boards" on public.boards;
create policy "Users can delete own boards"
on public.boards
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can select own reference boards" on public.reference_boards;
create policy "Users can select own reference boards"
on public.reference_boards
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own reference boards" on public.reference_boards;
create policy "Users can insert own reference boards"
on public.reference_boards
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.references as r
    where r.id = reference_id
      and r.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.boards as b
    where b.id = board_id
      and b.user_id = auth.uid()
  )
);

drop policy if exists "Users can update own reference boards" on public.reference_boards;
create policy "Users can update own reference boards"
on public.reference_boards
for update
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.references as r
    where r.id = reference_id
      and r.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.boards as b
    where b.id = board_id
      and b.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete own reference boards" on public.reference_boards;
create policy "Users can delete own reference boards"
on public.reference_boards
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Anyone can read reference thumbnails" on storage.objects;
create policy "Anyone can read reference thumbnails"
on storage.objects
for select
to public
using (bucket_id = 'reference-thumbnails');

drop policy if exists "Users can upload own reference thumbnails" on storage.objects;
create policy "Users can upload own reference thumbnails"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'reference-thumbnails'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update own reference thumbnails" on storage.objects;
create policy "Users can update own reference thumbnails"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'reference-thumbnails'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'reference-thumbnails'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete own reference thumbnails" on storage.objects;
create policy "Users can delete own reference thumbnails"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'reference-thumbnails'
  and (storage.foldername(name))[1] = auth.uid()::text
);
