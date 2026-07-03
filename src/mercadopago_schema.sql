-- -------------------------------------------------------------
-- MERCADO PAGO INTEGRATION SCHEMA UPGRADE
-- Collaborative Crowdfunding Web/Mobile App (VaquitaApp)
-- -------------------------------------------------------------

-- ==========================================
-- 1. ADD MERCADO PAGO COLUMNS TO CONTRIBUTIONS
-- ==========================================
-- Track user contributions to individual requirements/items via Mercado Pago
ALTER TABLE public.contributions 
  ADD COLUMN IF NOT EXISTS payment_method text CHECK (payment_method IN ('transfer', 'mercadopago')) DEFAULT 'transfer',
  ADD COLUMN IF NOT EXISTS mp_preference_id text,
  ADD COLUMN IF NOT EXISTS mp_payment_id text,
  ADD COLUMN IF NOT EXISTS mp_payment_status text;

-- Create an index to look up contributions by preference_id (crucial for webhooks)
CREATE INDEX IF NOT EXISTS idx_contributions_mp_pref ON public.contributions(mp_preference_id);
CREATE INDEX IF NOT EXISTS idx_contributions_mp_pay ON public.contributions(mp_payment_id);


-- ==========================================
-- 2. ADD MERCADO PAGO COLUMNS TO PROJECTS
-- ==========================================
-- Track the "TK Servicio" (Campaign administrative fee) payment state
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS tk_payment_method text CHECK (tk_payment_method IN ('transfer', 'mercadopago')) DEFAULT 'transfer',
  ADD COLUMN IF NOT EXISTS tk_mp_preference_id text,
  ADD COLUMN IF NOT EXISTS tk_mp_payment_id text,
  ADD COLUMN IF NOT EXISTS tk_mp_payment_status text,
  ADD COLUMN IF NOT EXISTS tk_payment_ticket text; -- Store receipt metadata if manual transfer is still used

CREATE INDEX IF NOT EXISTS idx_projects_tk_mp_pref ON public.projects(tk_mp_preference_id);


-- ==========================================
-- 3. WEBHOOK LOGS TABLE (AUDIT & RECOVERY)
-- ==========================================
-- Record all incoming webhooks / IPNs from Mercado Pago for audit and troubleshooting
CREATE TABLE IF NOT EXISTS public.mercadopago_notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  action text, -- e.g., 'payment.created', 'payment.updated'
  api_version text,
  mp_id bigint, -- Mercado Pago payment/order resource ID
  topic text, -- e.g., 'payment'
  payload jsonb, -- Raw webhook JSON body
  processed boolean DEFAULT false NOT NULL,
  error_message text,
  received_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  processed_at timestamp with time zone
);

-- Policy to restrict notification access to Admin only
ALTER TABLE public.mercadopago_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only admin can access mercadopago_notifications" ON public.mercadopago_notifications;
CREATE POLICY "Only admin can access mercadopago_notifications"
  ON public.mercadopago_notifications
  FOR ALL
  USING (auth.jwt() ->> 'email' = 'schaferdc@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'schaferdc@gmail.com');
