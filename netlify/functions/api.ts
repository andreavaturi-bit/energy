import type { Handler, HandlerEvent } from '@netlify/functions'
import {
  getDb,
  parseBody,
  extractId,
  json,
  ok,
  created,
  badRequest,
  notFound,
  serverError,
} from './lib/db'

// ── CORS preflight ─────────────────────────────────────────
function cors() {
  return {
    statusCode: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    },
    body: '',
  }
}

// ── Route helpers ──────────────────────────────────────────
type RouteResult = ReturnType<Handler>

// ============================================================
// SUBJECTS
// ============================================================

async function handleSubjects(event: HandlerEvent, id: string | null): RouteResult {
  const sql = getDb()
  const method = event.httpMethod

  if (method === 'GET' && !id) {
    const rows = await sql`SELECT * FROM subjects ORDER BY name`
    return ok(rows)
  }

  if (method === 'GET' && id) {
    const rows = await sql`SELECT * FROM subjects WHERE id = ${id}`
    if (rows.length === 0) return notFound('Soggetto non trovato')
    return ok(rows[0])
  }

  if (method === 'POST') {
    const b = parseBody<Record<string, unknown>>(event.body)
    if (!b.name || !b.type) return badRequest('name e type sono obbligatori')
    const rows = await sql`
      INSERT INTO subjects (type, name, legal_form, tax_id, country, role, parent_subject_id, notes, is_active)
      VALUES (${b.type}, ${b.name}, ${b.legalForm ?? null}, ${b.taxId ?? null},
              ${b.country ?? 'IT'}, ${b.role ?? null}, ${b.parentSubjectId ?? null},
              ${b.notes ?? null}, ${b.isActive ?? true})
      RETURNING *
    `
    return created(rows[0])
  }

  if ((method === 'PUT' || method === 'PATCH') && id) {
    const b = parseBody<Record<string, unknown>>(event.body)
    const rows = await sql`
      UPDATE subjects SET
        type = COALESCE(${b.type ?? null}, type),
        name = COALESCE(${b.name ?? null}, name),
        legal_form = COALESCE(${b.legalForm ?? null}, legal_form),
        tax_id = COALESCE(${b.taxId ?? null}, tax_id),
        country = COALESCE(${b.country ?? null}, country),
        role = COALESCE(${b.role ?? null}, role),
        parent_subject_id = ${b.parentSubjectId ?? null},
        notes = ${b.notes ?? null},
        is_active = COALESCE(${b.isActive ?? null}, is_active),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `
    if (rows.length === 0) return notFound('Soggetto non trovato')
    return ok(rows[0])
  }

  if (method === 'DELETE' && id) {
    const rows = await sql`DELETE FROM subjects WHERE id = ${id} RETURNING id`
    if (rows.length === 0) return notFound('Soggetto non trovato')
    return ok({ deleted: true, id })
  }

  return badRequest('Metodo non supportato')
}

// ============================================================
// CONTAINERS
// ============================================================

async function handleContainers(event: HandlerEvent, id: string | null): RouteResult {
  const sql = getDb()
  const method = event.httpMethod

  if (method === 'GET' && !id) {
    const rows = await sql`
      SELECT c.*, s.name as subject_name,
        (c.initial_balance + COALESCE(
          (SELECT SUM(t.amount) FROM transactions t
           WHERE t.container_id = c.id AND t.status != 'cancelled'), 0
        )) as current_balance
      FROM containers c
      LEFT JOIN subjects s ON s.id = c.subject_id
      ORDER BY c.sort_order, c.name
    `
    return ok(rows)
  }

  if (method === 'GET' && id) {
    const rows = await sql`
      SELECT c.*, s.name as subject_name,
        (c.initial_balance + COALESCE(
          (SELECT SUM(t.amount) FROM transactions t
           WHERE t.container_id = c.id AND t.status != 'cancelled'), 0
        )) as current_balance
      FROM containers c
      LEFT JOIN subjects s ON s.id = c.subject_id
      WHERE c.id = ${id}
    `
    if (rows.length === 0) return notFound('Contenitore non trovato')
    return ok(rows[0])
  }

  if (method === 'POST') {
    const b = parseBody<Record<string, unknown>>(event.body)
    if (!b.name || !b.type || !b.subjectId) return badRequest('name, type e subjectId sono obbligatori')
    const rows = await sql`
      INSERT INTO containers (subject_id, name, type, provider, currency, is_multi_currency,
        initial_balance, billing_day, linked_container_id, goal_amount, goal_description,
        icon, color, sort_order, is_pinned, is_active, notes)
      VALUES (${b.subjectId}, ${b.name}, ${b.type}, ${b.provider ?? null},
              ${b.currency ?? 'EUR'}, ${b.isMultiCurrency ?? false},
              ${b.initialBalance ?? '0'}, ${b.billingDay ?? null}, ${b.linkedContainerId ?? null},
              ${b.goalAmount ?? null}, ${b.goalDescription ?? null},
              ${b.icon ?? null}, ${b.color ?? null}, ${b.sortOrder ?? 0},
              ${b.isPinned ?? false}, ${b.isActive ?? true}, ${b.notes ?? null})
      RETURNING *
    `
    return created(rows[0])
  }

  if ((method === 'PUT' || method === 'PATCH') && id) {
    const b = parseBody<Record<string, unknown>>(event.body)
    const rows = await sql`
      UPDATE containers SET
        subject_id = COALESCE(${b.subjectId ?? null}::uuid, subject_id),
        name = COALESCE(${b.name ?? null}, name),
        type = COALESCE(${b.type ?? null}, type),
        provider = COALESCE(${b.provider ?? null}, provider),
        currency = COALESCE(${b.currency ?? null}, currency),
        is_multi_currency = COALESCE(${b.isMultiCurrency ?? null}::boolean, is_multi_currency),
        initial_balance = COALESCE(${b.initialBalance ?? null}::numeric, initial_balance),
        billing_day = COALESCE(${b.billingDay ?? null}::integer, billing_day),
        linked_container_id = COALESCE(${b.linkedContainerId ?? null}::uuid, linked_container_id),
        icon = COALESCE(${b.icon ?? null}, icon),
        color = COALESCE(${b.color ?? null}, color),
        sort_order = COALESCE(${b.sortOrder ?? null}::integer, sort_order),
        is_pinned = COALESCE(${b.isPinned ?? null}::boolean, is_pinned),
        is_active = COALESCE(${b.isActive ?? null}::boolean, is_active),
        notes = COALESCE(${b.notes ?? null}, notes),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `
    if (rows.length === 0) return notFound('Contenitore non trovato')
    return ok(rows[0])
  }

  if (method === 'DELETE' && id) {
    // Check for linked transactions first
    const txCount = await sql`SELECT COUNT(*) as cnt FROM transactions WHERE container_id = ${id}`
    const cnt = parseInt(txCount[0]?.cnt ?? '0')
    if (cnt > 0) {
      return badRequest(`Impossibile eliminare: ci sono ${cnt} transazioni collegate a questo contenitore.`)
    }
    const rows = await sql`DELETE FROM containers WHERE id = ${id} RETURNING id`
    if (rows.length === 0) return notFound('Contenitore non trovato')
    return ok({ deleted: true, id })
  }

  return badRequest('Metodo non supportato')
}

// ============================================================
// COUNTERPARTIES
// ============================================================

async function handleCounterparties(event: HandlerEvent, id: string | null): RouteResult {
  const sql = getDb()
  const method = event.httpMethod

  if (method === 'GET' && !id) {
    const rows = await sql`SELECT * FROM counterparties ORDER BY name`
    return ok(rows)
  }

  if (method === 'GET' && id) {
    const rows = await sql`SELECT * FROM counterparties WHERE id = ${id}`
    if (rows.length === 0) return notFound('Controparte non trovata')
    return ok(rows[0])
  }

  if (method === 'POST') {
    const b = parseBody<Record<string, unknown>>(event.body)
    if (!b.name) return badRequest('name è obbligatorio')
    const rows = await sql`
      INSERT INTO counterparties (name, type, default_category, notes, is_active)
      VALUES (${b.name}, ${b.type ?? null}, ${b.defaultCategory ?? null},
              ${b.notes ?? null}, ${b.isActive ?? true})
      RETURNING *
    `
    return created(rows[0])
  }

  if ((method === 'PUT' || method === 'PATCH') && id) {
    const b = parseBody<Record<string, unknown>>(event.body)
    const rows = await sql`
      UPDATE counterparties SET
        name = COALESCE(${b.name ?? null}, name),
        type = ${b.type ?? null},
        default_category = ${b.defaultCategory ?? null},
        notes = ${b.notes ?? null},
        is_active = COALESCE(${b.isActive ?? null}, is_active),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `
    if (rows.length === 0) return notFound('Controparte non trovata')
    return ok(rows[0])
  }

  if (method === 'DELETE' && id) {
    const rows = await sql`DELETE FROM counterparties WHERE id = ${id} RETURNING id`
    if (rows.length === 0) return notFound('Controparte non trovata')
    return ok({ deleted: true, id })
  }

  return badRequest('Metodo non supportato')
}

// ============================================================
// TAGS
// ============================================================

async function handleTags(event: HandlerEvent, id: string | null): RouteResult {
  const sql = getDb()
  const method = event.httpMethod

  if (method === 'GET' && !id) {
    const rows = await sql`SELECT * FROM tags ORDER BY type, name`
    return ok(rows)
  }

  if (method === 'GET' && id) {
    const rows = await sql`SELECT * FROM tags WHERE id = ${id}`
    if (rows.length === 0) return notFound('Tag non trovato')
    return ok(rows[0])
  }

  if (method === 'POST') {
    const b = parseBody<Record<string, unknown>>(event.body)
    if (!b.name || !b.type) return badRequest('name e type sono obbligatori')
    const rows = await sql`
      INSERT INTO tags (name, parent_id, type, color, icon, is_active)
      VALUES (${b.name}, ${b.parentId ?? null}, ${b.type},
              ${b.color ?? null}, ${b.icon ?? null}, ${b.isActive ?? true})
      RETURNING *
    `
    return created(rows[0])
  }

  if ((method === 'PUT' || method === 'PATCH') && id) {
    const b = parseBody<Record<string, unknown>>(event.body)
    const rows = await sql`
      UPDATE tags SET
        name = COALESCE(${b.name ?? null}, name),
        parent_id = ${b.parentId ?? null},
        type = COALESCE(${b.type ?? null}, type),
        color = ${b.color ?? null},
        icon = ${b.icon ?? null},
        is_active = COALESCE(${b.isActive ?? null}, is_active)
      WHERE id = ${id}
      RETURNING *
    `
    if (rows.length === 0) return notFound('Tag non trovato')
    return ok(rows[0])
  }

  if (method === 'DELETE' && id) {
    const rows = await sql`DELETE FROM tags WHERE id = ${id} RETURNING id`
    if (rows.length === 0) return notFound('Tag non trovato')
    return ok({ deleted: true, id })
  }

  return badRequest('Metodo non supportato')
}

// ============================================================
// TRANSACTIONS (the core)
// ============================================================

async function handleTransactions(event: HandlerEvent, id: string | null): RouteResult {
  const sql = getDb()
  const method = event.httpMethod

  if (method === 'GET' && !id) {
    // Support query params for filtering
    const params = event.queryStringParameters || {}
    const limit = Math.min(parseInt(params.limit || '200'), 1000)
    const offset = parseInt(params.offset || '0')

    // Build WHERE clauses dynamically
    let whereClause = 'WHERE 1=1'
    const values: unknown[] = []

    if (params.containerId) {
      values.push(params.containerId)
      whereClause += ` AND t.container_id = $${values.length}`
    }
    if (params.type) {
      values.push(params.type)
      whereClause += ` AND t.type = $${values.length}`
    }
    if (params.status) {
      values.push(params.status)
      whereClause += ` AND t.status = $${values.length}`
    }
    if (params.dateFrom) {
      values.push(params.dateFrom)
      whereClause += ` AND t.date >= $${values.length}`
    }
    if (params.dateTo) {
      values.push(params.dateTo)
      whereClause += ` AND t.date <= $${values.length}`
    }
    if (params.search) {
      values.push(`%${params.search}%`)
      whereClause += ` AND (t.description ILIKE $${values.length} OR t.notes ILIKE $${values.length})`
    }

    // Use simple parameterized query via neon tagged template
    // For dynamic WHERE, we use the sql function directly
    const rows = await sql`
      SELECT t.*,
        c.name as container_name, c.color as container_color, c.currency as container_currency,
        cp.name as counterparty_name,
        s.name as shared_with_name
      FROM transactions t
      LEFT JOIN containers c ON c.id = t.container_id
      LEFT JOIN counterparties cp ON cp.id = t.counterparty_id
      LEFT JOIN subjects s ON s.id = t.shared_with_subject_id
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    // Get total count for pagination
    const countResult = await sql`SELECT COUNT(*) as total FROM transactions`
    const total = countResult[0]?.total ?? 0

    return ok({ rows, total, limit, offset })
  }

  if (method === 'GET' && id) {
    const rows = await sql`
      SELECT t.*,
        c.name as container_name, c.color as container_color,
        cp.name as counterparty_name,
        s.name as shared_with_name
      FROM transactions t
      LEFT JOIN containers c ON c.id = t.container_id
      LEFT JOIN counterparties cp ON cp.id = t.counterparty_id
      LEFT JOIN subjects s ON s.id = t.shared_with_subject_id
      WHERE t.id = ${id}
    `
    if (rows.length === 0) return notFound('Transazione non trovata')

    // Also get tags
    const tags = await sql`
      SELECT t.* FROM tags t
      INNER JOIN transaction_tags tt ON tt.tag_id = t.id
      WHERE tt.transaction_id = ${id}
    `

    return ok({ ...rows[0], tags })
  }

  if (method === 'POST') {
    const b = parseBody<Record<string, unknown>>(event.body)
    if (!b.date || !b.amount || !b.containerId || !b.type) {
      return badRequest('date, amount, containerId e type sono obbligatori')
    }

    const rows = await sql`
      INSERT INTO transactions (date, value_date, description, notes, amount, currency,
        amount_eur, exchange_rate, container_id, counterparty_id, type, transfer_linked_id,
        status, source, shared_with_subject_id, share_percentage,
        installment_plan_id, installment_number, external_id)
      VALUES (${b.date}, ${b.valueDate ?? null}, ${b.description ?? null}, ${b.notes ?? null},
              ${b.amount}, ${b.currency ?? 'EUR'},
              ${b.amountEur ?? null}, ${b.exchangeRate ?? null},
              ${b.containerId}, ${b.counterpartyId ?? null},
              ${b.type}, ${b.transferLinkedId ?? null},
              ${b.status ?? 'completed'}, ${b.source ?? 'manual'},
              ${b.sharedWithSubjectId ?? null}, ${b.sharePercentage ?? null},
              ${b.installmentPlanId ?? null}, ${b.installmentNumber ?? null},
              ${b.externalId ?? null})
      RETURNING *
    `

    // Handle tags if provided
    const tagIds = b.tagIds as string[] | undefined
    if (tagIds && tagIds.length > 0 && rows[0]) {
      for (const tagId of tagIds) {
        await sql`INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (${rows[0].id}, ${tagId}) ON CONFLICT DO NOTHING`
      }
    }

    return created(rows[0])
  }

  if ((method === 'PUT' || method === 'PATCH') && id) {
    const b = parseBody<Record<string, unknown>>(event.body)

    const rows = await sql`
      UPDATE transactions SET
        date = COALESCE(${b.date ?? null}, date),
        value_date = ${b.valueDate ?? null},
        description = ${b.description ?? null},
        notes = ${b.notes ?? null},
        amount = COALESCE(${b.amount ?? null}::numeric, amount),
        currency = COALESCE(${b.currency ?? null}, currency),
        amount_eur = ${b.amountEur ?? null},
        exchange_rate = ${b.exchangeRate ?? null},
        container_id = COALESCE(${b.containerId ?? null}, container_id),
        counterparty_id = ${b.counterpartyId ?? null},
        type = COALESCE(${b.type ?? null}, type),
        transfer_linked_id = ${b.transferLinkedId ?? null},
        status = COALESCE(${b.status ?? null}, status),
        shared_with_subject_id = ${b.sharedWithSubjectId ?? null},
        share_percentage = ${b.sharePercentage ?? null},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `
    if (rows.length === 0) return notFound('Transazione non trovata')

    // Update tags if provided
    const tagIds = b.tagIds as string[] | undefined
    if (tagIds !== undefined) {
      await sql`DELETE FROM transaction_tags WHERE transaction_id = ${id}`
      for (const tagId of tagIds) {
        await sql`INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (${id}, ${tagId}) ON CONFLICT DO NOTHING`
      }
    }

    return ok(rows[0])
  }

  if (method === 'DELETE' && id) {
    // Tags are cascade-deleted
    const rows = await sql`DELETE FROM transactions WHERE id = ${id} RETURNING id`
    if (rows.length === 0) return notFound('Transazione non trovata')
    return ok({ deleted: true, id })
  }

  return badRequest('Metodo non supportato')
}

// ============================================================
// RECURRENCES
// ============================================================

async function handleRecurrences(event: HandlerEvent, id: string | null): RouteResult {
  const sql = getDb()
  const method = event.httpMethod

  if (method === 'GET' && !id) {
    const rows = await sql`
      SELECT r.*,
        c.name as container_name, c.color as container_color,
        cp.name as counterparty_name
      FROM recurrences r
      LEFT JOIN containers c ON c.id = r.container_id
      LEFT JOIN counterparties cp ON cp.id = r.counterparty_id
      ORDER BY r.is_active DESC, r.description
    `
    return ok(rows)
  }

  if (method === 'GET' && id) {
    const rows = await sql`
      SELECT r.*,
        c.name as container_name,
        cp.name as counterparty_name
      FROM recurrences r
      LEFT JOIN containers c ON c.id = r.container_id
      LEFT JOIN counterparties cp ON cp.id = r.counterparty_id
      WHERE r.id = ${id}
    `
    if (rows.length === 0) return notFound('Ricorrenza non trovata')
    return ok(rows[0])
  }

  if (method === 'POST') {
    const b = parseBody<Record<string, unknown>>(event.body)
    if (!b.description || !b.frequency || !b.type || !b.startDate) {
      return badRequest('description, frequency, type e startDate sono obbligatori')
    }
    const rows = await sql`
      INSERT INTO recurrences (description, frequency, interval_days, day_of_month, day_of_week,
        business_days_only, amount, amount_is_estimate, currency, container_id, counterparty_id,
        type, shared_with_subject_id, share_percentage, start_date, end_date,
        reminder_days_before, is_active)
      VALUES (${b.description}, ${b.frequency}, ${b.intervalDays ?? null},
              ${b.dayOfMonth ?? null}, ${b.dayOfWeek ?? null},
              ${b.businessDaysOnly ?? false}, ${b.amount ?? null},
              ${b.amountIsEstimate ?? false}, ${b.currency ?? 'EUR'},
              ${b.containerId ?? null}, ${b.counterpartyId ?? null},
              ${b.type}, ${b.sharedWithSubjectId ?? null}, ${b.sharePercentage ?? null},
              ${b.startDate}, ${b.endDate ?? null},
              ${b.reminderDaysBefore ?? null}, ${b.isActive ?? true})
      RETURNING *
    `
    return created(rows[0])
  }

  if ((method === 'PUT' || method === 'PATCH') && id) {
    const b = parseBody<Record<string, unknown>>(event.body)
    const rows = await sql`
      UPDATE recurrences SET
        description = COALESCE(${b.description ?? null}, description),
        frequency = COALESCE(${b.frequency ?? null}, frequency),
        interval_days = ${b.intervalDays ?? null},
        day_of_month = ${b.dayOfMonth ?? null},
        day_of_week = ${b.dayOfWeek ?? null},
        business_days_only = COALESCE(${b.businessDaysOnly ?? null}, business_days_only),
        amount = ${b.amount ?? null},
        amount_is_estimate = COALESCE(${b.amountIsEstimate ?? null}, amount_is_estimate),
        currency = COALESCE(${b.currency ?? null}, currency),
        container_id = ${b.containerId ?? null},
        counterparty_id = ${b.counterpartyId ?? null},
        type = COALESCE(${b.type ?? null}, type),
        shared_with_subject_id = ${b.sharedWithSubjectId ?? null},
        share_percentage = ${b.sharePercentage ?? null},
        start_date = COALESCE(${b.startDate ?? null}, start_date),
        end_date = ${b.endDate ?? null},
        reminder_days_before = ${b.reminderDaysBefore ?? null},
        is_active = COALESCE(${b.isActive ?? null}, is_active),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `
    if (rows.length === 0) return notFound('Ricorrenza non trovata')
    return ok(rows[0])
  }

  if (method === 'DELETE' && id) {
    const rows = await sql`DELETE FROM recurrences WHERE id = ${id} RETURNING id`
    if (rows.length === 0) return notFound('Ricorrenza non trovata')
    return ok({ deleted: true, id })
  }

  return badRequest('Metodo non supportato')
}

// ============================================================
// BUDGET (Periods + Allocations)
// ============================================================

async function handleBudget(event: HandlerEvent, path: string): RouteResult {
  const sql = getDb()
  const method = event.httpMethod

  // /budget/allocations/:id - CRUD for single allocation
  if (path.includes('/allocations/')) {
    const allocId = path.split('/allocations/')[1]?.split('/')[0]

    if (method === 'DELETE' && allocId) {
      const rows = await sql`DELETE FROM budget_allocations WHERE id = ${allocId} RETURNING id`
      if (rows.length === 0) return notFound('Allocazione non trovata')
      return ok({ deleted: true, id: allocId })
    }

    if ((method === 'PUT' || method === 'PATCH') && allocId) {
      const b = parseBody<Record<string, unknown>>(event.body)
      const rows = await sql`
        UPDATE budget_allocations SET
          tag_id = ${b.tagId ?? null},
          subject_id = ${b.subjectId ?? null},
          allocated_amount = COALESCE(${b.allocatedAmount ?? null}::numeric, allocated_amount),
          currency = COALESCE(${b.currency ?? null}, currency),
          notes = ${b.notes ?? null},
          updated_at = NOW()
        WHERE id = ${allocId}
        RETURNING *
      `
      if (rows.length === 0) return notFound('Allocazione non trovata')
      return ok(rows[0])
    }
  }

  // /budget/allocations - POST new allocation
  if (path.endsWith('/allocations') && method === 'POST') {
    const b = parseBody<Record<string, unknown>>(event.body)
    if (!b.periodId || !b.allocatedAmount) return badRequest('periodId e allocatedAmount sono obbligatori')
    const rows = await sql`
      INSERT INTO budget_allocations (period_id, tag_id, subject_id, allocated_amount, currency, notes)
      VALUES (${b.periodId}, ${b.tagId ?? null}, ${b.subjectId ?? null},
              ${b.allocatedAmount}, ${b.currency ?? 'EUR'}, ${b.notes ?? null})
      RETURNING *
    `
    return created(rows[0])
  }

  // /budget/:id - Single period
  const periodId = extractId(path, 'budget')

  if (method === 'GET' && !periodId) {
    // List all periods with their allocations
    const periods = await sql`SELECT * FROM budget_periods ORDER BY start_date DESC`
    const allocations = await sql`
      SELECT ba.*, t.name as tag_name, t.color as tag_color
      FROM budget_allocations ba
      LEFT JOIN tags t ON t.id = ba.tag_id
      ORDER BY ba.created_at
    `
    // Group allocations by period
    const result = periods.map((p: Record<string, unknown>) => ({
      ...p,
      allocations: allocations.filter((a: Record<string, unknown>) => a.period_id === p.id),
    }))
    return ok(result)
  }

  if (method === 'GET' && periodId) {
    const periods = await sql`SELECT * FROM budget_periods WHERE id = ${periodId}`
    if (periods.length === 0) return notFound('Periodo non trovato')
    const allocations = await sql`
      SELECT ba.*, t.name as tag_name, t.color as tag_color
      FROM budget_allocations ba
      LEFT JOIN tags t ON t.id = ba.tag_id
      WHERE ba.period_id = ${periodId}
      ORDER BY ba.created_at
    `
    return ok({ ...periods[0], allocations })
  }

  if (method === 'POST' && !periodId) {
    const b = parseBody<Record<string, unknown>>(event.body)
    if (!b.name || !b.startDate || !b.endDate) return badRequest('name, startDate e endDate sono obbligatori')
    const rows = await sql`
      INSERT INTO budget_periods (name, start_date, end_date, is_active)
      VALUES (${b.name}, ${b.startDate}, ${b.endDate}, ${b.isActive ?? true})
      RETURNING *
    `
    return created(rows[0])
  }

  if ((method === 'PUT' || method === 'PATCH') && periodId) {
    const b = parseBody<Record<string, unknown>>(event.body)
    const rows = await sql`
      UPDATE budget_periods SET
        name = COALESCE(${b.name ?? null}, name),
        start_date = COALESCE(${b.startDate ?? null}, start_date),
        end_date = COALESCE(${b.endDate ?? null}, end_date),
        is_active = COALESCE(${b.isActive ?? null}, is_active)
      WHERE id = ${periodId}
      RETURNING *
    `
    if (rows.length === 0) return notFound('Periodo non trovato')
    return ok(rows[0])
  }

  if (method === 'DELETE' && periodId) {
    // Allocations are cascade-deleted
    const rows = await sql`DELETE FROM budget_periods WHERE id = ${periodId} RETURNING id`
    if (rows.length === 0) return notFound('Periodo non trovato')
    return ok({ deleted: true, id: periodId })
  }

  return badRequest('Metodo non supportato')
}

// ============================================================
// STATS - Dashboard aggregations
// ============================================================

async function handleStats(event: HandlerEvent): RouteResult {
  const sql = getDb()

  // Total balance by currency (initial_balance + transaction sums for active containers)
  const balances = await sql`
    SELECT c.currency,
      SUM(c.initial_balance + COALESCE(
        (SELECT SUM(t.amount) FROM transactions t
         WHERE t.container_id = c.id AND t.status != 'cancelled'), 0
      )) as total
    FROM containers c
    WHERE c.is_active = true
    GROUP BY c.currency
    ORDER BY c.currency
  `

  // Monthly income/expenses (current month)
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const nextMonth = now.getMonth() === 11
    ? `${now.getFullYear() + 1}-01-01`
    : `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, '0')}-01`

  const monthlyStats = await sql`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as monthly_income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN ABS(amount) ELSE 0 END), 0) as monthly_expenses,
      COUNT(*) as transaction_count
    FROM transactions
    WHERE date >= ${monthStart} AND date < ${nextMonth}
      AND status != 'cancelled'
  `

  // Pending transactions
  const pending = await sql`
    SELECT
      COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as pending_credits,
      COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as pending_debits
    FROM transactions
    WHERE status = 'pending'
  `

  // Recent transactions (last 10)
  const recent = await sql`
    SELECT t.*, c.name as container_name, c.color as container_color
    FROM transactions t
    LEFT JOIN containers c ON c.id = t.container_id
    ORDER BY t.date DESC, t.created_at DESC
    LIMIT 10
  `

  // Container count
  const containerCount = await sql`SELECT COUNT(*) as total FROM containers WHERE is_active = true`

  return ok({
    balances,
    monthly: monthlyStats[0] ?? { monthly_income: 0, monthly_expenses: 0, transaction_count: 0 },
    pending: pending[0] ?? { pending_credits: 0, pending_debits: 0 },
    recentTransactions: recent,
    activeContainers: containerCount[0]?.total ?? 0,
  })
}

// ============================================================
// MAIN ROUTER
// ============================================================

function cleanPath(rawPath: string): string {
  // Handle both rewritten path (/.netlify/functions/api/...) and original path (/api/...)
  let p = rawPath
  if (p.startsWith('/.netlify/functions/api')) {
    p = p.slice('/.netlify/functions/api'.length)
  } else if (p.startsWith('/api')) {
    p = p.slice('/api'.length)
  }
  return p || '/'
}

const handler: Handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') return cors()

  const path = cleanPath(event.path)

  try {
    // Health check endpoint - tests env vars + DB connectivity
    if (path === '/health' || path === '/health/') {
      const health: Record<string, unknown> = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        path: event.path,
        cleanPath: path,
        env: {
          hasDatabaseUrl: !!process.env.DATABASE_URL,
          databaseUrlPrefix: process.env.DATABASE_URL
            ? process.env.DATABASE_URL.slice(0, 20) + '...'
            : null,
        },
      }
      // Try DB connectivity if DATABASE_URL is set
      if (process.env.DATABASE_URL) {
        try {
          const sql = getDb()
          const result = await sql`SELECT 1 as ping`
          health.db = { connected: true, ping: result[0]?.ping }
        } catch (dbErr) {
          health.status = 'degraded'
          health.db = {
            connected: false,
            error: dbErr instanceof Error ? dbErr.message : String(dbErr),
          }
        }
      } else {
        health.status = 'error'
        health.db = { connected: false, error: 'DATABASE_URL not set' }
      }
      return json(health.status === 'ok' ? 200 : 503, health)
    }

    // Route matching (order matters: more specific first)
    if (path.startsWith('/subjects')) {
      return await handleSubjects(event, extractId(path, 'subjects'))
    }
    if (path.startsWith('/containers')) {
      return await handleContainers(event, extractId(path, 'containers'))
    }
    if (path.startsWith('/counterparties')) {
      return await handleCounterparties(event, extractId(path, 'counterparties'))
    }
    if (path.startsWith('/tags')) {
      return await handleTags(event, extractId(path, 'tags'))
    }
    if (path.startsWith('/transactions')) {
      return await handleTransactions(event, extractId(path, 'transactions'))
    }
    if (path.startsWith('/recurrences')) {
      return await handleRecurrences(event, extractId(path, 'recurrences'))
    }
    if (path.startsWith('/budget')) {
      return await handleBudget(event, path)
    }
    if (path.startsWith('/stats')) {
      return await handleStats(event)
    }

    return notFound(`Nessun handler per: ${path} (raw: ${event.path})`)
  } catch (err) {
    return serverError(err)
  }
}

export { handler }
