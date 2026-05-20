-- Initial schema for the Confair_Website Supabase project (sntcxllhlwnxxbrzcuxb).
-- Applied 2026-05-20 via Supabase MCP `apply_migration`.
-- Captured here so the repository is the source of truth going forward.

create table public.vacancies (
  id            bigserial primary key,
  slug          text unique not null,
  carerix_id    text,
  title         text not null,
  industry      text not null check (industry in ('Aviation','Maritime','Offshore')),
  location      text,
  employment_type text,
  summary       text,
  description   text,
  apply_url     text,
  is_active     boolean not null default true,
  posted_date   timestamptz not null default now(),
  modification_date timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index vacancies_active_posted_idx on public.vacancies (is_active, posted_date desc);
create index vacancies_industry_idx on public.vacancies (industry);

create table public.blog_posts (
  id            bigserial primary key,
  slug          text unique not null,
  title         text not null,
  excerpt       text,
  content       text not null,
  category      text not null,
  author        text,
  cover_image_url text,
  read_time     text,
  published     boolean not null default false,
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index blog_posts_published_idx on public.blog_posts (published, published_at desc);

create table public.team_members (
  id            bigserial primary key,
  name          text not null,
  role          text not null,
  bio           text,
  photo_url     text,
  linkedin_url  text,
  display_order integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);
create index team_members_active_order_idx on public.team_members (is_active, display_order);

create table public.contact_submissions (
  id                  bigserial primary key,
  name                text not null,
  email               text not null,
  company             text,
  industry            text,
  inquiry_type        text not null,
  field_of_expertise  text,
  message             text not null,
  created_at          timestamptz not null default now()
);

-- Row Level Security
alter table public.vacancies            enable row level security;
alter table public.blog_posts           enable row level security;
alter table public.team_members         enable row level security;
alter table public.contact_submissions  enable row level security;

create policy "vacancies are publicly readable when active"
  on public.vacancies for select
  to anon, authenticated
  using (is_active = true);

create policy "blog posts are publicly readable when published"
  on public.blog_posts for select
  to anon, authenticated
  using (published = true);

create policy "team members are publicly readable when active"
  on public.team_members for select
  to anon, authenticated
  using (is_active = true);

create policy "anyone can submit a contact form"
  on public.contact_submissions for insert
  to anon, authenticated
  with check (true);

-- updated_at triggers
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger vacancies_set_updated_at
  before update on public.vacancies
  for each row execute function public.set_updated_at();

create trigger blog_posts_set_updated_at
  before update on public.blog_posts
  for each row execute function public.set_updated_at();
