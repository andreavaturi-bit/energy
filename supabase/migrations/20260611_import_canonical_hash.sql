-- Hash canonico per la deduplicazione degli import.
-- Applicata su Supabase il 2026-06-11 (migration: import_canonical_hash).
--
-- La stringa canonica e la sua normalizzazione DEVONO restare byte-identiche
-- all'implementazione JS in src/lib/csvEngine.ts (funzione sha256Hex +
-- canonicalString), altrimenti la dedup tra wizard CSV, backfill e PDF si rompe.
-- Parita' JS WebCrypto / Postgres pgcrypto verificata su dato reale.
--
-- Formato: date | amount(2 decimali con segno) | descrizione normalizzata | occorrenza
-- - descrizione normalizzata = trim + whitespace collassato, senza case/accent folding
-- - occorrenza (0-based) = indice tra righe identiche stesso (container,date,amount,desc),
--   necessario per non perdere i "twin" legittimi (es. due caffe' da 1,20 stesso giorno).

create or replace function canonical_tx_hash(
  p_date date,
  p_amount numeric,
  p_description text,
  p_occurrence int
)
returns text
language sql
immutable
set search_path = public, extensions
as $$
  select encode(
    extensions.digest(
      convert_to(
        to_char(p_date, 'YYYY-MM-DD') || '|' ||
        to_char(round(p_amount, 2), 'FM999999990.00') || '|' ||
        trim(regexp_replace(coalesce(p_description, ''), '\s+', ' ', 'g')) || '|' ||
        p_occurrence::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  )
$$;

-- Backfill di tutte le transazioni esistenti:
-- - ISP 2767 (2562 righe importate da PDF) avevano external_hash NULL
-- - Contanti (320 righe) avevano il vecchio hash djb2, non piu' deduplicabile
with occ as (
  select id,
         (row_number() over (
            partition by container_id, date,
                         round(amount, 2),
                         trim(regexp_replace(coalesce(description,''), '\s+', ' ', 'g'))
            order by date, created_at, id
         ) - 1)::int as occurrence,
         date, amount, description
  from transactions
)
update transactions t
set external_hash = canonical_tx_hash(o.date, o.amount, o.description, o.occurrence),
    updated_at = now()
from occ o
where o.id = t.id;
