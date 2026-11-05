-- Run once in a new Supabase project. All money and prices use exact numeric.
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now()
);
create table public.application_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'America/Toronto',
  currency text not null default 'USD' check (currency in ('USD','CAD','EUR','GBP','JPY','AUD')),
  theme text not null default 'dark' check (theme in ('dark','light','system')),
  screenshot_limit_mb integer not null default 10 check (screenshot_limit_mb between 1 and 10)
);
create table public.futures_contract_specs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  symbol text not null check (length(symbol) between 1 and 16),
  name text not null,
  tick_size numeric not null check (tick_size > 0),
  point_value numeric not null check (point_value > 0),
  unique nulls not distinct (user_id, symbol)
);
insert into public.futures_contract_specs(symbol,name,tick_size,point_value) values
('NQ','E-mini Nasdaq-100',0.25,20),('MNQ','Micro E-mini Nasdaq-100',0.25,2),
('ES','E-mini S&P 500',0.25,50),('MES','Micro E-mini S&P 500',0.25,5),
('GC','Gold',0.1,100),('MGC','Micro Gold',0.1,10),
('CL','WTI Crude Oil',0.01,1000),('MCL','Micro WTI Crude Oil',0.01,100);

create table public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  submission_id uuid not null default gen_random_uuid(),
  trade_date date not null,
  entry_at timestamptz,
  exit_at timestamptz,
  symbol text not null,
  contract_expiration text,
  tick_size numeric not null check (tick_size > 0),
  point_value numeric not null check (point_value > 0),
  direction text not null check (direction in ('long','short')),
  status text not null check (status in ('draft','open','closed')),
  entry_price numeric check (entry_price > 0),
  stop_price numeric check (stop_price > 0),
  target_price numeric check (target_price > 0),
  exit_price numeric check (exit_price > 0),
  contracts integer check (contracts > 0),
  commission numeric not null default 0 check (commission >= 0),
  fees numeric not null default 0 check (fees >= 0),
  adjustment numeric not null default 0,
  adjustment_reason text not null default '',
  notes jsonb not null default '{}'::jsonb,
  emotion_before text not null default '',
  emotion_during text not null default '',
  emotion_after text not null default '',
  confidence integer check (confidence between 1 and 5),
  followed_plan boolean,
  mistakes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id,user_id), unique(user_id,submission_id),
  check (adjustment = 0 or length(trim(adjustment_reason)) > 0),
  check (exit_at is null or entry_at is null or exit_at >= entry_at),
  check (entry_price is null or stop_price is null or (direction='long' and stop_price < entry_price) or (direction='short' and stop_price > entry_price)),
  check (entry_price is null or target_price is null or (direction='long' and target_price > entry_price) or (direction='short' and target_price < entry_price)),
  check (status='draft' or (entry_price is not null and contracts is not null and entry_at is not null)),
  check (status!='closed' or (exit_price is not null and exit_at is not null)),
  check (entry_price is null or mod(entry_price,tick_size)=0),
  check (stop_price is null or mod(stop_price,tick_size)=0),
  check (target_price is null or mod(target_price,tick_size)=0),
  check (exit_price is null or mod(exit_price,tick_size)=0)
);
create index trades_owner_date on public.trades(user_id,trade_date desc);
create index trades_owner_exit on public.trades(user_id,exit_at);
create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,entry_date), unique(id,user_id)
);
create table public.trade_screenshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trade_id uuid not null,
  object_path text not null unique,
  caption text not null default '',
  created_at timestamptz not null default now(),
  foreign key (trade_id,user_id) references public.trades(id,user_id) on delete cascade,
  check (split_part(object_path,'/',1)=user_id::text)
);
create table public.journal_screenshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  journal_id uuid not null,
  object_path text not null unique,
  caption text not null default '',
  created_at timestamptz not null default now(),
  foreign key (journal_id,user_id) references public.journal_entries(id,user_id) on delete cascade,
  check (split_part(object_path,'/',1)=user_id::text)
);
create table public.mistake_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check(length(trim(name)) between 1 and 60),
  unique(user_id,name), unique(id,user_id)
);
create table public.emotion_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check(length(trim(name)) between 1 and 60),
  unique(user_id,name)
);
create table public.trade_mistake_tags (
  user_id uuid not null references auth.users(id) on delete cascade,
  trade_id uuid not null,
  tag_id uuid not null,
  primary key(trade_id,tag_id),
  foreign key (trade_id,user_id) references public.trades(id,user_id) on delete cascade,
  foreign key (tag_id,user_id) references public.mistake_tags(id,user_id) on delete cascade
);

create function public.provision_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.profiles(id,display_name) values(new.id,coalesce(new.raw_user_meta_data->>'display_name',''));
  insert into public.application_settings(user_id) values(new.id);
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.provision_user();
revoke all on function public.provision_user() from public,anon,authenticated;

create function public.touch_updated_at() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end;
$$;
create trigger trades_updated before update on public.trades for each row execute function public.touch_updated_at();
create trigger journals_updated before update on public.journal_entries for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
create policy owner_profile on public.profiles for all to authenticated using (id=(select auth.uid())) with check (id=(select auth.uid()));
alter table public.application_settings enable row level security;
create policy owner_settings on public.application_settings for all to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
alter table public.futures_contract_specs enable row level security;
create policy read_specs on public.futures_contract_specs for select to authenticated using (user_id is null or user_id=(select auth.uid()));
create policy own_specs on public.futures_contract_specs for all to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));

do $$ declare t text;
begin
  foreach t in array array['trades','journal_entries','trade_screenshots','journal_screenshots','mistake_tags','emotion_tags','trade_mistake_tags'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('create policy owner_access on public.%I for all to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()))',t);
  end loop;
end $$;

-- Defense in depth: anonymous role has no access even if default grants change.
revoke all on all tables in schema public from anon;
grant usage on schema public to authenticated;
grant select,insert,update,delete on all tables in schema public to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('screenshots','screenshots',false,10485760,array['image/png','image/jpeg','image/webp']);
create policy screenshot_read on storage.objects for select to authenticated using(bucket_id='screenshots' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy screenshot_insert on storage.objects for insert to authenticated with check(bucket_id='screenshots' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy screenshot_delete on storage.objects for delete to authenticated using(bucket_id='screenshots' and (storage.foldername(name))[1]=(select auth.uid())::text);
-- Uploads use unique immutable paths. Replacing an image uploads a new object.
