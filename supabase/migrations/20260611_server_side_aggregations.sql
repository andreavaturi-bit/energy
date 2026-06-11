-- Funzioni di aggregazione server-side per saldi e statistiche.
-- Applicata su Supabase il 2026-06-11 (migration: server_side_aggregations).
--
-- Motivazione: i saldi e le statistiche venivano calcolati scaricando le
-- righe delle transazioni via PostgREST e sommandole in JavaScript, ma
-- PostgREST tronca i risultati a db_max_rows: con piu' di 1000 movimenti
-- i totali diventavano sbagliati e diversi tra pagina e pagina.
--
-- Regole comuni: le transazioni con status 'cancelled' e i parent con
-- status 'split' sono SEMPRE esclusi dai calcoli (i figli dello split,
-- status 'completed', sono inclusi).

-- 1) Saldo corrente per contenitore: initial_balance + somma transazioni attive
create or replace function container_balances()
returns table (container_id uuid, balance numeric)
language sql stable
as $$
  select c.id,
         c.initial_balance + coalesce(sum(t.amount) filter (where t.status not in ('cancelled','split')), 0)
  from containers c
  left join transactions t on t.container_id = c.id
  group by c.id, c.initial_balance
$$;

-- 2) Patrimonio per valuta (solo contenitori attivi)
create or replace function balances_by_currency()
returns table (currency text, total numeric)
language sql stable
as $$
  select c.currency::text,
         sum(c.initial_balance + coalesce(tx.s, 0))
  from containers c
  left join lateral (
    select sum(t.amount) as s
    from transactions t
    where t.container_id = c.id
      and t.status not in ('cancelled','split')
  ) tx on true
  where c.is_active
  group by c.currency
$$;

-- 3) Totali entrate/uscite su un periodo (trasferimenti esclusi).
--    p_only_completed=true considera solo status='completed' (burning rate),
--    altrimenti esclude solo cancelled/split.
create or replace function flows_summary(
  p_date_from date default null,
  p_date_to date default null,
  p_container_id uuid default null,
  p_currency text default null,
  p_only_completed boolean default false
)
returns table (income numeric, expenses numeric, tx_count bigint)
language sql stable
as $$
  select coalesce(sum(t.amount) filter (where t.amount > 0), 0),
         coalesce(sum(-t.amount) filter (where t.amount < 0), 0),
         count(*)
  from transactions t
  where t.type not in ('transfer_in','transfer_out')
    and (case when p_only_completed then t.status = 'completed'
              else t.status not in ('cancelled','split') end)
    and (p_date_from is null or t.date >= p_date_from)
    and (p_date_to is null or t.date <= p_date_to)
    and (p_container_id is null or t.container_id = p_container_id)
    and (p_currency is null or t.currency = p_currency)
$$;

-- 4) Trend mensile entrate/uscite (trasferimenti esclusi)
create or replace function monthly_flows(
  p_date_from date,
  p_date_to date default null,
  p_container_id uuid default null,
  p_currency text default null
)
returns table (month text, income numeric, expenses numeric)
language sql stable
as $$
  select to_char(t.date, 'YYYY-MM'),
         coalesce(sum(t.amount) filter (where t.amount > 0), 0),
         coalesce(sum(-t.amount) filter (where t.amount < 0), 0)
  from transactions t
  where t.type not in ('transfer_in','transfer_out')
    and t.status not in ('cancelled','split')
    and t.date >= p_date_from
    and (p_date_to is null or t.date <= p_date_to)
    and (p_container_id is null or t.container_id = p_container_id)
    and (p_currency is null or t.currency = p_currency)
  group by 1
  order by 1
$$;

-- 5) Ripartizione per tag. tag_id NULL = transazioni senza tag.
--    Nota: una transazione con N tag viene contata in ognuno degli N tag
--    (stessa semantica del calcolo precedente lato JS).
create or replace function tag_breakdown(
  p_direction text default 'expense',
  p_date_from date default null,
  p_date_to date default null,
  p_container_id uuid default null,
  p_currency text default null
)
returns table (tag_id uuid, total numeric, tx_count bigint)
language sql stable
as $$
  with txs as (
    select t.id, abs(t.amount) as amt
    from transactions t
    where t.status not in ('cancelled','split')
      and t.type not in ('transfer_in','transfer_out')
      and (case when p_direction = 'expense' then t.amount < 0 else t.amount > 0 end)
      and (p_date_from is null or t.date >= p_date_from)
      and (p_date_to is null or t.date <= p_date_to)
      and (p_container_id is null or t.container_id = p_container_id)
      and (p_currency is null or t.currency = p_currency)
  )
  select tt.tag_id, sum(txs.amt), count(*)
  from txs
  join transaction_tags tt on tt.transaction_id = txs.id
  group by tt.tag_id
  union all
  select null::uuid, coalesce(sum(txs.amt), 0), count(*)
  from txs
  where not exists (select 1 from transaction_tags tt where tt.transaction_id = txs.id)
  having count(*) > 0
$$;

-- 6) Riepilogo per la pagina Transazioni: somme per valuta su TUTTE le
--    transazioni che corrispondono ai filtri (non solo la pagina caricata).
--    Se p_status e' null esclude cancelled e parent split; se valorizzato
--    rispetta il filtro esplicito dell'utente.
create or replace function transactions_summary(
  p_container_id uuid default null,
  p_counterparty_id uuid default null,
  p_beneficiary_subject_id uuid default null,
  p_type text default null,
  p_status text default null,
  p_date_from date default null,
  p_date_to date default null,
  p_search text default null,
  p_tag_id uuid default null
)
returns table (currency text, income numeric, expenses numeric, tx_count bigint)
language sql stable
as $$
  select t.currency::text,
         coalesce(sum(t.amount) filter (where t.amount > 0), 0),
         coalesce(sum(t.amount) filter (where t.amount < 0), 0),
         count(*)
  from transactions t
  where (p_container_id is null or t.container_id = p_container_id)
    and (p_counterparty_id is null or t.counterparty_id = p_counterparty_id)
    and (p_beneficiary_subject_id is null or t.beneficiary_subject_id = p_beneficiary_subject_id)
    and (p_type is null or t.type = p_type)
    and (case when p_status is null then t.status not in ('cancelled','split')
              else t.status = p_status end)
    and (p_date_from is null or t.date >= p_date_from)
    and (p_date_to is null or t.date <= p_date_to)
    and (p_search is null
         or t.description ilike '%' || p_search || '%'
         or t.notes ilike '%' || p_search || '%')
    and (p_tag_id is null or exists (
      select 1 from transaction_tags tt
      where tt.transaction_id = t.id and tt.tag_id = p_tag_id
    ))
  group by t.currency
$$;

-- 7) Totali pendenti per valuta
create or replace function pending_totals()
returns table (currency text, credits numeric, debits numeric)
language sql stable
as $$
  select t.currency::text,
         coalesce(sum(t.amount) filter (where t.amount > 0), 0),
         coalesce(sum(-t.amount) filter (where t.amount < 0), 0)
  from transactions t
  where t.status = 'pending'
  group by t.currency
$$;
