-- Operazioni multi-step su transactions rese atomiche (una transazione SQL).
-- Applicata su Supabase il 2026-06-11.
-- Prima erano sequenze di insert/update/delete separati con errori ignorati:
-- un fallimento a meta' lasciava saldi sbagliati senza segnalazione.
-- Testate su contenitore usa-e-getta (split/unsplit/transfer/delete-pair/
-- reconcile con verifica saldi). Chiamate dagli handler in transactions.ts.

create or replace function tx_split(p_parent_id uuid, p_children jsonb)
returns jsonb language plpgsql set search_path = public as $$
declare
  v_parent transactions%rowtype;
  v_parent_amt numeric; v_children_sum numeric; v_is_out boolean;
  v_child jsonb; v_child_amt numeric; v_new_id uuid; v_tag jsonb;
  v_created jsonb := '[]'::jsonb;
begin
  select * into v_parent from transactions where id = p_parent_id for update;
  if not found then raise exception 'PARENT_NOT_FOUND'; end if;
  v_parent_amt := abs(v_parent.amount);
  select coalesce(sum(abs((c->>'amount')::numeric)), 0) into v_children_sum
  from jsonb_array_elements(p_children) c;
  if abs(v_parent_amt - v_children_sum) > 0.01 then
    raise exception 'SUM_MISMATCH: % vs %', v_children_sum, v_parent_amt;
  end if;
  update transactions set status = 'split', updated_at = now() where id = p_parent_id;
  v_is_out := v_parent.amount < 0;
  for v_child in select * from jsonb_array_elements(p_children) loop
    v_child_amt := abs((v_child->>'amount')::numeric);
    if v_is_out then v_child_amt := -v_child_amt; end if;
    insert into transactions (date, description, amount, currency, container_id, type,
                              status, source, split_parent_id, beneficiary_subject_id, notes)
    values (v_parent.date,
            coalesce(nullif(v_child->>'description',''), v_parent.description),
            v_child_amt, v_parent.currency, v_parent.container_id, v_parent.type,
            'completed', 'manual', p_parent_id,
            nullif(v_child->>'beneficiarySubjectId','')::uuid,
            nullif(v_child->>'notes',''))
    returning id into v_new_id;
    if v_child ? 'tagIds' then
      for v_tag in select * from jsonb_array_elements(v_child->'tagIds') loop
        insert into transaction_tags (transaction_id, tag_id)
        values (v_new_id, (trim('"' from v_tag::text))::uuid) on conflict do nothing;
      end loop;
    end if;
    v_created := v_created || jsonb_build_object('id', v_new_id, 'amount', v_child_amt);
  end loop;
  return jsonb_build_object('parentId', p_parent_id, 'children', v_created);
end; $$;

create or replace function tx_unsplit(p_parent_id uuid)
returns jsonb language plpgsql set search_path = public as $$
declare v_deleted int;
begin
  delete from transactions where split_parent_id = p_parent_id;
  get diagnostics v_deleted = row_count;
  update transactions set status = 'completed', updated_at = now()
  where id = p_parent_id and status = 'split';
  return jsonb_build_object('unsplit', true, 'deletedChildren', v_deleted);
end; $$;

create or replace function tx_transfer(
  p_date date, p_description text, p_notes text, p_amount numeric, p_currency text,
  p_from_container uuid, p_to_container uuid, p_status text, p_source text
) returns jsonb language plpgsql set search_path = public as $$
declare v_abs numeric := abs(p_amount); v_out_id uuid; v_in_id uuid;
begin
  insert into transactions (date, description, notes, amount, currency, container_id, type, status, source)
  values (p_date, p_description, p_notes, -v_abs, coalesce(p_currency,'EUR'), p_from_container, 'transfer_out', coalesce(p_status,'completed'), coalesce(p_source,'manual'))
  returning id into v_out_id;
  insert into transactions (date, description, notes, amount, currency, container_id, type, status, source)
  values (p_date, p_description, p_notes, v_abs, coalesce(p_currency,'EUR'), p_to_container, 'transfer_in', coalesce(p_status,'completed'), coalesce(p_source,'manual'))
  returning id into v_in_id;
  update transactions set transfer_linked_id = v_in_id where id = v_out_id;
  update transactions set transfer_linked_id = v_out_id where id = v_in_id;
  return jsonb_build_object('transferOutId', v_out_id, 'transferInId', v_in_id);
end; $$;

create or replace function tx_delete_with_pair(p_id uuid)
returns jsonb language plpgsql set search_path = public as $$
declare v_linked uuid;
begin
  select transfer_linked_id into v_linked from transactions where id = p_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_linked is not null then delete from transactions where id = v_linked; end if;
  delete from transactions where id = p_id;
  return jsonb_build_object('deleted', true, 'id', p_id, 'linkedDeleted', v_linked is not null);
end; $$;

-- Elimina prima la riga importata, poi copia i campi sulla tenuta: altrimenti
-- per un istante due righe condividono (container, external_hash).
create or replace function tx_reconcile(p_keep_id uuid, p_remove_id uuid)
returns jsonb language plpgsql set search_path = public as $$
declare v_rm transactions%rowtype;
begin
  select * into v_rm from transactions where id = p_remove_id;
  if not found then raise exception 'REMOVE_NOT_FOUND'; end if;
  delete from transactions where id = p_remove_id;
  update transactions set
    external_hash = coalesce(v_rm.external_hash, external_hash),
    external_id = coalesce(v_rm.external_id, external_id),
    value_date = coalesce(v_rm.value_date, value_date),
    updated_at = now()
  where id = p_keep_id;
  return jsonb_build_object('reconciled', true, 'keptId', p_keep_id, 'removedId', p_remove_id);
end; $$;
