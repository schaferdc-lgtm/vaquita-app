-- ======================================================================================
-- SCRIPT DE CARGA DE PROYECTOS DE PRUEBA (VaquitaApp)
-- ORDEN DE EJECUCIÓN DEL SCRIPT:
-- 1. Verificar si los usuarios de prueba ya existen en auth.users (por email).
-- 2. Si no existen, insertarlos con UUIDs predeterminados.
-- 3. Obtener los UUIDs reales (ya sean predeterminados o existentes en la base de datos).
-- 4. Actualizar o insertar perfiles en public.profiles con los roles correctos (owner, admin, backer).
-- 5. Insertar los Proyectos de Prueba vinculados al UUID correcto del creador.
-- 6. Insertar los Componentes o Requerimientos de los proyectos.
-- ======================================================================================

DO $$
DECLARE
  v_owner_id uuid;
  v_admin_id uuid;
  v_backer_id uuid;
BEGIN
  -- --------------------------------------------------------------------------------------
  -- PASO 1: VERIFICAR E INSERTAR USUARIOS DE PRUEBA EN EL ESQUEMA AUTH DE SUPABASE
  -- --------------------------------------------------------------------------------------

  -- A. Santiago Soler (Project Owner)
  SELECT id INTO v_owner_id FROM auth.users WHERE email = 'creador@proyecto.com';
  IF v_owner_id IS NULL THEN
    v_owner_id := 'e482701b-c741-4e0d-b8d9-2f2dbf77c3a0'::uuid;
    INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, role, aud, email_confirmed_at, confirmation_token)
    VALUES (
      v_owner_id, 
      'creador@proyecto.com', 
      '{"full_name": "Santiago Soler"}'::jsonb, 
      NOW(), 
      'authenticated', 
      'authenticated', 
      NOW(),
      ''
    );
  END IF;

  -- B. Daniel Schafer (Admin) - Se asocia por email para evitar colisiones de clave duplicada
  SELECT id INTO v_admin_id FROM auth.users WHERE email = 'schaferdc@gmail.com';
  IF v_admin_id IS NULL THEN
    v_admin_id := 'de708761-0f6d-4952-b88a-360e224e7be0'::uuid;
    INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, role, aud, email_confirmed_at, confirmation_token)
    VALUES (
      v_admin_id, 
      'schaferdc@gmail.com', 
      '{"full_name": "Daniel Schafer (Admin)"}'::jsonb, 
      NOW(), 
      'authenticated', 
      'authenticated', 
      NOW(),
      ''
    );
  END IF;

  -- C. Maria Luz (Backer)
  SELECT id INTO v_backer_id FROM auth.users WHERE email = 'aportante@gmail.com';
  IF v_backer_id IS NULL THEN
    v_backer_id := 'a5cb58f6-5e58-47fb-94db-99e2e604f877'::uuid;
    INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, role, aud, email_confirmed_at, confirmation_token)
    VALUES (
      v_backer_id, 
      'aportante@gmail.com', 
      '{"full_name": "Maria Luz (Backer)"}'::jsonb, 
      NOW(), 
      'authenticated', 
      'authenticated', 
      NOW(),
      ''
    );
  END IF;

  -- --------------------------------------------------------------------------------------
  -- PASO 2: ASIGNAR ROLES Y NOMBRES EN PUBLIC.PROFILES
  -- --------------------------------------------------------------------------------------
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (v_owner_id, 'creador@proyecto.com', 'Santiago Soler (Project Owner)', 'owner')
  ON CONFLICT (id) DO UPDATE 
  SET role = 'owner', full_name = 'Santiago Soler (Project Owner)', email = 'creador@proyecto.com';

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (v_admin_id, 'schaferdc@gmail.com', 'Daniel Schafer (Admin)', 'admin')
  ON CONFLICT (id) DO UPDATE 
  SET role = 'admin', full_name = 'Daniel Schafer (Admin)', email = 'schaferdc@gmail.com';

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (v_backer_id, 'aportante@gmail.com', 'Maria Luz (Backer)', 'backer')
  ON CONFLICT (id) DO UPDATE 
  SET role = 'backer', full_name = 'Maria Luz (Backer)', email = 'aportante@gmail.com';

  -- Asegurar sincronización por correo en caso de que ya tengan perfil con ID diferente
  UPDATE public.profiles SET role = 'owner', full_name = 'Santiago Soler (Project Owner)' WHERE email = 'creador@proyecto.com';
  UPDATE public.profiles SET role = 'admin', full_name = 'Daniel Schafer (Admin)' WHERE email = 'schaferdc@gmail.com';
  UPDATE public.profiles SET role = 'backer', full_name = 'Maria Luz (Backer)' WHERE email = 'aportante@gmail.com';


  -- --------------------------------------------------------------------------------------
  -- PASO 3: INSERTAR PROYECTOS VINCULADOS AL DUEÑO CORRECTO
  -- --------------------------------------------------------------------------------------
  
  -- A. Proyecto CLUB-BAÑOS
  INSERT INTO public.projects (
    id,
    owner_id,
    name,
    description,
    category,
    avatar_url,
    banner_url,
    payment_alias,
    payment_cbu,
    start_date,
    end_date,
    is_deleted,
    is_approved,
    max_duration_months
  ) VALUES (
    'CLUB-BAÑOS',
    v_owner_id,
    'Creación de Baños para un Club',
    'Proyecto comunitario para remodelar y construir los baños del Club Social y Deportivo de nuestro barrio. ¡Tu ayuda es fundamental!',
    'construction',
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=150&h=150',
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=1200&h=400',
    'CLUB.BANOS.URQUIZA',
    '0000003100022223333444',
    '2026-06-01',
    '2026-12-31',
    false,
    true,
    12
  ) ON CONFLICT (id) DO UPDATE 
  SET 
    owner_id = EXCLUDED.owner_id,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    avatar_url = EXCLUDED.avatar_url,
    banner_url = EXCLUDED.banner_url,
    payment_alias = EXCLUDED.payment_alias,
    payment_cbu = EXCLUDED.payment_cbu,
    start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date,
    is_deleted = EXCLUDED.is_deleted,
    is_approved = EXCLUDED.is_approved,
    max_duration_months = EXCLUDED.max_duration_months;

  -- B. Proyecto FIESTA-FIN
  INSERT INTO public.projects (
    id,
    owner_id,
    name,
    description,
    category,
    avatar_url,
    banner_url,
    payment_alias,
    payment_cbu,
    start_date,
    end_date,
    is_deleted,
    is_approved,
    max_duration_months
  ) VALUES (
    'FIESTA-FIN',
    v_owner_id,
    'Fiesta de Fin de Año Comunitaria',
    'La gran fiesta del barrio para celebrar los logros de este año. Alquilamos local, contratamos DJ y compramos insumos colectivamente.',
    'party',
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=150&h=150',
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=1200&h=400',
    'FIESTA.FIN.BARRIO',
    '0000003100099998888777',
    '2026-06-01',
    '2026-12-31',
    false,
    true,
    12
  ) ON CONFLICT (id) DO UPDATE 
  SET 
    owner_id = EXCLUDED.owner_id,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    avatar_url = EXCLUDED.avatar_url,
    banner_url = EXCLUDED.banner_url,
    payment_alias = EXCLUDED.payment_alias,
    payment_cbu = EXCLUDED.payment_cbu,
    start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date,
    is_deleted = EXCLUDED.is_deleted,
    is_approved = EXCLUDED.is_approved,
    max_duration_months = EXCLUDED.max_duration_months;

END $$;

-- --------------------------------------------------------------------------------------
-- PASO 4: INSERTAR INSUMOS O REQUERIMIENTOS EN PUBLIC.COMPONENTS
-- --------------------------------------------------------------------------------------
-- A. Componentes de CLUB-BAÑOS
INSERT INTO public.components (
  id,
  project_id,
  name,
  unit_price,
  quantity,
  remaining_quantity,
  funded_amount,
  allow_partial,
  thank_you_threshold_percent
) VALUES
  ('11111111-1111-1111-1111-111111111111'::uuid, 'CLUB-BAÑOS', 'Bolsones de Arena', 50000, 100, 100, 0, false, 50),
  ('11111111-1111-1111-1111-222222222222'::uuid, 'CLUB-BAÑOS', 'Bolsas de Cemento', 30000, 20, 20, 0, false, 50),
  ('11111111-1111-1111-1111-333333333333'::uuid, 'CLUB-BAÑOS', 'Bolsas de Cal', 40000, 20, 20, 0, false, 50),
  ('11111111-1111-1111-1111-444444444444'::uuid, 'CLUB-BAÑOS', 'Ladrillos', 150, 3500, 3500, 0, false, 50),
  ('11111111-1111-1111-1111-555555555555'::uuid, 'CLUB-BAÑOS', 'Tiras de Alambre de 8', 10000, 100, 100, 0, false, 50)
ON CONFLICT (id) DO UPDATE 
SET 
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  quantity = EXCLUDED.quantity,
  remaining_quantity = EXCLUDED.remaining_quantity,
  funded_amount = EXCLUDED.funded_amount,
  allow_partial = EXCLUDED.allow_partial,
  thank_you_threshold_percent = EXCLUDED.thank_you_threshold_percent;

-- B. Componentes de FIESTA-FIN
INSERT INTO public.components (
  id,
  project_id,
  name,
  unit_price,
  quantity,
  remaining_quantity,
  funded_amount,
  allow_partial,
  thank_you_threshold_percent
) VALUES
  ('22222222-2222-2222-2222-111111111111'::uuid, 'FIESTA-FIN', 'Alquiler de Local', 1000000, 1, 1, 0, true, 50),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'FIESTA-FIN', 'DiscJockey', 500000, 1, 1, 0, true, 50),
  ('22222222-2222-2222-2222-333333333333'::uuid, 'FIESTA-FIN', 'Entradas', 50000, 1000, 1000, 0, false, 50),
  ('22222222-2222-2222-2222-444444444444'::uuid, 'FIESTA-FIN', 'Botellas de Fernet', 20000, 100, 100, 0, false, 50),
  ('22222222-2222-2222-2222-555555555555'::uuid, 'FIESTA-FIN', 'Botellas de Coca Cola', 8000, 200, 200, 0, false, 50),
  ('22222222-2222-2222-2222-666666666666'::uuid, 'FIESTA-FIN', 'Bolsas de Hielo', 5000, 25, 25, 0, false, 50)
ON CONFLICT (id) DO UPDATE 
SET 
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  quantity = EXCLUDED.quantity,
  remaining_quantity = EXCLUDED.remaining_quantity,
  funded_amount = EXCLUDED.funded_amount,
  allow_partial = EXCLUDED.allow_partial,
  thank_you_threshold_percent = EXCLUDED.thank_you_threshold_percent;

-- ======================================================================================
-- ¡Listo! El script se ha completado sin colisiones y con compatibilidad total de IDs.
-- ======================================================================================
