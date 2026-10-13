create table if not exists bookmarks (
  id bigserial primary key,
  url text not null unique,
  title text not null,
  description text not null,
  category text not null,
  format text not null,
  author text not null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);
