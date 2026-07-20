-- --------------------------------------------------------------------------------------
-- COLLABORATIVE CROWDFUNDING DATABASE SCHEMA (VaquitaApp)
-- Target Platform: Supabase / PostgreSQL (14+)
-- --------------------------------------------------------------------------------------
--
-- ======================================================================================
-- CONTROL DE RECURSOS Y COMPONENTES (SUMMARY OF OBJECTS TO BE CREATED)
-- ======================================================================================
--
-- 1. TABLAS (TABLES):
--    - public.profiles                    : Perfiles de usuario vinculados al login de Supabase Auth (roles: admin, owner, backer).
--    - public.projects                    : Campañas/Eventos de financiación con CBU, alias, fechas de vigencia y pagos Mercado Pago del "TK Servicio".
--    - public.components                  : Requerimientos/Insumos individuales de un proyecto (precios, stock y soporte para pagos parciales).
--    - public.contributions               : Transacciones de aporte monetario, cupones generados, alias de empresa y estado de verificación.
--    - public.user_actions                : Bitácora de auditoría y acciones realizadas (límitado automáticamente a 500 filas por usuario).
--    - public.mercadopago_notifications   : Registro de webhooks y notificaciones IPN entrantes de Mercado Pago para auditoría técnica.
--    - public.admin_emails                : Bandeja de entrada interna del sistema (notificaciones de intenciones de pago y transferencias).
--
-- 2. ÍNDICES (INDEXES):
--    - idx_profiles_email                 : Búsquedas eficientes de usuarios por correo electrónico.
--    - idx_projects_owner_id              : Relación uno a muchos de creadores de proyectos.
--    - idx_components_project_id          : Indexación de requerimientos de cada proyecto.
--    - idx_contributions_project_id       : Indexación de aportes recibidos por proyecto.
--    - idx_contributions_component_id     : Indexación de aportes asociados a cada requerimiento.
--    - idx_contributions_backer_email     : Filtrado rápido de contribuciones del aportante.
--    - idx_contributions_mp_pref          : Búsqueda rápida de transacciones Mercado Pago por Preference ID.
--    - idx_contributions_mp_pay           : Notificaciones de conciliación Mercado Pago por Payment ID.
--    - idx_projects_tk_mp_pref            : Preference ID para el cobro del "TK Servicio" en proyectos.
--    - idx_user_actions_user_email        : Filtros y visualización del log por usuario.
--    - idx_admin_emails_recipient         : Filtros de mensajes dirigidos al admin.
--
-- 3. PROCEDIMIENTOS ALMACENADOS Y TRIGGERS (STORED PROCEDURES & TRIGGERS):
--    - public.handle_new_user()           : Inserta un perfil de usuario automáticamente tras su registro en Supabase Auth.
--    - public.enforce_admin_schaferdc()   : Garantiza y fuerza que el email "schaferdc@gmail.com" sea registrado y guardado como Admin.
--    - public.prune_user_actions()        : Mantiene limpia la tabla de auditoría, conservando solo las últimas 500 acciones de cada usuario.
--    - public.validate_contribution()     : Procedimiento lógico central para validar aportes (transacción de aprobación, cálculo de stock remanente y de montos parciales, y log automático).
--
-- --------------------------------------------------------------------------------------

-- Habilitar extensión UUID
create extension if not exists "uuid-ossp";

-- ==========================================
-- 1. PROFILES TABLE
-- ==========================================
create table if not exists public.profiles (
  id uuid primary key, -- Se remueve 'references auth.users' para permitir guardar perfiles tanto reales (Google Auth) como simulados (Gmail directo)
  email text unique not null,
  full_name text,
  role text not null check (role in ('admin', 'owner', 'backer')) default 'backer',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS en profiles
alter table public.profiles enable row level security;

-- Limpieza de políticas previas
drop policy if exists "Permitir lectura general de perfiles" on public.profiles;
drop policy if exists "Permitir auto-creación/edición del propio perfil" on public.profiles;
drop policy if exists "Acceso total para Administradores" on public.profiles;
drop policy if exists "Only admin can access profiles" on public.profiles;

-- Políticas de Seguridad (RLS) para Perfiles
create policy "Permitir lectura general de perfiles" 
  on public.profiles for select 
  using (true);

create policy "Permitir auto-creación/edición del propio perfil" 
  on public.profiles for update 
  using (auth.uid() = id or auth.uid() is null) 
  with check (auth.uid() = id or auth.uid() is null);

create policy "Permitir inserción de perfiles" 
  on public.profiles for insert 
  with check (auth.uid() = id or auth.uid() is null);

create policy "Acceso total para Administradores" 
  on public.profiles for all 
  using (auth.jwt() ->> 'email' = 'schaferdc@gmail.com')
  with check (auth.jwt() ->> 'email' = 'schaferdc@gmail.com');


-- ==========================================
-- 2. PROJECTS TABLE (Eventos/Campañas)
-- ==========================================
create table if not exists public.projects (
  id text primary key, -- Custom short code / ID (e.g., 'CLUB-BAÑOS', 'GRAD-PARTY')
  owner_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text,
  category text not null check (category in ('construction', 'party', 'event', 'other')),
  avatar_url text,
  banner_url text, -- Agregado para soportar banners de proyectos
  payment_alias text,
  payment_cbu text,
  start_date text not null,
  end_date text not null,
  is_deleted boolean not null default false,
  is_approved boolean not null default false, -- OK Final de la Administración
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Integración Mercado Pago (TK Servicio)
  tk_payment_method text check (tk_payment_method in ('transfer', 'mercadopago')) default 'transfer',
  tk_mp_preference_id text,
  tk_mp_payment_id text,
  tk_mp_payment_status text,
  tk_payment_ticket text -- Comprobante físico de transferencia del admin fee
);

-- Habilitar RLS en projects
alter table public.projects enable row level security;

-- Limpieza de políticas de proyectos
drop policy if exists "Proyectos visibles públicamente" on public.projects;
drop policy if exists "Dueños pueden insertar proyectos" on public.projects;
drop policy if exists "Dueños o Admin pueden actualizar proyectos" on public.projects;
drop policy if exists "Acceso administrativo a proyectos" on public.projects;
drop policy if exists "Only admin can access projects" on public.projects;

-- Políticas de Seguridad (RLS) para Proyectos
create policy "Proyectos visibles públicamente" 
  on public.projects for select 
  using (not is_deleted);

create policy "Dueños pueden insertar proyectos" 
  on public.projects for insert 
  with check (auth.uid() = owner_id or auth.uid() is null);

create policy "Dueños o Admin pueden actualizar proyectos" 
  on public.projects for update 
  using (auth.uid() = owner_id or auth.uid() is null or auth.jwt() ->> 'email' = 'schaferdc@gmail.com')
  with check (auth.uid() = owner_id or auth.uid() is null or auth.jwt() ->> 'email' = 'schaferdc@gmail.com');

create policy "Acceso administrativo a proyectos" 
  on public.projects for all 
  using (auth.jwt() ->> 'email' = 'schaferdc@gmail.com')
  with check (auth.jwt() ->> 'email' = 'schaferdc@gmail.com');


-- ==========================================
-- 3. COMPONENTS TABLE (Requerimientos/Insumos)
-- ==========================================
create table if not exists public.components (
  id uuid default gen_random_uuid() primary key,
  project_id text references public.projects(id) on delete cascade not null,
  name text not null,
  unit_price numeric not null check (unit_price >= 0),
  quantity numeric not null check (quantity > 0), -- Se cambia a numeric para mayor precisión
  remaining_quantity numeric not null check (remaining_quantity >= 0),
  funded_amount numeric not null default 0 check (funded_amount >= 0),
  allow_partial boolean not null default false, -- Habilita financiamiento fraccionado/parcial
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Columna Generada: Costo Total Estimado
  total_price numeric generated always as (quantity * unit_price) stored
);

-- Habilitar RLS en components
alter table public.components enable row level security;

-- Limpieza de políticas de componentes
drop policy if exists "Requerimientos visibles públicamente" on public.components;
drop policy if exists "Creadores o Admin pueden editar componentes" on public.components;
drop policy if exists "Only admin can access components" on public.components;

-- Políticas de Seguridad (RLS) para Requerimientos
create policy "Requerimientos visibles públicamente" 
  on public.components for select 
  using (true);

create policy "Creadores o Admin pueden editar componentes" 
  on public.components for all 
  using (
    exists (
      select 1 from public.projects 
      where projects.id = components.project_id 
      and (projects.owner_id = auth.uid() or auth.uid() is null or auth.jwt() ->> 'email' = 'schaferdc@gmail.com')
    )
  )
  with check (
    exists (
      select 1 from public.projects 
      where projects.id = components.project_id 
      and (projects.owner_id = auth.uid() or auth.uid() is null or auth.jwt() ->> 'email' = 'schaferdc@gmail.com')
    )
  );


-- ==========================================
-- 4. CONTRIBUTIONS TABLE (Aportes/Transacciones)
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
  payment_ticket text, -- Comprobante de transferencia física
  payment_bank text, -- Banco origen de la transferencia
  validated_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Integración Mercado Pago (Aporte directo)
  payment_method text check (payment_method in ('transfer', 'mercadopago')) default 'transfer',
  mp_preference_id text,
  mp_payment_id text,
  mp_payment_status text
);

-- Habilitar RLS en contributions
alter table public.contributions enable row level security;

-- Limpieza de políticas de aportes
drop policy if exists "Aportantes pueden ver sus propios aportes" on public.contributions;
drop policy if exists "Dueños de proyecto pueden ver aportes de su campaña" on public.contributions;
drop policy if exists "Cualquier persona puede insertar un aporte" on public.contributions;
drop policy if exists "Dueños de proyecto pueden cargar comprobantes y Admin validar" on public.contributions;
drop policy if exists "Only admin can access contributions" on public.contributions;

-- Políticas de Seguridad (RLS) para Aportes
create policy "Aportantes pueden ver sus propios aportes" 
  on public.contributions for select 
  using (true); -- Permitimos lectura pública para transparencia comunitaria y correcto cálculo de barras de progreso

create policy "Dueños de proyecto pueden ver aportes de su campaña" 
  on public.contributions for select 
  using (true);

create policy "Cualquier persona puede insertar un aporte" 
  on public.contributions for insert 
  with check (true);

create policy "Aportantes o Administradores pueden actualizar aportes" 
  on public.contributions for update 
  using (
    auth.uid() = backer_id 
    or auth.uid() is null
    or lower(backer_email) = lower(auth.jwt() ->> 'email')
    or auth.jwt() ->> 'email' = 'schaferdc@gmail.com'
    or exists (
      select 1 from public.projects 
      where projects.id = contributions.project_id 
      and (projects.owner_id = auth.uid() or auth.uid() is null)
    )
  );


-- ==========================================
-- 5. USER ACTIONS TABLE (Bitácora de auditoría)
-- ==========================================
create table if not exists public.user_actions (
  id uuid default gen_random_uuid() primary key,
  user_email text not null,
  action_type text not null,
  details text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS en user_actions
alter table public.user_actions enable row level security;

-- Limpieza de políticas de auditoría
drop policy if exists "Usuarios ven sus acciones y Admin todo" on public.user_actions;
drop policy if exists "Permitir inserción de logs" on public.user_actions;
drop policy if exists "Only admin can access user_actions" on public.user_actions;

-- Políticas de Seguridad (RLS) para Auditoría
create policy "Usuarios ven sus acciones y Admin todo" 
  on public.user_actions for select 
  using (lower(user_email) = lower(auth.jwt() ->> 'email') or auth.jwt() ->> 'email' = 'schaferdc@gmail.com');

create policy "Permitir inserción de logs" 
  on public.user_actions for insert 
  with check (true);


-- ==========================================
-- 6. MERCADO PAGO NOTIFICATIONS TABLE (Auditoría Webhooks)
-- ==========================================
create table if not exists public.mercadopago_notifications (
  id uuid default gen_random_uuid() primary key,
  action text, -- e.g., 'payment.created', 'payment.updated'
  api_version text,
  mp_id bigint, -- ID del recurso de Mercado Pago
  topic text, -- e.g., 'payment'
  payload jsonb, -- Cuerpo crudo de la notificación
  processed boolean default false not null,
  error_message text,
  received_at timestamp with time zone default timezone('utc'::text, now()) not null,
  processed_at timestamp with time zone
);

-- Habilitar RLS en mercadopago_notifications
alter table public.mercadopago_notifications enable row level security;

-- Limpieza de políticas
drop policy if exists "Only admin can access mercadopago_notifications" on public.mercadopago_notifications;

-- Políticas de Seguridad (RLS) para Notificaciones MP (Solo Admin)
create policy "Only admin can access mercadopago_notifications"
  on public.mercadopago_notifications for all
  using (auth.jwt() ->> 'email' = 'schaferdc@gmail.com')
  with check (auth.jwt() ->> 'email' = 'schaferdc@gmail.com');


-- ==========================================
-- 7. ADMIN EMAILS TABLE (Bandeja de Entrada Interna)
-- ==========================================
create table if not exists public.admin_emails (
  id uuid default gen_random_uuid() primary key,
  sender_name text not null,
  sender_email text not null,
  recipient_email text not null,
  subject text not null,
  body text not null,
  received_at timestamp with time zone default timezone('utc'::text, now()) not null,
  is_read boolean default false not null,
  type text not null check (type in ('payment_intent', 'payment_result'))
);

-- Habilitar RLS en admin_emails
alter table public.admin_emails enable row level security;

-- Limpieza de políticas
drop policy if exists "Cualquiera puede enviar correos al admin" on public.admin_emails;
drop policy if exists "Solo el administrador puede leer/editar sus correos" on public.admin_emails;

-- Políticas de Seguridad (RLS) para Correos Administrativos
create policy "Cualquiera puede enviar correos al admin"
  on public.admin_emails for insert
  with check (true);

create policy "Solo el administrador puede leer/editar sus correos"
  on public.admin_emails for all
  using (auth.jwt() ->> 'email' = 'schaferdc@gmail.com')
  with check (auth.jwt() ->> 'email' = 'schaferdc@gmail.com');


-- ======================================================================================
-- 2. ÍNDICES DE RENDIMIENTO (PERFORMANCE INDEXES)
-- ======================================================================================
create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_projects_owner_id on public.projects(owner_id);
create index if not exists idx_components_project_id on public.components(project_id);
create index if not exists idx_contributions_project_id on public.contributions(project_id);
create index if not exists idx_contributions_component_id on public.contributions(component_id);
create index if not exists idx_contributions_backer_id on public.contributions(backer_id);
create index if not exists idx_contributions_backer_email on public.contributions(backer_email);
create index if not exists idx_contributions_mp_pref on public.contributions(mp_preference_id);
create index if not exists idx_contributions_mp_pay on public.contributions(mp_payment_id);
create index if not exists idx_projects_tk_mp_pref on public.projects(tk_mp_preference_id);
create index if not exists idx_user_actions_user_email on public.user_actions(user_email);
create index if not exists idx_admin_emails_recipient on public.admin_emails(recipient_email);
create index if not exists idx_admin_emails_sender on public.admin_emails(sender_email);


-- ======================================================================================
-- 3. PROCEDIMIENTOS ALMACENADOS Y TRIGGERS (TRIGGERS & STORED PROCEDURES)
-- ======================================================================================

-- A. Trigger para Sincronizar perfiles creados desde Supabase Auth
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
      else 'backer'::text
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- B. Trigger para asegurar rol ADMIN en perfiles
create or replace function public.enforce_admin_schaferdc()
returns trigger as $$
begin
  if new.email = 'schaferdc@gmail.com' then
    new.role := 'admin';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_profile_before_insert_or_update on public.profiles;
create or replace trigger on_profile_before_insert_or_update
  before insert or update on public.profiles
  for each row execute procedure public.enforce_admin_schaferdc();


-- C. Trigger para Prunar la tabla de acciones y evitar excesos de espacio (Límite 500 logs)
create or replace function public.prune_user_actions()
returns trigger as $$
declare
  user_count integer;
begin
  -- Excluir logs del administrador principal
  if new.user_email = 'schaferdc@gmail.com' then
    return new;
  end if;

  -- Contar registros existentes del mismo usuario
  select count(*) into user_count 
  from public.user_actions 
  where user_email = new.user_email;

  -- Eliminar los excedentes más antiguos si superan los 500 registros
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

drop trigger if exists on_user_action_insert on public.user_actions;
create or replace trigger on_user_action_insert
  after insert on public.user_actions
  for each row execute procedure public.prune_user_actions();


-- D. Procedimiento de Transacción de Aportes (validate_contribution)
-- Realiza la validación de un aporte, descontando el stock correspondiente y calculando financiamiento parcial
create or replace function public.validate_contribution(p_contrib_id uuid)
returns jsonb as $$
declare
  v_contrib record;
  v_comp record;
  v_new_remaining numeric;
  v_new_funded numeric;
  v_excess_qty numeric;
begin
  -- 1. Obtener la contribución por ID
  select * into v_contrib from public.contributions where id = p_contrib_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Contribución no encontrada');
  end if;

  if v_contrib.status = 'approved' then
    return jsonb_build_object('success', false, 'error', 'La contribución ya se encuentra aprobada');
  end if;

  -- 2. Obtener el insumo o requerimiento asociado
  select * into v_comp from public.components where id = v_contrib.component_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'El insumo o requerimiento asociado no existe');
  end if;

  -- 3. Calcular existencias de stock según tipo de financiamiento
  if v_comp.allow_partial then
    -- Financiamiento parcial: acumulamos dinero al monto financiado actual
    v_new_funded := v_comp.funded_amount + v_contrib.amount;
    
    -- Si el monto acumulado supera o es igual al precio unitario del item, se reduce el stock remanente correspondientemente
    if v_new_funded >= v_comp.unit_price then
      v_excess_qty := floor(v_new_funded / v_comp.unit_price);
      v_new_remaining := v_comp.remaining_quantity - v_excess_qty;
      v_new_funded := v_new_funded - (v_excess_qty * v_comp.unit_price);
    else
      v_new_remaining := v_comp.remaining_quantity;
    end if;
  else
    -- Compra tradicional de items enteros: restamos la cantidad comprada del stock disponible
    v_new_remaining := v_comp.remaining_quantity - v_contrib.quantity_bought;
    v_new_funded := v_comp.funded_amount;
  end if;

  -- Limitar valores negativos en el stock
  if v_new_remaining < 0 then
    v_new_remaining := 0;
  end if;

  -- 4. Actualizar el insumo (component)
  update public.components
  set 
    remaining_quantity = v_new_remaining,
    funded_amount = v_new_funded
  where id = v_comp.id;

  -- 5. Marcar la contribución como aprobada
  update public.contributions
  set 
    status = 'approved',
    validated_at = timezone('utc'::text, now())
  where id = p_contrib_id;

  -- 6. Insertar log de acción en auditoría
  insert into public.user_actions (user_email, action_type, details)
  values (
    'admin@system.db',
    'APROBACION_APORTE_SISTEMA',
    'Aprobación consolidada vía base de datos para el aporte de $' || v_contrib.amount || ' de ' || v_contrib.backer_name || ' en el proyecto ' || v_contrib.project_id
  );

  return jsonb_build_object(
    'success', true, 
    'message', 'Aporte verificado y consolidado exitosamente',
    'remaining_quantity', v_new_remaining,
    'funded_amount', v_new_funded
  );
end;
$$ language plpgsql security definer;


-- ======================================================================================
-- 4. ALTERACIONES DE ESQUEMA PARA ACTUALIZACIÓN DE NUEVAS FUNCIONALIDADES (VERSION 2)
-- ======================================================================================
-- Ejecutar estas sentencias en el SQL Editor de Supabase para actualizar una BBDD existente.

alter table public.projects 
  add column if not exists max_duration_months integer default 12,
  add column if not exists document_url text,
  add column if not exists document_name text,
  add column if not exists photo_reel jsonb default '[]'::jsonb;

alter table public.components
  add column if not exists thank_you_threshold_percent numeric default 50 check (thank_you_threshold_percent >= 0 and thank_you_threshold_percent <= 100);
