-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  job_title text,
  native_language text not null default 'en',
  preferred_language text not null default 'en',
  languages text[] not null default array['en'],
  plan text not null default 'free' check (plan in ('free', 'pro', 'enterprise')),
  total_meetings integer not null default 0,
  total_minutes integer not null default 0,
  total_words_translated integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Meetings table
create table if not exists public.meetings (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  title text not null,
  host_id uuid references public.profiles(id) on delete cascade not null,
  scheduled_at timestamptz,
  duration_minutes integer,
  languages text[] not null default array['en'],
  status text not null default 'scheduled' check (status in ('scheduled', 'active', 'ended')),
  recording_url text,
  summary text,
  created_at timestamptz not null default now()
);

-- Meeting participants
create table if not exists public.meeting_participants (
  id uuid primary key default uuid_generate_v4(),
  meeting_id uuid references public.meetings(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  language text not null default 'en',
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  unique (meeting_id, user_id)
);

-- Feedback
create table if not exists public.feedback (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete set null,
  type text not null default 'general' check (type in ('feature', 'bug', 'translation', 'general')),
  rating integer check (rating between 1 and 5),
  message text not null,
  tags text[] not null default array[]::text[],
  anonymous boolean not null default false,
  status text not null default 'open' check (status in ('open', 'reviewing', 'planned', 'resolved')),
  created_at timestamptz not null default now()
);

-- RLS (Row Level Security)
alter table public.profiles enable row level security;
alter table public.meetings enable row level security;
alter table public.meeting_participants enable row level security;
alter table public.feedback enable row level security;

-- Policies: profiles
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Policies: meetings
create policy "Host can manage own meetings" on public.meetings for all using (auth.uid() = host_id);
create policy "Participants can view meetings" on public.meetings for select using (
  auth.uid() = host_id or
  exists (select 1 from public.meeting_participants where meeting_id = id and user_id = auth.uid())
);

-- Policies: participants
create policy "Users can view participants" on public.meeting_participants for select using (
  auth.uid() = user_id or
  exists (select 1 from public.meetings where id = meeting_id and host_id = auth.uid())
);
create policy "Users can join meetings" on public.meeting_participants for insert with check (auth.uid() = user_id);
create policy "Users can leave meetings" on public.meeting_participants for update using (auth.uid() = user_id);

-- Policies: feedback
create policy "Users can submit feedback" on public.feedback for insert with check (true);
create policy "Users can view own feedback" on public.feedback for select using (user_id = auth.uid() or anonymous = false);

-- Storage bucket for avatars
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict do nothing;

create policy "Avatar upload for authenticated" on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

create policy "Avatar public read" on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Avatar update own" on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- Trigger: auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
