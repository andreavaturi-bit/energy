import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  getSupabase,
  ok,
  created,
  badRequest,
  notFound,
} from '../supabase.js'

export async function handleTransactions(
  req: VercelRequest,
  res: VercelResponse,
  id: string | null,
) {
  const sb = getSupabase()
  const method = req.method

  if (method === 'GET' && !id) {
    const params = (req.query || {}) as Record<string, string | string[]>
    const param = (k: string) => {
      const v = params[k]
      return Array.isArray(v) ? v[0] : v
    }
    const limit = Math.min(parseInt(param('limit') || '200'), 1000)
    const offset = parseInt(param('offset') || '0')

    let query = sb
      .from('transactions')
      .select(
        '*, containers(name, color, currency), counterparties(name), beneficiarySubject:subjects!transactions_beneficiary_subject_id_fkey(name)',
        { count: 'exact' },
      )

    if (param('containerId')) query = query.eq('container_id', param('containerId')!)
    if (param('counterpartyId')) query = query.eq('counterparty_id', param('counterpartyId')!)
    if (param('beneficiarySubjectId')) query = query.eq('beneficiary_subject_id', param('beneficiarySubjectId')!)
    if (param('type')) query = query.eq('type', param('type')!)
    if (param('status')) query = query.eq('status', param('status')!)
    if (param('dateFrom')) query = query.gte('date', param('dateFrom')!)
    if (param('dateTo')) query = query.lte('date', param('dateTo')!)
    if (param('search')) {
      const s = param('search')!
      query = query.or(`description.ilike.%${s}%,notes.ilike.%${s}%`)
    }

    // Tag filter: if tagId is specified, filter transactions that have that tag
    const tagIdFilter = param('tagId')
    if (tagIdFilter) {
      const { data: taggedTxIds } = await sb
        .from('transaction_tags')
        .select('transaction_id')
        .eq('tag_id', tagIdFilter)
      const txIds = (taggedTxIds || []).map((r: Record<string, unknown>) => r.transaction_id as string)
      if (txIds.length === 0) {
        return ok(res, { rows: [], total: 0, limit, offset })
      }
      query = query.in('id', txIds)
    }

    const { data, error, count } = await query
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    // Fetch tags for all returned transactions in one query
    const txIds = (data || []).map((r: Record<string, unknown>) => r.id as string)
    let tagsByTxId = new Map<string, Array<Record<string, unknown>>>()
    if (txIds.length > 0) {
      const { data: allTagRows } = await sb
        .from('transaction_tags')
        .select('transaction_id, tags(id, name, type, color)')
        .in('transaction_id', txIds)
      if (allTagRows) {
        for (const row of allTagRows as Array<Record<string, unknown>>) {
          const tid = row.transaction_id as string
          if (!tagsByTxId.has(tid)) tagsByTxId.set(tid, [])
          if (row.tags) tagsByTxId.get(tid)!.push(row.tags as Record<string, unknown>)
        }
      }
    }

    // Flatten joined objects
    const rows = (data || []).map((r: Record<string, unknown>) => {
      const row = { ...r } as Record<string, unknown>
      const containers = row.containers as { name?: string; color?: string; currency?: string } | null
      const counterparties = row.counterparties as { name?: string } | null
      const beneficiarySubject = row.beneficiarySubject as { name?: string } | null
      row.container_name = containers?.name ?? null
      row.container_color = containers?.color ?? null
      row.container_currency = containers?.currency ?? null
      row.counterparty_name = counterparties?.name ?? null
      row.beneficiary_name = beneficiarySubject?.name ?? null
      row.tags = tagsByTxId.get(row.id as string) || []
      delete row.containers
      delete row.counterparties
      delete row.beneficiarySubject
      return row
    })

    // Load split children for parent-split transactions
    const splitParentIds = rows
      .filter((r: Record<string, unknown>) => r.status === 'split')
      .map((r: Record<string, unknown>) => r.id as string)

    if (splitParentIds.length > 0) {
      const { data: childRows } = await sb
        .from('transactions')
        .select('*, beneficiarySubject:subjects!transactions_beneficiary_subject_id_fkey(name), tags:transaction_tags(tags(id, name, color))')
        .in('split_parent_id', splitParentIds)
        .order('created_at')

      const childrenByParent = new Map<string, unknown[]>()
      for (const child of childRows || []) {
        const c = child as Record<string, unknown>
        // Flatten beneficiary
        const bs = c.beneficiarySubject as { name?: string } | null
        c.beneficiary_name = bs?.name ?? null
        delete c.beneficiarySubject
        // Flatten tags
        const rawTags = c.tags as Array<{ tags: Record<string, unknown> }> | null
        c.tags = (rawTags || []).map(t => t.tags).filter(Boolean)
        const pid = c.split_parent_id as string
        if (!childrenByParent.has(pid)) childrenByParent.set(pid, [])
        childrenByParent.get(pid)!.push(c)
      }
      for (const row of rows) {
        if ((row as Record<string, unknown>).status === 'split') {
          (row as Record<string, unknown>).split_children = childrenByParent.get((row as Record<string, unknown>).id as string) || []
        }
      }
    }

    return ok(res, { rows, total: count ?? 0, limit, offset })
  }

  if (method === 'GET' && id) {
    const { data, error } = await sb
      .from('transactions')
      .select(
        '*, containers(name, color), counterparties(name), beneficiarySubject:subjects!transactions_beneficiary_subject_id_fkey(name)',
      )
      .eq('id', id)
      .single()
    if (error || !data) return notFound(res, 'Transazione non trovata')

    // Get tags through junction table
    const { data: tagRows } = await sb
      .from('transaction_tags')
      .select('tags(*)')
      .eq('transaction_id', id)
    const tags = (tagRows || []).map((r: Record<string, unknown>) => r.tags)

    // Flatten
    const row = { ...data } as Record<string, unknown>
    const containers = row.containers as { name?: string; color?: string } | null
    const counterparties = row.counterparties as { name?: string } | null
    const beneficiarySubject = row.beneficiarySubject as { name?: string } | null
    row.container_name = containers?.name ?? null
    row.container_color = containers?.color ?? null
    row.counterparty_name = counterparties?.name ?? null
    row.beneficiary_name = beneficiarySubject?.name ?? null
    delete row.containers
    delete row.counterparties
    delete row.beneficiarySubject

    return ok(res, { ...row, tags })
  }

  // POST /transactions?action=batch — bulk import (chunked, with dedup)
  const params = (req.query || {}) as Record<string, string | string[]>
  const actionParam = Array.isArray(params.action) ? params.action[0] : params.action

  // POST /transactions?action=check-hashes — check which hashes already exist in DB
  if (method === 'POST' && actionParam === 'check-hashes') {
    const b = req.body || {}
    const containerId = b.containerId as string
    const hashes = b.hashes as string[]
    if (!containerId || !Array.isArray(hashes) || hashes.length === 0) {
      return badRequest(res, 'containerId e hashes[] sono obbligatori')
    }

    // Query in chunks of 500 to avoid query size limits
    const HASH_CHUNK = 500
    const existingHashes: string[] = []
    for (let i = 0; i < hashes.length; i += HASH_CHUNK) {
      const chunk = hashes.slice(i, i + HASH_CHUNK)
      const { data, error } = await sb
        .from('transactions')
        .select('external_hash')
        .eq('container_id', containerId)
        .in('external_hash', chunk)
      if (error) throw error
      if (data) {
        existingHashes.push(...data.map((r: { external_hash: string }) => r.external_hash))
      }
    }

    return ok(res, { existingHashes })
  }

  // POST /transactions?action=find-matches — find manual transactions matching imported ones
  if (method === 'POST' && actionParam === 'find-matches') {
    const b = req.body || {}
    const containerId = b.containerId as string
    const candidates = b.candidates as Array<{ date: string; amount: number; description: string }>
    if (!containerId || !Array.isArray(candidates) || candidates.length === 0) {
      return badRequest(res, 'containerId e candidates[] sono obbligatori')
    }

    // Find manual transactions in this container within ±5 days of any candidate date
    const allDates = candidates.map(c => c.date)
    const minDate = allDates.sort()[0]
    const maxDate = allDates.sort().reverse()[0]

    // Extend range by 5 days
    const fromDate = new Date(minDate)
    fromDate.setDate(fromDate.getDate() - 5)
    const toDate = new Date(maxDate)
    toDate.setDate(toDate.getDate() + 5)

    const { data: manualTxs, error } = await sb
      .from('transactions')
      .select('id, date, description, amount, currency, type, status, source, counterparty_id, container_id')
      .eq('container_id', containerId)
      .eq('source', 'manual')
      .neq('status', 'cancelled')
      .gte('date', fromDate.toISOString().slice(0, 10))
      .lte('date', toDate.toISOString().slice(0, 10))

    if (error) throw error

    // Return manual transactions for client-side matching
    return ok(res, { manualTransactions: manualTxs || [] })
  }

  // POST /transactions?action=reconcile — merge a manual transaction with an imported one
  if (method === 'POST' && actionParam === 'reconcile') {
    const b = req.body || {}
    const keepId = b.keepId as string
    const removeId = b.removeId as string
    if (!keepId || !removeId) return badRequest(res, 'keepId e removeId sono obbligatori')

    // Fetch the transaction to remove (to grab its external_hash/external_id)
    const { data: removeTx, error: fetchErr } = await sb
      .from('transactions')
      .select('external_hash, external_id, value_date')
      .eq('id', removeId)
      .single()
    if (fetchErr || !removeTx) return notFound(res, 'Transazione da rimuovere non trovata')

    // Update the kept transaction: copy dedup fields so future imports recognize it
    const keepUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (removeTx.external_hash) keepUpdate.external_hash = removeTx.external_hash
    if (removeTx.external_id) keepUpdate.external_id = removeTx.external_id
    if (removeTx.value_date) keepUpdate.value_date = removeTx.value_date

    const { error: updateErr } = await sb.from('transactions').update(keepUpdate).eq('id', keepId)
    if (updateErr) throw updateErr

    // Delete the removed transaction
    const { error: deleteErr } = await sb.from('transactions').delete().eq('id', removeId)
    if (deleteErr) throw deleteErr

    return ok(res, { reconciled: true, keptId: keepId, removedId: removeId })
  }

  // POST /transactions?action=reconcile-bulk — batch reconcile multiple pairs
  if (method === 'POST' && actionParam === 'reconcile-bulk') {
    const b = req.body || {}
    const pairs = b.pairs as Array<{ keepId: string; removeId: string }>
    if (!Array.isArray(pairs) || pairs.length === 0) {
      return badRequest(res, 'pairs[] è obbligatorio')
    }

    let reconciledCount = 0
    const errors: string[] = []

    for (const pair of pairs) {
      const { data: removeTx } = await sb
        .from('transactions')
        .select('external_hash, external_id, value_date')
        .eq('id', pair.removeId)
        .single()

      if (!removeTx) {
        errors.push(`Transazione ${pair.removeId} non trovata`)
        continue
      }

      const keepUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (removeTx.external_hash) keepUpdate.external_hash = removeTx.external_hash
      if (removeTx.external_id) keepUpdate.external_id = removeTx.external_id
      if (removeTx.value_date) keepUpdate.value_date = removeTx.value_date

      await sb.from('transactions').update(keepUpdate).eq('id', pair.keepId)
      await sb.from('transactions').delete().eq('id', pair.removeId)
      reconciledCount++
    }

    return ok(res, { reconciled: reconciledCount, errors: errors.length > 0 ? errors : undefined })
  }

  if (method === 'POST' && actionParam === 'batch') {
    const items = req.body?.transactions as unknown[]
    if (!Array.isArray(items) || items.length === 0) {
      return badRequest(res, 'transactions array is required and must not be empty')
    }

    const rows = items.map((item: unknown) => {
      const b = item as Record<string, unknown>
      return {
      date: b.date,
      value_date: b.valueDate ?? null,
      description: b.description ?? null,
      notes: b.notes ?? null,
      amount: b.amount,
      currency: b.currency ?? 'EUR',
      amount_eur: b.amountEur ?? null,
      exchange_rate: b.exchangeRate ?? null,
      container_id: b.containerId,
      counterparty_id: b.counterpartyId ?? null,
      type: b.type,
      transfer_linked_id: b.transferLinkedId ?? null,
      status: b.status ?? 'completed',
      source: b.source ?? 'manual',
      beneficiary_subject_id: b.beneficiarySubjectId ?? null,
      installment_plan_id: b.installmentPlanId ?? null,
      installment_number: b.installmentNumber ?? null,
      external_id: b.externalId ?? null,
      external_hash: (b.externalHash as string) ?? null,
    }})

    // Dedup server-side: filter out rows whose external_hash already exists
    const hashesToCheck = rows
      .map(r => r.external_hash)
      .filter((h): h is string => h !== null && h !== undefined)
    let existingHashSet = new Set<string>()

    if (hashesToCheck.length > 0) {
      const containerIds = [...new Set(rows.map(r => r.container_id).filter(Boolean))]
      for (const cid of containerIds) {
        const containerHashes = rows
          .filter(r => r.container_id === cid && r.external_hash)
          .map(r => r.external_hash as string)
        if (containerHashes.length === 0) continue
        for (let i = 0; i < containerHashes.length; i += 500) {
          const chunk = containerHashes.slice(i, i + 500)
          const { data } = await sb
            .from('transactions')
            .select('external_hash')
            .eq('container_id', cid)
            .in('external_hash', chunk)
          if (data) {
            data.forEach((r: { external_hash: string }) => existingHashSet.add(r.external_hash))
          }
        }
      }
    }

    // Filter out duplicates
    const dedupedRows = rows.filter(r => {
      if (r.external_hash && existingHashSet.has(r.external_hash)) return false
      return true
    })
    const skippedDuplicates = rows.length - dedupedRows.length

    // Insert in chunks to avoid timeouts and payload limits
    const CHUNK_SIZE = 50
    let insertedCount = 0
    const errors: string[] = []

    for (let i = 0; i < dedupedRows.length; i += CHUNK_SIZE) {
      const chunk = dedupedRows.slice(i, i + CHUNK_SIZE)
      const { error } = await sb
        .from('transactions')
        .insert(chunk)
      if (error) {
        errors.push(`Chunk ${Math.floor(i / CHUNK_SIZE) + 1}: ${error.message}`)
      } else {
        insertedCount += chunk.length
      }
    }

    if (errors.length > 0 && insertedCount === 0 && dedupedRows.length > 0) {
      return res.status(500).json({
        error: 'Import failed',
        message: errors.join('; '),
        data: { inserted: 0, failed: dedupedRows.length, skippedDuplicates, errors },
      })
    }

    return created(res, {
      inserted: insertedCount,
      failed: dedupedRows.length - insertedCount,
      skippedDuplicates,
      total: rows.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  }

  // POST transfer — create a linked transfer pair
  // Detect via query ?action=transfer OR body _action:'transfer'
  const bodyAction = (req.body as Record<string, unknown>)?._action

  // ── SPLIT ──────────────────────────────────────────────────────
  if (method === 'POST' && bodyAction === 'split') {
    const b = req.body as Record<string, unknown>
    const parentId = b.parentId as string
    const children = b.children as Array<{
      description?: string
      amount: string
      tagIds?: string[]
      beneficiarySubjectId?: string | null
      notes?: string | null
    }>

    if (!parentId || !children?.length) return badRequest(res, 'parentId e children sono obbligatori')

    const { data: parent, error: parentErr } = await sb
      .from('transactions').select('*').eq('id', parentId).single()
    if (parentErr || !parent) return notFound(res, 'Transazione non trovata')

    const p = parent as Record<string, unknown>
    const parentAmt = Math.abs(parseFloat(p.amount as string))
    const childrenSum = children.reduce((s, c) => s + Math.abs(parseFloat(c.amount)), 0)
    if (Math.abs(parentAmt - childrenSum) > 0.01) {
      return badRequest(res, `La somma delle imputazioni (${childrenSum.toFixed(2)}) non corrisponde all'importo (${parentAmt.toFixed(2)})`)
    }

    await sb.from('transactions')
      .update({ status: 'split', updated_at: new Date().toISOString() })
      .eq('id', parentId)

    const isOut = parseFloat(p.amount as string) < 0
    const createdChildren = []
    for (const child of children) {
      const childAmt = isOut ? -Math.abs(parseFloat(child.amount)) : Math.abs(parseFloat(child.amount))
      const { data: created, error: childErr } = await sb.from('transactions').insert({
        date: p.date,
        description: child.description || p.description,
        amount: childAmt.toFixed(4),
        currency: p.currency,
        container_id: p.container_id,
        type: p.type,
        status: 'completed',
        source: 'manual',
        split_parent_id: parentId,
        beneficiary_subject_id: child.beneficiarySubjectId ?? null,
        notes: child.notes ?? null,
      }).select().single()
      if (childErr || !created) continue
      createdChildren.push(created)
      if (child.tagIds?.length) {
        await sb.from('transaction_tags').insert(
          child.tagIds.map((tagId: string) => ({ transaction_id: (created as Record<string,unknown>).id, tag_id: tagId }))
        )
      }
    }
    return ok(res, { parent: { ...p, status: 'split' }, children: createdChildren })
  }

  // ── UNSPLIT ────────────────────────────────────────────────────
  if (method === 'POST' && bodyAction === 'unsplit') {
    const b = req.body as Record<string, unknown>
    const parentId = b.parentId as string
    if (!parentId) return badRequest(res, 'parentId e obbligatorio')
    await sb.from('transactions').delete().eq('split_parent_id', parentId)
    await sb.from('transactions')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', parentId)
    return ok(res, { unsplit: true })
  }

  if (method === 'POST' && (actionParam === 'transfer' || bodyAction === 'transfer')) {
    const b = req.body || {}
    if (!b.date || !b.amount || !b.fromContainerId || !b.toContainerId) {
      return badRequest(res, 'date, amount, fromContainerId e toContainerId sono obbligatori')
    }

    const absAmount = Math.abs(parseFloat(b.amount)).toFixed(4)

    // 1. Create transfer_out (negative amount, source container)
    const { data: outTx, error: outErr } = await sb
      .from('transactions')
      .insert({
        date: b.date,
        description: b.description ?? null,
        notes: b.notes ?? null,
        amount: `-${absAmount}`,
        currency: b.currency ?? 'EUR',
        container_id: b.fromContainerId,
        type: 'transfer_out',
        status: b.status ?? 'completed',
        source: b.source ?? 'manual',
      })
      .select()
      .single()
    if (outErr) throw outErr

    // 2. Create transfer_in (positive amount, destination container)
    const { data: inTx, error: inErr } = await sb
      .from('transactions')
      .insert({
        date: b.date,
        description: b.description ?? null,
        notes: b.notes ?? null,
        amount: absAmount,
        currency: b.currency ?? 'EUR',
        container_id: b.toContainerId,
        type: 'transfer_in',
        status: b.status ?? 'completed',
        source: b.source ?? 'manual',
      })
      .select()
      .single()
    if (inErr) throw inErr

    // 3. Cross-link via transfer_linked_id
    await sb.from('transactions').update({ transfer_linked_id: inTx.id }).eq('id', outTx.id)
    await sb.from('transactions').update({ transfer_linked_id: outTx.id }).eq('id', inTx.id)

    return created(res, {
      transferOut: { ...outTx, transfer_linked_id: inTx.id },
      transferIn: { ...inTx, transfer_linked_id: outTx.id },
    })
  }

  // POST update-transfer — update both sides of a transfer pair
  // Uses POST instead of PUT to avoid Vercel routing issues with multi-segment paths
  if (method === 'POST' && bodyAction === 'update-transfer') {
    const b = req.body || {}
    const txId = b.id as string
    if (!txId || !b.fromContainerId || !b.toContainerId) {
      return badRequest(res, 'id, fromContainerId e toContainerId sono obbligatori')
    }

    const now = new Date().toISOString()
    const absAmount = b.amount ? Math.abs(parseFloat(b.amount)).toFixed(4) : undefined

    // Fetch the existing transaction to find its linked pair
    const { data: existingTx, error: fetchErr } = await sb
      .from('transactions')
      .select('id, type, transfer_linked_id')
      .eq('id', txId)
      .single()
    if (fetchErr || !existingTx) return notFound(res, 'Transazione non trovata')

    // Determine which side is transfer_out and which is transfer_in
    let outId: string | null = null
    let inId: string | null = null
    if (existingTx.type === 'transfer_out') {
      outId = txId
      inId = existingTx.transfer_linked_id
    } else if (existingTx.type === 'transfer_in') {
      inId = txId
      outId = existingTx.transfer_linked_id
    } else {
      // Converting a non-transfer to transfer: this becomes transfer_out
      outId = txId
    }

    // Build common fields
    const commonFields: Record<string, unknown> = { updated_at: now }
    if (b.date !== undefined) commonFields.date = b.date
    if (b.description !== undefined) commonFields.description = b.description
    if (b.currency !== undefined) commonFields.currency = b.currency
    if (b.status !== undefined) commonFields.status = b.status
    if (b.notes !== undefined) commonFields.notes = b.notes

    // Update transfer_out side
    if (outId) {
      const outUpdate = {
        ...commonFields,
        container_id: b.fromContainerId,
        type: 'transfer_out',
        ...(absAmount ? { amount: `-${absAmount}` } : {}),
      }
      const { error } = await sb.from('transactions').update(outUpdate).eq('id', outId)
      if (error) throw error
    }

    // Update or create transfer_in side
    if (inId) {
      const inUpdate = {
        ...commonFields,
        container_id: b.toContainerId,
        type: 'transfer_in',
        ...(absAmount ? { amount: absAmount } : {}),
      }
      const { error } = await sb.from('transactions').update(inUpdate).eq('id', inId)
      if (error) throw error
    } else {
      // No linked transaction exists — create the transfer_in side
      const inInsert: Record<string, unknown> = {
        date: b.date ?? null,
        description: b.description ?? null,
        notes: b.notes ?? null,
        amount: absAmount ?? '0',
        currency: b.currency ?? 'EUR',
        container_id: b.toContainerId,
        type: 'transfer_in',
        status: b.status ?? 'completed',
        source: 'manual',
        transfer_linked_id: outId,
      }
      // Fill date from the existing out-side if not provided
      if (!inInsert.date && outId) {
        const { data: outData } = await sb.from('transactions').select('date').eq('id', outId).single()
        inInsert.date = outData?.date ?? new Date().toISOString().slice(0, 10)
      }
      const { data: newIn, error } = await sb.from('transactions').insert(inInsert).select().single()
      if (error) throw error
      // Link the out side to the new in side
      await sb.from('transactions').update({ transfer_linked_id: newIn.id }).eq('id', outId!)
    }

    return ok(res, { updated: true })
  }

  // POST get-by-id — fetch a single transaction via POST to avoid multi-segment path issues
  if (method === 'POST' && bodyAction === 'get') {
    const txId = (req.body as Record<string, unknown>)?.id as string
    if (!txId) return badRequest(res, 'id è obbligatorio')

    const { data, error } = await sb
      .from('transactions')
      .select(
        '*, containers(name, color), counterparties(name), beneficiarySubject:subjects!transactions_beneficiary_subject_id_fkey(name)',
      )
      .eq('id', txId)
      .single()
    if (error || !data) return notFound(res, 'Transazione non trovata')

    const { data: tagRows } = await sb
      .from('transaction_tags')
      .select('tags(*)')
      .eq('transaction_id', txId)
    const tags = (tagRows || []).map((r: Record<string, unknown>) => r.tags)

    const row = { ...data } as Record<string, unknown>
    const containers = row.containers as { name?: string; color?: string } | null
    const counterparties = row.counterparties as { name?: string } | null
    const beneficiarySubject = row.beneficiarySubject as { name?: string } | null
    row.container_name = containers?.name ?? null
    row.container_color = containers?.color ?? null
    row.counterparty_name = counterparties?.name ?? null
    row.beneficiary_name = beneficiarySubject?.name ?? null
    delete row.containers
    delete row.counterparties
    delete row.beneficiarySubject

    return ok(res, { ...row, tags })
  }

  // POST update — update a transaction via POST to avoid multi-segment path issues
  if (method === 'POST' && bodyAction === 'update') {
    const b = req.body || {}
    const txId = b.id as string
    if (!txId) return badRequest(res, 'id è obbligatorio')

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (b.date !== undefined) update.date = b.date
    if (b.valueDate !== undefined) update.value_date = b.valueDate
    if (b.description !== undefined) update.description = b.description
    if (b.notes !== undefined) update.notes = b.notes
    if (b.amount !== undefined) update.amount = b.amount
    if (b.currency !== undefined) update.currency = b.currency
    if (b.amountEur !== undefined) update.amount_eur = b.amountEur
    if (b.exchangeRate !== undefined) update.exchange_rate = b.exchangeRate
    if (b.containerId !== undefined) update.container_id = b.containerId
    if (b.counterpartyId !== undefined) update.counterparty_id = b.counterpartyId
    if (b.type !== undefined) update.type = b.type
    if (b.transferLinkedId !== undefined) update.transfer_linked_id = b.transferLinkedId
    if (b.status !== undefined) update.status = b.status
    if (b.beneficiarySubjectId !== undefined) update.beneficiary_subject_id = b.beneficiarySubjectId || null

    const { data, error } = await sb
      .from('transactions')
      .update(update)
      .eq('id', txId)
      .select()
      .single()
    if (error || !data) return notFound(res, 'Transazione non trovata')

    const tagIds = b.tagIds as string[] | undefined
    if (tagIds !== undefined) {
      await sb.from('transaction_tags').delete().eq('transaction_id', txId)
      if (tagIds.length > 0) {
        await sb.from('transaction_tags').insert(
          tagIds.map((tagId: string) => ({ transaction_id: txId, tag_id: tagId })),
        )
      }
    }

    return ok(res, data)
  }

  // POST delete — delete a transaction via POST to avoid multi-segment path issues
  if (method === 'POST' && bodyAction === 'delete') {
    const txId = (req.body as Record<string, unknown>)?.id as string
    if (!txId) return badRequest(res, 'id è obbligatorio')

    // If this is part of a transfer pair, delete the linked side too
    const { data: txToDelete } = await sb
      .from('transactions')
      .select('transfer_linked_id')
      .eq('id', txId)
      .single()
    if (txToDelete?.transfer_linked_id) {
      await sb.from('transactions').delete().eq('id', txToDelete.transfer_linked_id)
    }

    const { data, error } = await sb.from('transactions').delete().eq('id', txId).select('id').single()
    if (error || !data) return notFound(res, 'Transazione non trovata')
    return ok(res, { deleted: true, id: txId, linkedDeleted: !!txToDelete?.transfer_linked_id })
  }

  if (method === 'POST') {
    const b = req.body || {}
    if (!b.date || !b.amount || !b.containerId || !b.type) {
      return badRequest(res, 'date, amount, containerId e type sono obbligatori')
    }

    const { data, error } = await sb
      .from('transactions')
      .insert({
        date: b.date,
        value_date: b.valueDate ?? null,
        description: b.description ?? null,
        notes: b.notes ?? null,
        amount: b.amount,
        currency: b.currency ?? 'EUR',
        amount_eur: b.amountEur ?? null,
        exchange_rate: b.exchangeRate ?? null,
        container_id: b.containerId,
        counterparty_id: b.counterpartyId ?? null,
        type: b.type,
        transfer_linked_id: b.transferLinkedId ?? null,
        status: b.status ?? 'completed',
        source: b.source ?? 'manual',
        beneficiary_subject_id: b.beneficiarySubjectId ?? null,
        installment_plan_id: b.installmentPlanId ?? null,
        installment_number: b.installmentNumber ?? null,
        external_id: b.externalId ?? null,
        external_hash: b.externalHash ?? null,
      })
      .select()
      .single()
    if (error) throw error

    // Handle tags
    const tagIds = b.tagIds as string[] | undefined
    if (tagIds && tagIds.length > 0 && data) {
      await sb.from('transaction_tags').insert(
        tagIds.map((tagId: string) => ({ transaction_id: data.id, tag_id: tagId })),
      )
    }

    return created(res, data)
  }

  // PUT transfer — update both sides of a transfer pair
  // Detect via query ?action=transfer OR body _action:'transfer'
  const putBodyAction = (req.body as Record<string, unknown>)?._action
  if ((method === 'PUT' || method === 'PATCH') && id && (actionParam === 'transfer' || putBodyAction === 'transfer')) {
    const b = req.body || {}
    if (!b.fromContainerId || !b.toContainerId) {
      return badRequest(res, 'fromContainerId e toContainerId sono obbligatori')
    }

    const now = new Date().toISOString()
    const absAmount = b.amount ? Math.abs(parseFloat(b.amount)).toFixed(4) : undefined

    // Fetch the existing transaction to find its linked pair
    const { data: existingTx, error: fetchErr } = await sb
      .from('transactions')
      .select('id, type, transfer_linked_id')
      .eq('id', id)
      .single()
    if (fetchErr || !existingTx) return notFound(res, 'Transazione non trovata')

    // Determine which side is transfer_out and which is transfer_in
    let outId: string | null = null
    let inId: string | null = null
    if (existingTx.type === 'transfer_out') {
      outId = id
      inId = existingTx.transfer_linked_id
    } else if (existingTx.type === 'transfer_in') {
      inId = id
      outId = existingTx.transfer_linked_id
    } else {
      // Converting a non-transfer to transfer: this becomes transfer_out
      outId = id
    }

    // Build common fields
    const commonFields: Record<string, unknown> = { updated_at: now }
    if (b.date !== undefined) commonFields.date = b.date
    if (b.description !== undefined) commonFields.description = b.description
    if (b.currency !== undefined) commonFields.currency = b.currency
    if (b.status !== undefined) commonFields.status = b.status
    if (b.notes !== undefined) commonFields.notes = b.notes

    // Update transfer_out side
    if (outId) {
      const outUpdate = {
        ...commonFields,
        container_id: b.fromContainerId,
        type: 'transfer_out',
        ...(absAmount ? { amount: `-${absAmount}` } : {}),
      }
      const { error } = await sb.from('transactions').update(outUpdate).eq('id', outId)
      if (error) throw error
    }

    // Update or create transfer_in side
    if (inId) {
      const inUpdate = {
        ...commonFields,
        container_id: b.toContainerId,
        type: 'transfer_in',
        ...(absAmount ? { amount: absAmount } : {}),
      }
      const { error } = await sb.from('transactions').update(inUpdate).eq('id', inId)
      if (error) throw error
    } else {
      // No linked transaction exists — create the transfer_in side
      const inInsert: Record<string, unknown> = {
        date: b.date ?? null,
        description: b.description ?? null,
        notes: b.notes ?? null,
        amount: absAmount ?? '0',
        currency: b.currency ?? 'EUR',
        container_id: b.toContainerId,
        type: 'transfer_in',
        status: b.status ?? 'completed',
        source: 'manual',
        transfer_linked_id: outId,
      }
      // Fill date from the existing out-side if not provided
      if (!inInsert.date && outId) {
        const { data: outData } = await sb.from('transactions').select('date').eq('id', outId).single()
        inInsert.date = outData?.date ?? new Date().toISOString().slice(0, 10)
      }
      const { data: newIn, error } = await sb.from('transactions').insert(inInsert).select().single()
      if (error) throw error
      // Link the out side to the new in side
      await sb.from('transactions').update({ transfer_linked_id: newIn.id }).eq('id', outId!)
    }

    // If we converted a non-transfer, create the out side link
    if (!outId && inId) {
      const outInsert: Record<string, unknown> = {
        date: b.date ?? new Date().toISOString().slice(0, 10),
        description: b.description ?? null,
        notes: b.notes ?? null,
        amount: absAmount ? `-${absAmount}` : '0',
        currency: b.currency ?? 'EUR',
        container_id: b.fromContainerId,
        type: 'transfer_out',
        status: b.status ?? 'completed',
        source: 'manual',
        transfer_linked_id: inId,
      }
      const { data: newOut, error } = await sb.from('transactions').insert(outInsert).select().single()
      if (error) throw error
      await sb.from('transactions').update({ transfer_linked_id: newOut.id }).eq('id', inId)
    }

    return ok(res, { updated: true })
  }

  if ((method === 'PUT' || method === 'PATCH') && id) {
    const b = req.body || {}
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (b.date !== undefined) update.date = b.date
    if (b.valueDate !== undefined) update.value_date = b.valueDate
    if (b.description !== undefined) update.description = b.description
    if (b.notes !== undefined) update.notes = b.notes
    if (b.amount !== undefined) update.amount = b.amount
    if (b.currency !== undefined) update.currency = b.currency
    if (b.amountEur !== undefined) update.amount_eur = b.amountEur
    if (b.exchangeRate !== undefined) update.exchange_rate = b.exchangeRate
    if (b.containerId !== undefined) update.container_id = b.containerId
    if (b.counterpartyId !== undefined) update.counterparty_id = b.counterpartyId
    if (b.type !== undefined) update.type = b.type
    if (b.transferLinkedId !== undefined) update.transfer_linked_id = b.transferLinkedId
    if (b.status !== undefined) update.status = b.status
    if (b.sharedWithSubjectId !== undefined) update.shared_with_subject_id = b.sharedWithSubjectId
    if (b.sharePercentage !== undefined) update.share_percentage = b.sharePercentage

    const { data, error } = await sb
      .from('transactions')
      .update(update)
      .eq('id', id)
      .select()
      .single()
    if (error || !data) return notFound(res, 'Transazione non trovata')

    // Update tags if provided
    const tagIds = b.tagIds as string[] | undefined
    if (tagIds !== undefined) {
      await sb.from('transaction_tags').delete().eq('transaction_id', id)
      if (tagIds.length > 0) {
        await sb.from('transaction_tags').insert(
          tagIds.map((tagId: string) => ({ transaction_id: id, tag_id: tagId })),
        )
      }
    }

    return ok(res, data)
  }

  if (method === 'DELETE' && id) {
    // If this is part of a transfer pair, delete the linked side too
    const { data: txToDelete } = await sb
      .from('transactions')
      .select('transfer_linked_id')
      .eq('id', id)
      .single()
    if (txToDelete?.transfer_linked_id) {
      await sb.from('transactions').delete().eq('id', txToDelete.transfer_linked_id)
    }

    const { data, error } = await sb.from('transactions').delete().eq('id', id).select('id').single()
    if (error || !data) return notFound(res, 'Transazione non trovata')
    return ok(res, { deleted: true, id, linkedDeleted: !!txToDelete?.transfer_linked_id })
  }

  return badRequest(res, 'Metodo non supportato')
}
