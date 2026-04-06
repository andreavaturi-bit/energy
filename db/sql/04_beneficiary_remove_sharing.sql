-- Migration: remove cost-sharing fields, add beneficiary_subject_id
-- Run against the Neon/Supabase database

-- 1) Remove shared_with from transactions
ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_shared_with_subject_id_subjects_id_fk,
  DROP COLUMN IF EXISTS shared_with_subject_id,
  DROP COLUMN IF EXISTS share_percentage;

-- 2) Remove shared_with from recurrences
ALTER TABLE recurrences
  DROP CONSTRAINT IF EXISTS recurrences_shared_with_subject_id_subjects_id_fk,
  DROP COLUMN IF EXISTS shared_with_subject_id,
  DROP COLUMN IF EXISTS share_percentage;

-- 3) Add beneficiary to transactions
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS beneficiary_subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_beneficiary_subject_id
  ON transactions(beneficiary_subject_id);
