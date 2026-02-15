import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  getDb,
  setCors,
  ok,
  created,
  badRequest,
  notFound,
  serverError,
} from './_lib/supabase'

// ============================================================
// SUBJECTS
// ============================================================

async function handleSubjects(req: VercelRequest, res: VercelResponse, id: string | null) {
  const sql = getDb()
  const method = req.method

  if (method === 'GET' && !id) {
    const rows = await sql`SELECT * FROM subjects ORDER BY name`
    return ok(res, rows)
  }

  if (method === 'GET' && id) {
    const rows = await sql`SELECT * FROM subjects WHERE id = ${id}`
    if (rows.length === 0) return notFound(res, 'Soggetto non trovato')
    return ok(res, rows[0])
  }

  if (method === 'POST') {
    const b = req.body || {}
    if (!b.name || !b.type) return badRequest(res, 'name e type sono obbligatori')
    const rows = await sql`
      INSERT INTO subjects (type, name, legal_form, tax_id, country, role, parent_subject_id, notes, is_active)
      VALUES (${b.type}, ${b.name}, ${b.legalForm ?? null}, ${b.taxId ?? null},
              ${b.country ?? 'IT'}, ${b.role ?? null}, ${b.parentSubjectId ?? null},
              ${b.notes ?? null}, ${b.isActive ?? true})
      RETURNING *
    `
    return created(res, rows[0])
  }

  if ((method === 'PUT' || method === 'PATCH') && id) {
    const b = req.body || {}
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
    if (rows.length === 0) return notFound(res, 'Soggetto non trovato')
    return ok(res, rows[0])
  }

  if (method === 'DELETE' && id) {
    const rows = await sql`DELETE FROM subjects WHERE id = ${id} RETURNING id`
    if (rows.length === 0) return notFound(res, 'Soggetto non trovato')
    return ok(res, { deleted: true, id })
  }

  return badRequest(res, 'Metodo non supportato')
}

// ============================================================
// CONTAINERS
// ============================================================

async function handleContainers(req: VercelRequest, res: VercelResponse, id: string | null) {
  const sql = getDb()
  const method = req.method

  if (method === 'GET' && !id) {
    const rows = await sql`
      SELECT c.*, s.name as subject_name
      FROM containers c
      LEFT JOIN subjects s ON s.id = c.subject_id
      ORDER BY c.sort_order, c.name
    `
    return ok(res, rows)
  }

  if (method === 'GET' && id) {
    const rows = await sql`
      SELECT c.*, s.name as subject_name
      FROM containers c
      LEFT JOIN subjects s ON s.id = c.subject_id
      WHERE c.id = ${id}
    `
    if (rows.length === 0) return notFound(res, 'Contenitore non trovato')
    return ok(res, rows[0])
  }

  if (method === 'POST') {
    const b = req.body || {}
    if (!b.name || !b.type || !b.subjectId) return badRequest(res, 'name, type e subjectId sono obbligatori')
    const rows = await sql`
      INSERT INTO containers (subject_id, name, type, provider, currency, is_multi_currency,
        initial_balance, billing_day, linked_container_id, goal_amount, goal_description,
        icon, color, sort_order, is_active, notes)
      VALUES (${b.subjectId}, ${b.name}, ${b.type}, ${b.provider ?? null},
              ${b.currency ?? 'EUR'}, ${b.isMultiCurrency ?? false},
              ${b.initialBalance ?? '0'}, ${b.billingDay ?? null}, ${b.linkedContainerId ?? null},
              ${b.goalAmount ?? null}, ${b.goalDescription ?? null},
              ${b.icon ?? null}, ${b.color ?? null}, ${b.sortOrder ?? 0},
              ${b.isActive ?? true}, ${b.notes ?? null})
      RETURNING *
    `
    return created(res, rows[0])
  }

  if ((method === 'PUT' || method === 'PATCH') && id) {
    const b = req.body || {}
    const rows = await sql`
      UPDATE containers SET
        subject_id = COALESCE(${b.subjectId ?? null}, subject_id),
        name = COALESCE(${b.name ?? null}, name),
        type = COALESCE(${b.type ?? null}, type),
        provider = ${b.provider ?? null},
        currency = COALESCE(${b.currency ?? null}, currency),
        is_multi_currency = COALESCE(${b.isMultiCurrency ?? null}, is_multi_currency),
        initial_balance = COALESCE(${b.initialBalance ?? null}::numeric, initial_balance),
        billing_day = ${b.billingDay ?? null},
        linked_container_id = ${b.linkedContainerId ?? null},
        icon = ${b.icon ?? null},
        color = ${b.color ?? null},
        sort_order = COALESCE(${b.sortOrder ?? null}, sort_order),
        is_active = COALESCE(${b.isActive ?? null}, is_active),
        notes = ${b.notes ?? null},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `
    if (rows.length === 0) return notFound(res, 'Contenitore non trovato')
    return ok(res, rows[0])
  }

  if (method === 'DELETE' && id) {
    const rows = await sql`DELETE FROM containers WHERE id = ${id} RETURNING id`
    if (rows.length === 0) return notFound(res, 'Contenitore non trovato')
    return ok(res, { deleted: true, id })
  }

  return badRequest(res, 'Metodo non supportato')
}

// ============================================================
// COUNTERPARTIES
// ============================================================

async function handleCounterparties(req: VercelRequest, res: VercelResponse, id: string | null) {
  const sql = getDb()
  const method = req.method

  if (method === 'GET' && !id) {
    const rows = await sql`SELECT * FROM counterparties ORDER BY name`
    return ok(res, rows)
  }

  if (method === 'GET' && id) {
    const rows = await sql`SELECT * FROM counterparties WHERE id = ${id}`
    if (rows.length === 0) return notFound(res, 'Controparte non trovata')
    return ok(res, rows[0])
  }

  if (method === 'POST') {
    const b = req.body || {}
    if (!b.name) return badRequest(res, 'name è obbligatorio')
    const rows = await sql`
      INSERT INTO counterparties (name, type, default_category, notes, is_active)
      VALUES (${b.name}, ${b.type ?? null}, ${b.defaultCategory ?? null},
              ${b.notes ?? null}, ${b.isActive ?? true})
      RETURNING *
    `
    return created(res, rows[0])
  }

  if ((method === 'PUT' || method === 'PATCH') && id) {
    const b = req.body || {}
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
    if (rows.length === 0) return notFound(res, 'Controparte non trovata')
    return ok(res, rows[0])
  }

  if (method === 'DELETE' && id) {
    const rows = await sql`DELETE FROM counterparties WHERE id = ${id} RETURNING id`
    if (rows.length === 0) return notFound(res, 'Controparte non trovata')
    return ok(res, { deleted: true, id })
  }

  return badRequest(res, 'Metodo non supportato')
}

// ============================================================
// TAGS
// ============================================================

async function handleTags(req: VercelRequest, res: VercelResponse, id: string | null) {
  const sql = getDb()
  const method = req.method

  if (method === 'GET' && !id) {
    const rows = await sql`SELECT * FROM tags ORDER BY type, name`
    return ok(res, rows)
  }

  if (method === 'GET' && id) {
    const rows = await sql`SELECT * FROM tags WHERE id = ${id}`
    if (rows.length === 0) return notFound(res, 'Tag non trovato')
    return ok(res, rows[0])
  }

  if (method === 'POST') {
    const b = req.body || {}
    if (!b.name || !b.type) return badRequest(res, 'name e type sono obbligatori')
    const rows = await sql`
      INSERT INTO tags (name, parent_id, type, color, icon, is_active)
      VALUES (${b.name}, ${b.parentId ?? null}, ${b.type},
              ${b.color ?? null}, ${b.icon ?? null}, ${b.isActive ?? true})
      RETURNING *
    `
    return created(res, rows[0])
  }

  if ((method === 'PUT' || method === 'PATCH') && id) {
    const b = req.body || {}
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
    if (rows.length === 0) return notFound(res, 'Tag non trovato')
    return ok(res, rows[0])
  }

  if (method === 'DELETE' && id) {
    const rows = await sql`DELETE FROM tags WHERE id = ${id} RETURNING id`
    if (rows.length === 0) return notFound(res, 'Tag non trovato')
    return ok(res, { deleted: true, id })
  }

  return badRequest(res, 'Metodo non supportato')
}

// ============================================================
// TRANSACTIONS
// ============================================================

async function handleTransactions(req: VercelRequest, res: VercelResponse, id: string | null) {
  const sql = getDb()
  const method = req.method

  if (method === 'GET' && !id) {
    const params = (req.query || {}) as Record<string, string | string[]>
    const param = (k: string) => {
      const v = params[k]
      return Array.isArray(v) ? v[0] : v
    }
    const limit = Math.min(parseInt(param('limit') || '200'), 1000)
    const offset = parseInt(param('offset') || '0')

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

    const countResult = await sql`SELECT COUNT(*) as total FROM transactions`
    const total = countResult[0]?.total ?? 0

    return ok(res, { rows, total, limit, offset })
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
    if (rows.length === 0) return notFound(res, 'Transazione non trovata')

    const tags = await sql`
      SELECT t.* FROM tags t
      INNER JOIN transaction_tags tt ON tt.tag_id = t.id
      WHERE tt.transaction_id = ${id}
    `

    return ok(res, { ...rows[0], tags })
  }

  if (method === 'POST') {
    const b = req.body || {}
    if (!b.date || !b.amount || !b.containerId || !b.type) {
      return badRequest(res, 'date, amount, containerId e type sono obbligatori')
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

    const tagIds = b.tagIds as string[] | undefined
    if (tagIds && tagIds.length > 0 && rows[0]) {
      for (const tagId of tagIds) {
        await sql`INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (${rows[0].id}, ${tagId}) ON CONFLICT DO NOTHING`
      }
    }

    return created(res, rows[0])
  }

  if ((method === 'PUT' || method === 'PATCH') && id) {
    const b = req.body || {}

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
    if (rows.length === 0) return notFound(res, 'Transazione non trovata')

    const tagIds = b.tagIds as string[] | undefined
    if (tagIds !== undefined) {
      await sql`DELETE FROM transaction_tags WHERE transaction_id = ${id}`
      for (const tagId of tagIds) {
        await sql`INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (${id}, ${tagId}) ON CONFLICT DO NOTHING`
      }
    }

    return ok(res, rows[0])
  }

  if (method === 'DELETE' && id) {
    const rows = await sql`DELETE FROM transactions WHERE id = ${id} RETURNING id`
    if (rows.length === 0) return notFound(res, 'Transazione non trovata')
    return ok(res, { deleted: true, id })
  }

  return badRequest(res, 'Metodo non supportato')
}

// ============================================================
// RECURRENCES
// ============================================================

async function handleRecurrences(req: VercelRequest, res: VercelResponse, id: string | null) {
  const sql = getDb()
  const method = req.method

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
    return ok(res, rows)
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
    if (rows.length === 0) return notFound(res, 'Ricorrenza non trovata')
    return ok(res, rows[0])
  }

  if (method === 'POST') {
    const b = req.body || {}
    if (!b.description || !b.frequency || !b.type || !b.startDate) {
      return badRequest(res, 'description, frequency, type e startDate sono obbligatori')
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
    return created(res, rows[0])
  }

  if ((method === 'PUT' || method === 'PATCH') && id) {
    const b = req.body || {}
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
    if (rows.length === 0) return notFound(res, 'Ricorrenza non trovata')
    return ok(res, rows[0])
  }

  if (method === 'DELETE' && id) {
    const rows = await sql`DELETE FROM recurrences WHERE id = ${id} RETURNING id`
    if (rows.length === 0) return notFound(res, 'Ricorrenza non trovata')
    return ok(res, { deleted: true, id })
  }

  return badRequest(res, 'Metodo non supportato')
}

// ============================================================
// BUDGET (Periods + Allocations)
// ============================================================

async function handleBudget(req: VercelRequest, res: VercelResponse, segments: string[]) {
  const sql = getDb()
  const method = req.method

  // /api/budget/allocations/:id → PUT/DELETE
  if (segments.length >= 3 && segments[1] === 'allocations' && segments[2]) {
    const allocId = segments[2]

    if (method === 'DELETE') {
      const rows = await sql`DELETE FROM budget_allocations WHERE id = ${allocId} RETURNING id`
      if (rows.length === 0) return notFound(res, 'Allocazione non trovata')
      return ok(res, { deleted: true, id: allocId })
    }

    if (method === 'PUT' || method === 'PATCH') {
      const b = req.body || {}
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
      if (rows.length === 0) return notFound(res, 'Allocazione non trovata')
      return ok(res, rows[0])
    }
  }

  // /api/budget/allocations → POST
  if (segments.length >= 2 && segments[1] === 'allocations' && method === 'POST') {
    const b = req.body || {}
    if (!b.periodId || !b.allocatedAmount) return badRequest(res, 'periodId e allocatedAmount sono obbligatori')
    const rows = await sql`
      INSERT INTO budget_allocations (period_id, tag_id, subject_id, allocated_amount, currency, notes)
      VALUES (${b.periodId}, ${b.tagId ?? null}, ${b.subjectId ?? null},
              ${b.allocatedAmount}, ${b.currency ?? 'EUR'}, ${b.notes ?? null})
      RETURNING *
    `
    return created(res, rows[0])
  }

  // /api/budget/:id
  const periodId = segments.length >= 2 && segments[1] !== 'allocations' ? segments[1] : null

  if (method === 'GET' && !periodId) {
    const periods = await sql`SELECT * FROM budget_periods ORDER BY start_date DESC`
    const allocations = await sql`
      SELECT ba.*, t.name as tag_name, t.color as tag_color
      FROM budget_allocations ba
      LEFT JOIN tags t ON t.id = ba.tag_id
      ORDER BY ba.created_at
    `
    const result = periods.map((p: Record<string, unknown>) => ({
      ...p,
      allocations: allocations.filter((a: Record<string, unknown>) => a.period_id === p.id),
    }))
    return ok(res, result)
  }

  if (method === 'GET' && periodId) {
    const periods = await sql`SELECT * FROM budget_periods WHERE id = ${periodId}`
    if (periods.length === 0) return notFound(res, 'Periodo non trovato')
    const allocations = await sql`
      SELECT ba.*, t.name as tag_name, t.color as tag_color
      FROM budget_allocations ba
      LEFT JOIN tags t ON t.id = ba.tag_id
      WHERE ba.period_id = ${periodId}
      ORDER BY ba.created_at
    `
    return ok(res, { ...periods[0], allocations })
  }

  if (method === 'POST' && !periodId) {
    const b = req.body || {}
    if (!b.name || !b.startDate || !b.endDate) return badRequest(res, 'name, startDate e endDate sono obbligatori')
    const rows = await sql`
      INSERT INTO budget_periods (name, start_date, end_date, is_active)
      VALUES (${b.name}, ${b.startDate}, ${b.endDate}, ${b.isActive ?? true})
      RETURNING *
    `
    return created(res, rows[0])
  }

  if ((method === 'PUT' || method === 'PATCH') && periodId) {
    const b = req.body || {}
    const rows = await sql`
      UPDATE budget_periods SET
        name = COALESCE(${b.name ?? null}, name),
        start_date = COALESCE(${b.startDate ?? null}, start_date),
        end_date = COALESCE(${b.endDate ?? null}, end_date),
        is_active = COALESCE(${b.isActive ?? null}, is_active)
      WHERE id = ${periodId}
      RETURNING *
    `
    if (rows.length === 0) return notFound(res, 'Periodo non trovato')
    return ok(res, rows[0])
  }

  if (method === 'DELETE' && periodId) {
    const rows = await sql`DELETE FROM budget_periods WHERE id = ${periodId} RETURNING id`
    if (rows.length === 0) return notFound(res, 'Periodo non trovato')
    return ok(res, { deleted: true, id: periodId })
  }

  return badRequest(res, 'Metodo non supportato')
}

// ============================================================
// STATS - Dashboard aggregations
// ============================================================

async function handleStats(_req: VercelRequest, res: VercelResponse) {
  const sql = getDb()

  // Total balance by currency
  const balances = await sql`
    SELECT currency, SUM(initial_balance) as total
    FROM containers
    WHERE is_active = true
    GROUP BY currency
    ORDER BY currency
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

  return ok(res, {
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  // Extract path segments from catch-all
  const pathParam = req.query.path
  const segments: string[] = Array.isArray(pathParam)
    ? pathParam
    : pathParam
      ? [pathParam]
      : []

  const resource = segments[0] || ''

  try {
    switch (resource) {
      case 'subjects':
        return await handleSubjects(req, res, segments[1] || null)
      case 'containers':
        return await handleContainers(req, res, segments[1] || null)
      case 'counterparties':
        return await handleCounterparties(req, res, segments[1] || null)
      case 'tags':
        return await handleTags(req, res, segments[1] || null)
      case 'transactions':
        return await handleTransactions(req, res, segments[1] || null)
      case 'recurrences':
        return await handleRecurrences(req, res, segments[1] || null)
      case 'budget':
        return await handleBudget(req, res, segments)
      case 'stats':
        return await handleStats(req, res)
      default:
        return res.status(404).json({ error: 'Not Found', message: `Nessun handler per: /${segments.join('/')}` })
    }
  } catch (err) {
    return serverError(res, err)
  }
}
