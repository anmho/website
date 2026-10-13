create table if not exists content_posts (
  id text primary key,
  content_type text not null check (content_type in ('article', 'note', 'learning', 'lesson', 'reading', 'watch')),
  slug text not null,
  title text not null,
  excerpt text not null default '',
  body text not null default '',
  date date not null,
  read_time text,
  tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (content_type, slug)
);

create index if not exists content_posts_type_date_idx
on content_posts (content_type, date desc, created_at desc);
