
-- Roles
create type public.app_role as enum ('admin', 'consulta');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "users can read own roles" on public.user_roles for select to authenticated
  using (auth.uid() = user_id);
create policy "admins manage roles" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text,
  correo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles readable by auth" on public.profiles for select to authenticated using (true);
create policy "users update own profile" on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);
create policy "admins manage profiles" on public.profiles for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Auto profile + first user becomes admin
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare user_count int;
begin
  insert into public.profiles (id, nombre, correo)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)), new.email);

  select count(*) into user_count from auth.users;
  if user_count = 1 then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'consulta');
  end if;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Motivos
create table public.motivos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  color text not null default '#1F3F5E',
  activo boolean not null default true,
  orden int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.motivos to authenticated;
grant all on public.motivos to service_role;
alter table public.motivos enable row level security;
create policy "auth read motivos" on public.motivos for select to authenticated using (true);
create policy "admins manage motivos" on public.motivos for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

insert into public.motivos (nombre, color, orden) values
  ('OK', '#22c55e', 1),
  ('Definiciones del cliente', '#1F3F5E', 2),
  ('Componentes faltantes', '#79161D', 3),
  ('Chassis', '#3B6FA0', 4),
  ('Mano de obra', '#575657', 5),
  ('Tanque', '#0d7a5f', 6),
  ('Diseño', '#c9a84c', 7),
  ('BOM', '#8b6f5e', 8),
  ('Ensamble + Subensamble', '#4a6741', 9),
  ('Logística', '#c17c74', 10);

-- Indicadores mensuales
create table public.indicadores_mensuales (
  id uuid primary key default gen_random_uuid(),
  anio int not null check (anio between 2000 and 2100),
  mes int not null check (mes between 1 and 12),
  motivo_id uuid not null references public.motivos(id) on delete restrict,
  porcentaje numeric(6,2) not null check (porcentaje >= 0 and porcentaje <= 100),
  observaciones text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (anio, mes, motivo_id)
);
grant select, insert, update, delete on public.indicadores_mensuales to authenticated;
grant all on public.indicadores_mensuales to service_role;
alter table public.indicadores_mensuales enable row level security;
create policy "auth read indicadores" on public.indicadores_mensuales for select to authenticated using (true);
create policy "admins manage indicadores" on public.indicadores_mensuales for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- updated_at trigger
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger set_updated_at_motivos before update on public.motivos
  for each row execute function public.tg_set_updated_at();
create trigger set_updated_at_indicadores before update on public.indicadores_mensuales
  for each row execute function public.tg_set_updated_at();
create trigger set_updated_at_profiles before update on public.profiles
  for each row execute function public.tg_set_updated_at();

-- Seed historical data from the uploaded excel
with m as (select id, nombre from public.motivos)
insert into public.indicadores_mensuales (anio, mes, motivo_id, porcentaje)
select v.anio, v.mes, m.id, v.pct from m
join (values
  ('Definiciones del cliente',2025,10,11),('Definiciones del cliente',2025,11,3),('Definiciones del cliente',2025,12,8),('Definiciones del cliente',2026,1,0),('Definiciones del cliente',2026,2,3),('Definiciones del cliente',2026,3,0),('Definiciones del cliente',2026,4,7),('Definiciones del cliente',2026,5,5),
  ('Componentes faltantes',2025,10,54),('Componentes faltantes',2025,11,56),('Componentes faltantes',2025,12,4),('Componentes faltantes',2026,1,21),('Componentes faltantes',2026,2,8),('Componentes faltantes',2026,3,0),('Componentes faltantes',2026,4,0),('Componentes faltantes',2026,5,0),
  ('OK',2025,10,15),('OK',2025,11,22),('OK',2025,12,32),('OK',2026,1,24),('OK',2026,2,31),('OK',2026,3,44),('OK',2026,4,33),('OK',2026,5,43),
  ('Chassis',2025,10,9),('Chassis',2025,11,19),('Chassis',2025,12,16),('Chassis',2026,1,16),('Chassis',2026,2,29),('Chassis',2026,3,5),('Chassis',2026,4,11),('Chassis',2026,5,14),
  ('Mano de obra',2025,10,0),('Mano de obra',2025,11,0),('Mano de obra',2025,12,28),('Mano de obra',2026,1,8),('Mano de obra',2026,2,8),('Mano de obra',2026,3,24),('Mano de obra',2026,4,26),('Mano de obra',2026,5,0),
  ('Tanque',2025,10,2),('Tanque',2025,11,0),('Tanque',2025,12,4),('Tanque',2026,1,0),('Tanque',2026,2,0),('Tanque',2026,3,0),('Tanque',2026,4,0),('Tanque',2026,5,0),
  ('Diseño',2025,10,2),('Diseño',2025,11,0),('Diseño',2025,12,8),('Diseño',2026,1,4),('Diseño',2026,2,5),('Diseño',2026,3,2),('Diseño',2026,4,11),('Diseño',2026,5,29),
  ('BOM',2025,10,9),('BOM',2025,11,0),('BOM',2025,12,4),('BOM',2026,1,3),('BOM',2026,2,3),('BOM',2026,3,0),('BOM',2026,4,0),('BOM',2026,5,0),
  ('Ensamble + Subensamble',2025,10,0),('Ensamble + Subensamble',2025,11,0),('Ensamble + Subensamble',2025,12,0),('Ensamble + Subensamble',2026,1,18),('Ensamble + Subensamble',2026,2,0),('Ensamble + Subensamble',2026,3,0),('Ensamble + Subensamble',2026,4,0),('Ensamble + Subensamble',2026,5,0),
  ('Logística',2025,10,0),('Logística',2025,11,0),('Logística',2025,12,0),('Logística',2026,1,0),('Logística',2026,2,0),('Logística',2026,3,0),('Logística',2026,4,0),('Logística',2026,5,0)
) as v(nombre, anio, mes, pct) on m.nombre = v.nombre;
