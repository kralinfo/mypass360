-- ============================================
-- MyPass360 — Add PIX fields to organizer_bank_accounts
-- Created: 2026-10-01
-- Adds pix_key and contact_phone columns required for
-- the PIX-based payout flow, and relaxes legacy NOT NULL
-- constraints that are not applicable in the new flow.
-- ============================================

-- 1. Add pix_key column (the actual PIX key for transfer)
ALTER TABLE public.organizer_bank_accounts
  ADD COLUMN IF NOT EXISTS pix_key TEXT;

-- 2. Add contact_phone column
ALTER TABLE public.organizer_bank_accounts
  ADD COLUMN IF NOT EXISTS contact_phone TEXT;

-- 3. Relax NOT NULL constraints from legacy bank-transfer fields
--    These fields are no longer required in the PIX-only flow.
ALTER TABLE public.organizer_bank_accounts
  ALTER COLUMN document DROP NOT NULL;

ALTER TABLE public.organizer_bank_accounts
  ALTER COLUMN agency DROP NOT NULL;

ALTER TABLE public.organizer_bank_accounts
  ALTER COLUMN account_number DROP NOT NULL;

ALTER TABLE public.organizer_bank_accounts
  ALTER COLUMN account_digit DROP NOT NULL;

-- 4. Set empty string defaults for legacy columns so existing
--    rows are not broken by the schema change.
UPDATE public.organizer_bank_accounts
  SET
    document       = COALESCE(document, ''),
    agency         = COALESCE(agency, ''),
    account_number = COALESCE(account_number, ''),
    account_digit  = COALESCE(account_digit, '')
  WHERE
    document IS NULL
    OR agency IS NULL
    OR account_number IS NULL
    OR account_digit IS NULL;
