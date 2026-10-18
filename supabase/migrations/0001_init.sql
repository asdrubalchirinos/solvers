-- Solvers: esquema inicial (tablas, checks, RLS, triggers, storage)

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  display_name text not null,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  constraint profiles_username_len check (char_length(username) between 3 and 20),
  constraint profiles_username_format check (username ~ '^[a-z0-9_]+$'),
  constraint profiles_username_reserved check (
    username not in (
      'login', 'publicar', 'ajustes', 'auth', 'p', 'api',
      'admin', 'solvers', 'ayuda', 'privacidad', 'terminos'
    )
  ),
  constraint profiles_display_name_len check (char_length(display_name) between 1 and 50),
  constraint profiles_bio_len check (bio is null or char_length(bio) <= 160)
);

create table public.apps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  screenshot_url text not null,
  motivo text not null,
  texto text,
  repo_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint apps_name_len check (char_length(name) between 3 and 50),
  constraint apps_motivo_len check (char_length(motivo) between 20 and 280),
  constraint apps_texto_len check (texto is null or char_length(texto) <= 280),
  constraint apps_repo_https check (repo_url ~ '^https://[A-Za-z0-9]'),
  constraint apps_repo_no_shortener check (
    repo_url !~* 'https://([^/]+\.)?(bit\.ly|bitly\.com|t\.co|tinyurl\.com|tiny\.cc|goo\.gl|ow\.ly|is\.gd|buff\.ly|cutt\.ly|rebrand\.ly|shorturl\.at|rb\.gy|s\.id|v\.gd|soo\.gd|short\.io|adf\.ly|clck\.ru)/'
  )
);

create index apps_created_at_idx on public.apps (created_at desc);
create index apps_user_repo_idx on public.apps (user_id, repo_url);
create index apps_user_created_idx on public.apps (user_id, created_at desc);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  constraint tags_name_format check (name ~ '^[a-z0-9áéíóúüñ]{2,20}$')
);

create table public.app_tags (
  app_id uuid not null references public.apps (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (app_id, tag_id)
);

create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self check (follower_id <> following_id)
);

create index follows_following_idx on public.follows (following_id);

create table public.likes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  app_id uuid not null references public.apps (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, app_id)
);

create index likes_app_idx on public.likes (app_id);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.apps (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint comments_body_len check (char_length(body) between 1 and 280)
);

create index comments_app_idx on public.comments (app_id, created_at);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  app_id uuid references public.apps (id) on delete cascade,
  comment_id uuid references public.comments (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now(),
  constraint reports_reason_len check (char_length(reason) between 3 and 280),
  constraint reports_one_target check (
    (app_id is not null and comment_id is null)
    or (app_id is null and comment_id is not null)
  )
);

create unique index reports_app_once_idx
  on public.reports (reporter_id, app_id)
  where app_id is not null;

create unique index reports_comment_once_idx
  on public.reports (reporter_id, comment_id)
  where comment_id is not null;

-- Vista del feed: conteos + publicaciones anteriores de la misma app
create view public.apps_with_meta
  with (security_invoker = true)
as
select
  apps.*,
  (
    select count(*)::int from public.likes
    where likes.app_id = apps.id
  ) as likes_count,
  (
    select count(*)::int from public.comments
    where comments.app_id = apps.id
  ) as comments_count,
  (
    select count(*)::int from public.apps prev
    where prev.user_id = apps.user_id
      and prev.repo_url = apps.repo_url
      and prev.created_at < apps.created_at
  ) as previous_count
from public.apps;

-- ---------------------------------------------------------------------------
-- Perfil automático al registrarse
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base text;
  uname text;
  n int := 0;
  full_name text;
  avatar text;
begin
  base := lower(coalesce(
    new.raw_user_meta_data ->> 'user_name',
    new.raw_user_meta_data ->> 'preferred_username',
    split_part(coalesce(new.email, 'solver'), '@', 1),
    'solver'
  ));
  base := regexp_replace(base, '[^a-z0-9_]', '', 'g');
  if char_length(base) < 3 then
    base := 'solver';
  end if;
  if char_length(base) > 20 then
    base := left(base, 20);
  end if;

  uname := base;
  while exists (select 1 from public.profiles where username = uname)
     or uname in (
       'login', 'publicar', 'ajustes', 'auth', 'p', 'api',
       'admin', 'solvers', 'ayuda', 'privacidad', 'terminos'
     )
  loop
    n := n + 1;
    uname := left(base, greatest(3, 20 - char_length(n::text))) || n::text;
  end loop;

  full_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    uname
  );
  if char_length(full_name) > 50 then
    full_name := left(full_name, 50);
  end if;

  avatar := coalesce(
    new.raw_user_meta_data ->> 'avatar_url',
    new.raw_user_meta_data ->> 'picture'
  );

  insert into public.profiles (id, username, display_name, avatar_url)
  values (new.id, uname, full_name, avatar);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Editar: solo motivo, texto (y tags, que viven en otra tabla)
-- ---------------------------------------------------------------------------

create or replace function public.lock_app_identity()
returns trigger
language plpgsql
as $$
begin
  if new.user_id is distinct from old.user_id
     or new.name is distinct from old.name
     or new.screenshot_url is distinct from old.screenshot_url
     or new.repo_url is distinct from old.repo_url then
    raise exception 'No se pueden cambiar nombre, captura ni repo';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger apps_lock_identity
  before update on public.apps
  for each row execute function public.lock_app_identity();

-- ---------------------------------------------------------------------------
-- Límites: 5 apps / día y 1 republicación de la misma app / día
-- ---------------------------------------------------------------------------

create or replace function public.check_app_rate_limits()
returns trigger
language plpgsql
as $$
begin
  if (
    select count(*) from public.apps
    where user_id = new.user_id
      and created_at > now() - interval '1 day'
  ) >= 5 then
    raise exception 'Límite: máximo 5 apps por día';
  end if;

  if exists (
    select 1 from public.apps
    where user_id = new.user_id
      and repo_url = new.repo_url
      and created_at > now() - interval '1 day'
  ) then
    raise exception 'Límite: solo puedes republicar la misma app una vez por día';
  end if;

  return new;
end;
$$;

create trigger apps_rate_limits
  before insert on public.apps
  for each row execute function public.check_app_rate_limits();

-- ---------------------------------------------------------------------------
-- RLS: cualquiera lee; solo el dueño escribe lo suyo
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.apps enable row level security;
alter table public.tags enable row level security;
alter table public.app_tags enable row level security;
alter table public.follows enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.reports enable row level security;

-- profiles
create policy "profiles_select" on public.profiles
  for select using (true);

create policy "profiles_update" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

-- apps
create policy "apps_select" on public.apps
  for select using (true);

create policy "apps_insert" on public.apps
  for insert with check (auth.uid() = user_id);

create policy "apps_update" on public.apps
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "apps_delete" on public.apps
  for delete using (auth.uid() = user_id);

-- tags
create policy "tags_select" on public.tags
  for select using (true);

create policy "tags_insert" on public.tags
  for insert to authenticated with check (true);

-- app_tags
create policy "app_tags_select" on public.app_tags
  for select using (true);

create policy "app_tags_insert" on public.app_tags
  for insert to authenticated
  with check (
    exists (
      select 1 from public.apps
      where apps.id = app_id and apps.user_id = auth.uid()
    )
  );

create policy "app_tags_delete" on public.app_tags
  for delete to authenticated
  using (
    exists (
      select 1 from public.apps
      where apps.id = app_id and apps.user_id = auth.uid()
    )
  );

-- follows
create policy "follows_select" on public.follows
  for select using (true);

create policy "follows_insert" on public.follows
  for insert with check (auth.uid() = follower_id);

create policy "follows_delete" on public.follows
  for delete using (auth.uid() = follower_id);

-- likes
create policy "likes_select" on public.likes
  for select using (true);

create policy "likes_insert" on public.likes
  for insert with check (auth.uid() = user_id);

create policy "likes_delete" on public.likes
  for delete using (auth.uid() = user_id);

-- comments
create policy "comments_select" on public.comments
  for select using (true);

create policy "comments_insert" on public.comments
  for insert with check (auth.uid() = user_id);

create policy "comments_delete" on public.comments
  for delete using (auth.uid() = user_id);

-- reports: el dueño los mira en el panel de Supabase (service role)
create policy "reports_select_own" on public.reports
  for select using (auth.uid() = reporter_id);

create policy "reports_insert" on public.reports
  for insert with check (auth.uid() = reporter_id);

-- ---------------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

grant select on public.profiles to anon, authenticated;
grant update on public.profiles to authenticated;

grant select on public.apps to anon, authenticated;
grant insert, update, delete on public.apps to authenticated;

grant select on public.tags to anon, authenticated;
grant insert on public.tags to authenticated;

grant select on public.app_tags to anon, authenticated;
grant insert, delete on public.app_tags to authenticated;

grant select on public.follows to anon, authenticated;
grant insert, delete on public.follows to authenticated;

grant select on public.likes to anon, authenticated;
grant insert, delete on public.likes to authenticated;

grant select on public.comments to anon, authenticated;
grant insert, delete on public.comments to authenticated;

grant select, insert on public.reports to authenticated;

grant select on public.apps_with_meta to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage: capturas JPG / PNG / WebP, máx. 2 MB, carpeta = uid
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'screenshots',
  'screenshots',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
);

create policy "screenshots_public_read"
  on storage.objects for select
  using (bucket_id = 'screenshots');

create policy "screenshots_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "screenshots_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "screenshots_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
