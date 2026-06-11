-- Fissa search_path sulle funzioni di aggregazione (advisor security:
-- function_search_path_mutable). Le tx_* e canonical_tx_hash lo impostano
-- gia' nella loro definizione.
alter function container_balances() set search_path = public;
alter function balances_by_currency() set search_path = public;
alter function flows_summary(date, date, uuid, text, boolean) set search_path = public;
alter function monthly_flows(date, date, uuid, text) set search_path = public;
alter function tag_breakdown(text, date, date, uuid, text) set search_path = public;
alter function transactions_summary(uuid, uuid, uuid, text, text, date, date, text, uuid) set search_path = public;
alter function pending_totals() set search_path = public;
