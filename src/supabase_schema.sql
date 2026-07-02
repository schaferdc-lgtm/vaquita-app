-- -------------------------------------------------------------
-- SUPABASE POSTGRESQL DATABASE SCHEMA
-- Collaborative Crowdfunding Web/Mobile App (VaquitaApp)
-- -------------------------------------------------------------

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ==========================================
-- 1. PROFILES TABLE
-- ==========================================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  role text not null check (role in ('admin', 'owner', 'backer')) default 'backer',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Profiles Policies (Secured: Only visible to authenticated users, no open public scrape)
create policy "Authenticated users can select profiles" 
  on public.profiles for select using (
    auth.role() = 'authenticated'
  );

create policy "Users or Admin can update their own profile" 
  on public.profiles for update using (
    auth.uid() = id or 
    auth.jwt() ->> 'email' = 'schaferdc@gmail.com'
  );

create policy "Admin can insert profiles"
  on public.profiles for insert with check (
    auth.jwt() ->> 'email' = 'schaferdc@gmail.com'
  );

create policy "Admin can delete profiles"
  on public.profiles for delete using (
    auth.jwt() ->> 'email' = 'schaferdc@gmail.com'
  );


-- ==========================================
-- 2. PROJECTS TABLE
-- ==========================================
create table if not exists public.projects (
  id text primary key, -- Custom short code / ID (e.g., 'BANOS-CLUB')
  owner_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text,
  category text not null check (category in ('construction', 'party', 'event', 'other')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on projects
alter table public.projects enable row level security;

-- Projects Policies
create policy "Projects are viewable by authenticated users"
  on public.projects for select using (
    auth.role() = 'authenticated'
  );

create policy "Owners or Admins can insert projects"
  on public.projects for insert with check (
    auth.uid() = owner_id or 
    auth.jwt() ->> 'email' = 'schaferdc@gmail.com'
  );

create policy "Owners or Admins can update projects"
  on public.projects for update using (
    auth.uid() = owner_id or 
    auth.jwt() ->> 'email' = 'schaferdc@gmail.com'
  );

create policy "Admins can delete projects"
  on public.projects for delete using (
    auth.jwt() ->> 'email' = 'schaferdc@gmail.com'
  );


-- ==========================================
-- 3. COMPONENTS TABLE (Itemized Requirements)
-- ==========================================
create table if not exists public.components (
  id uuid default gen_random_uuid() primary key,
  project_id text references public.projects(id) on delete cascade not null,
  name text not null,
  unit_price numeric not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  remaining_quantity numeric not null check (remaining_quantity >= 0),
  funded_amount numeric not null default 0 check (funded_amount >= 0),
  allow_partial boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on components
alter table public.components enable row level security;

-- Components Policies
create policy "Components are viewable by authenticated users"
  on public.components for select using (
    auth.role() = 'authenticated'
  );

create policy "Project owners or Admins can insert components"
  on public.components for insert with check (
    exists (
      select 1 from public.projects p 
      where p.id = project_id and (p.owner_id = auth.uid() or auth.jwt() ->> 'email' = 'schaferdc@gmail.com')
    )
  );

create policy "Project owners or Admins can update components"
  on public.components for update using (
    exists (
      select 1 from public.projects p 
      where p.id = project_id and (p.owner_id = auth.uid() or auth.jwt() ->> 'email' = 'schaferdc@gmail.com')
    )
  );

create policy "Project owners or Admins can delete components"
  on public.components for delete using (
    exists (
      select 1 from public.projects p 
      where p.id = project_id and (p.owner_id = auth.uid() or auth.jwt() ->> 'email' = 'schaferdc@gmail.com')
    )
  );


-- ==========================================
-- 4. CONTRIBUTIONS TABLE (Funding events)
-- ==========================================
create table if not exists public.contributions (
  id uuid default gen_random_uuid() primary key,
  project_id text references public.projects(id) on delete cascade not null,
  component_id uuid references public.components(id) on delete cascade not null,
  backer_id uuid references public.profiles(id) on delete set null,
  backer_email text not null,
  backer_name text not null,
  amount numeric not null check (amount > 0),
  quantity_bought numeric not null check (quantity_bought > 0),
  coupon_code text unique not null,
  company_alias text not null,
  status text not null check (status in ('pending', 'approved', 'rejected', 'expired')) default 'pending',
  payment_ticket text,
  payment_bank text,
  validated_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on contributions
alter table public.contributions enable row level security;

-- Contributions Policies (Extremely Secured: Only backers, project owners, or Admins can view or edit)
create policy "Users can select their own contributions, or project owners, or admin"
  on public.contributions for select using (
    backer_id = auth.uid() or
    exists (
      select 1 from public.projects p 
      where p.id = project_id and p.owner_id = auth.uid()
    ) or
    auth.jwt() ->> 'email' = 'schaferdc@gmail.com'
  );

create policy "Authenticated users can create contributions"
  on public.contributions for insert with check (
    auth.role() = 'authenticated'
  );

create policy "Backers can update payment tickets, or admin can validate"
  on public.contributions for update using (
    backer_id = auth.uid() or
    auth.jwt() ->> 'email' = 'schaferdc@gmail.com'
  );

create policy "Only Admins can delete contributions"
  on public.contributions for delete using (
    auth.jwt() ->> 'email' = 'schaferdc@gmail.com'
  );


-- ==========================================
-- 5. USER ACTIONS TABLE (Audit / Tracking)
-- ==========================================
create table if not exists public.user_actions (
  id uuid default gen_random_uuid() primary key,
  user_email text not null,
  action_type text not null,
  details text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on user_actions
alter table public.user_actions enable row level security;

-- Policies for user_actions
create policy "Admins can view all actions, users can view their own"
  on public.user_actions for select using (
    user_email = auth.jwt() ->> 'email' or
    auth.jwt() ->> 'email' = 'schaferdc@gmail.com'
  );

create policy "Authenticated users can insert actions"
  on public.user_actions for insert with check (
    auth.role() = 'authenticated'
  );

create policy "Only Admins can delete actions"
  on public.user_actions for delete using (
    auth.jwt() ->> 'email' = 'schaferdc@gmail.com'
  );


-- ==========================================
-- TRIGGERS & FUNCTIONS
-- ==========================================

-- Trigger function to handle profile creation when a user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    case 
      when new.email = 'schaferdc@gmail.com' then 'admin'::text
      else 'backer'::text -- Default role is backer
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to run on auth.users creation
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Automatically enforce schaferdc@gmail.com as ADMIN in profiles
create or replace function public.enforce_admin_schaferdc()
returns trigger as $$
begin
  if new.email = 'schaferdc@gmail.com' then
    new.role := 'admin';
  end if;
  return new;
end;
$$ language plpgsql;

create or replace trigger on_profile_before_insert_or_update
  before insert or update on public.profiles
  for each row execute procedure public.enforce_admin_schaferdc();


-- Trigger function to keep only the last 500 actions per user (excluding 'schaferdc@gmail.com')
create or replace function public.prune_user_actions()
returns trigger as $$
declare
  user_count integer;
begin
  -- Skip pruning if the action is by the Admin
  if new.user_email = 'schaferdc@gmail.com' then
    return new;
  end if;

  -- Count existing actions for this user
  select count(*) into user_count 
  from public.user_actions 
  where user_email = new.user_email;

  -- If we already have 500 actions, delete the oldest
  if user_count > 500 then
    delete from public.user_actions
    where id in (
      select id 
      from public.user_actions 
      where user_email = new.user_email 
      order by created_at asc 
      limit (user_count - 500)
    );
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Trigger to run after insert on user_actions
create or replace trigger on_user_action_insert
  after insert on public.user_actions
  for each row execute procedure public.prune_user_actions();
