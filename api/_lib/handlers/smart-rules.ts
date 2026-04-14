import { createCrudHandler, composeHandler } from '../crud-factory.js'
import { getSupabase, ok } from '../supabase.js'

const SELECT_LIST =
  '*, tags!smart_rules_assign_tag_id_tags_id_fk(id, name, color, type), counterparties(name), containers(name)'

/**
 * Appiattisce i join: tags -> assign_tag, counterparties.name -> counterparty_name,
 * containers.name -> container_name.
 */
function flattenJoins(row: Record<string, unknown>): Record<string, unknown> {
  const out = { ...row }
  const tag = out.tags as Record<string, unknown> | null
  const cp = out.counterparties as { name?: string } | null
  const ct = out.containers as { name?: string } | null
  out.assign_tag = tag ?? null
  out.counterparty_name = cp?.name ?? null
  out.container_name = ct?.name ?? null
  delete out.tags
  delete out.counterparties
  delete out.containers
  return out
}

const baseHandler = createCrudHandler({
  table: 'smart_rules',
  notFoundMessage: 'Regola non trovata',
  orderBy: [
    { column: 'priority', ascending: false },
    { column: 'name' },
  ],
  selectList: SELECT_LIST,
  selectById: SELECT_LIST,
  transformRow: flattenJoins,
  fields: {
    name: { column: 'name' },
    descriptionPattern: { column: 'description_pattern' },
    counterpartyId: { column: 'counterparty_id' },
    containerId: { column: 'container_id' },
    amountMin: { column: 'amount_min' },
    amountMax: { column: 'amount_max' },
    transactionType: { column: 'transaction_type' },
    assignTagId: { column: 'assign_tag_id' },
    priority: { column: 'priority', default: 0 },
    isActive: { column: 'is_active', default: true },
    autoApply: { column: 'auto_apply', default: true },
  },
})

export const handleSmartRules = composeHandler(baseHandler, async (req, res) => {
  const body = (req.body || {}) as Record<string, unknown>
  const bodyAction = body._action as string | undefined
  if (req.method !== 'POST') return false

  // ============================================================
  // AUTO-TAG: applica regole attive alle transazioni senza tag
  // ============================================================
  if (bodyAction === 'auto-tag') {
    const sb = getSupabase()
    const dryRun = !!body.dryRun
    const limit = parseInt(body.limit as string) || 500

    // 1. Fetch regole attive ordinate per priority desc
    const { data: rules } = await sb
      .from('smart_rules')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false })

    if (!rules || rules.length === 0) {
      ok(res, { applied: 0, matches: [], message: 'Nessuna regola attiva' })
      return true
    }

    // 2. Fetch transazioni senza tag
    const { data: taggedIds } = await sb.from('transaction_tags').select('transaction_id')
    const taggedSet = new Set(
      (taggedIds || []).map((r: Record<string, unknown>) => r.transaction_id as string),
    )

    const { data: txs } = await sb
      .from('transactions')
      .select('id, description, counterparty_id, container_id, amount, type')
      .neq('status', 'cancelled')
      .order('date', { ascending: false })
      .limit(limit * 3)

    const untaggedTxs = (txs || [])
      .filter((t: Record<string, unknown>) => !taggedSet.has(t.id as string))
      .slice(0, limit)

    // 3. Match regole vs transazioni
    const matches: Array<{
      transactionId: string
      ruleId: string
      ruleName: string
      tagId: string
      description: string
    }> = []

    for (const tx of untaggedTxs) {
      for (const rule of rules as Array<Record<string, unknown>>) {
        let matched = true

        if (rule.description_pattern) {
          const pattern = (rule.description_pattern as string).toLowerCase()
          const desc = ((tx.description as string) || '').toLowerCase()
          if (!desc.includes(pattern)) {
            try {
              const regex = new RegExp(pattern, 'i')
              if (!regex.test(desc)) matched = false
            } catch {
              matched = false
            }
          }
        }
        if (matched && rule.counterparty_id && tx.counterparty_id !== rule.counterparty_id) {
          matched = false
        }
        if (matched && rule.container_id && tx.container_id !== rule.container_id) {
          matched = false
        }
        if (matched && rule.amount_min) {
          const txAmt = Math.abs(parseFloat(tx.amount as string))
          if (txAmt < parseFloat(rule.amount_min as string)) matched = false
        }
        if (matched && rule.amount_max) {
          const txAmt = Math.abs(parseFloat(tx.amount as string))
          if (txAmt > parseFloat(rule.amount_max as string)) matched = false
        }
        if (matched && rule.transaction_type && tx.type !== rule.transaction_type) {
          matched = false
        }

        if (matched) {
          matches.push({
            transactionId: tx.id as string,
            ruleId: rule.id as string,
            ruleName: rule.name as string,
            tagId: rule.assign_tag_id as string,
            description: (tx.description as string) || '(nessuna descrizione)',
          })
          break // Prima regola che matcha vince (priority piu' alta)
        }
      }
    }

    // 4. Applica i tag (se non dryRun)
    if (!dryRun && matches.length > 0) {
      const inserts = matches.map((m) => ({ transaction_id: m.transactionId, tag_id: m.tagId }))
      for (let i = 0; i < inserts.length; i += 100) {
        const chunk = inserts.slice(i, i + 100)
        await sb.from('transaction_tags').upsert(chunk, {
          onConflict: 'transaction_id,tag_id',
          ignoreDuplicates: true,
        })
      }
    }

    ok(res, {
      applied: dryRun ? 0 : matches.length,
      matches,
      dryRun,
      totalUntagged: untaggedTxs.length,
      totalRules: rules.length,
    })
    return true
  }

  // ============================================================
  // SUGGEST-RULES: analizza le transazioni taggate e suggerisce nuove regole
  // ============================================================
  if (bodyAction === 'suggest-rules') {
    const sb = getSupabase()
    const { data: taggedTxs } = await sb
      .from('transaction_tags')
      .select('transaction_id, tag_id, tags(id, name, color, type)')
      .limit(2000)

    if (!taggedTxs || taggedTxs.length === 0) {
      ok(res, { suggestions: [], message: 'Nessuna transazione taggata trovata per analisi' })
      return true
    }

    // Fetch delle transazioni stesse
    const txIds = [
      ...new Set((taggedTxs as Array<Record<string, unknown>>).map((r) => r.transaction_id as string)),
    ]
    const txMap = new Map<string, Record<string, unknown>>()
    for (let i = 0; i < txIds.length; i += 500) {
      const chunk = txIds.slice(i, i + 500)
      const { data: txs } = await sb
        .from('transactions')
        .select(
          'id, description, counterparty_id, container_id, amount, type, counterparties(name)',
        )
        .in('id', chunk)
      for (const tx of txs || []) {
        txMap.set(tx.id as string, tx as Record<string, unknown>)
      }
    }

    // Mappa: tagId -> array di transazioni
    const tagTxMap = new Map<
      string,
      Array<{ tx: Record<string, unknown>; tagName: string; tagColor: string }>
    >()
    for (const row of taggedTxs as Array<Record<string, unknown>>) {
      const tagId = row.tag_id as string
      const tag = row.tags as Record<string, unknown> | null
      const tx = txMap.get(row.transaction_id as string)
      if (!tx || !tag) continue
      if (!tagTxMap.has(tagId)) tagTxMap.set(tagId, [])
      tagTxMap.get(tagId)!.push({
        tx,
        tagName: tag.name as string,
        tagColor: (tag.color as string) || '#6b7280',
      })
    }

    const suggestions: Array<{
      tagId: string
      tagName: string
      tagColor: string
      type: string
      pattern: string
      confidence: number
      exampleCount: number
      ruleName: string
    }> = []

    // Regole esistenti per evitare duplicati
    const { data: existingRules } = await sb
      .from('smart_rules')
      .select('description_pattern, counterparty_id, assign_tag_id')
    const existingRuleKeys = new Set(
      (existingRules || []).map(
        (r: Record<string, unknown>) =>
          `${r.description_pattern || ''}_${r.counterparty_id || ''}_${r.assign_tag_id}`,
      ),
    )

    for (const [tagId, entries] of tagTxMap) {
      if (entries.length < 2) continue
      const { tagName, tagColor } = entries[0]

      // Pattern 1: stessa controparte
      const counterpartyCounts = new Map<string, { count: number; name: string }>()
      for (const { tx } of entries) {
        const cpId = tx.counterparty_id as string | null
        if (!cpId) continue
        const cpObj = tx.counterparties as { name?: string } | null
        if (!counterpartyCounts.has(cpId)) {
          counterpartyCounts.set(cpId, { count: 0, name: cpObj?.name || 'Sconosciuto' })
        }
        counterpartyCounts.get(cpId)!.count++
      }
      for (const [cpId, { count, name }] of counterpartyCounts) {
        if (count < 2) continue
        const ruleKey = `_${cpId}_${tagId}`
        if (existingRuleKeys.has(ruleKey)) continue
        suggestions.push({
          tagId,
          tagName,
          tagColor,
          type: 'counterparty',
          pattern: cpId,
          confidence: Math.min(95, 50 + count * 10),
          exampleCount: count,
          ruleName: `${name} -> ${tagName}`,
        })
      }

      // Pattern 2: keyword comuni nella descrizione
      const wordCounts = new Map<string, number>()
      const stopWords = new Set([
        'di','del','della','il','la','le','lo','un','una','per','con','da','in','su','a','e','o',
        'che','non','and','the','for','from','to','-','/','nr','n','pagamento','payment',
      ])
      for (const { tx } of entries) {
        const desc = ((tx.description as string) || '').toLowerCase()
        const words = desc
          .split(/[\s,;.:()\-/]+/)
          .filter((w) => w.length > 3 && !stopWords.has(w))
        const uniqueWords = new Set(words)
        for (const word of uniqueWords) {
          wordCounts.set(word, (wordCounts.get(word) || 0) + 1)
        }
      }
      for (const [word, count] of wordCounts) {
        if (count < 3 || count / entries.length < 0.5) continue
        const ruleKey = `${word}__${tagId}`
        if (existingRuleKeys.has(ruleKey)) continue
        suggestions.push({
          tagId,
          tagName,
          tagColor,
          type: 'keyword',
          pattern: word,
          confidence: Math.min(90, 40 + count * 8),
          exampleCount: count,
          ruleName: `"${word}" -> ${tagName}`,
        })
      }
    }

    suggestions.sort((a, b) => b.confidence - a.confidence)
    ok(res, { suggestions: suggestions.slice(0, 20) })
    return true
  }

  return false
})

