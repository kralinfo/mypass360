-- ============================================
-- MyPass360 — Create Organizer Bank Accounts Table
-- Created: 2026-09-10
-- ============================================

CREATE TABLE IF NOT EXISTS public.organizer_bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  person_type TEXT NOT NULL CHECK (person_type IN ('pf', 'pj')),
  holder_name TEXT NOT NULL,
  document TEXT NOT NULL,
  bank_code TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('corrente', 'poupanca')),
  agency TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_digit TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_bank_account UNIQUE (user_id)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_organizer_bank_accounts_user_id ON public.organizer_bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_organizer_bank_accounts_event_id ON public.organizer_bank_accounts(event_id);

-- Enable RLS
ALTER TABLE public.organizer_bank_accounts ENABLE ROW LEVEL SECURITY;

-- Policies: Organizador gerencia a própria conta
CREATE POLICY "Users can manage their own bank account"
  ON public.organizer_bank_accounts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow reading for admin & system
CREATE POLICY "Allow read for bank accounts"
  ON public.organizer_bank_accounts
  FOR SELECT
  USING (true);
