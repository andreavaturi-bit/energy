-- Dedup import a prova di race condition + indici di copertura FK.
-- Applicata su Supabase il 2026-06-11.
--
-- Senza questo vincolo la dedup e' solo check-then-insert: due richieste
-- concorrenti (doppio click, due tab, retry su richiesta ancora viva)
-- inseriscono entrambe l'intero file. Il vincolo permette anche l'insert
-- con ON CONFLICT DO NOTHING (upsert ignoreDuplicates lato handler batch).

-- NB: indice unique PIENO (non parziale). PostgREST/supabase-js non puo'
-- inferire un indice parziale per ON CONFLICT (manca il predicato WHERE).
-- Postgres considera i NULL distinti, quindi le transazioni manuali con
-- external_hash NULL restano inseribili senza limiti.
create unique index if not exists uniq_tx_container_hash
  on transactions (container_id, external_hash);

-- Indice di copertura per la FK piu' calda senza indice (advisor performance).
create index if not exists idx_transaction_tags_tag on transaction_tags (tag_id);
