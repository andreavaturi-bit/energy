import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import type { VercelResponse } from '@vercel/node'

let _sql: NeonQueryFunction<false, false> | null = null

/**
 * Returns a Neon SQL tagged-template function.
 * Requires DATABASE_URL env var.
 */
export function getDb() {
  if (_sql) return _sql
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  _sql = neon(url)
  return _sql
}

/**
 * Parse a JSON body string.
 */
export function parseBody<T = Record<string, unknown>>(body: string | null): T {
  if (!body) return {} as T
  try {
    return JSON.parse(body) as T
  } catch {
    return {} as T
  }
}

/**
 * Extract resource ID from path like /transactions/abc-123
 */
export function extractId(path: string, resource: string): string | null {
  const prefix = `/${resource}/`
  const idx = path.indexOf(prefix)
  if (idx === -1) return null
  const rest = path.slice(idx + prefix.length)
  const id = rest.split('/')[0]
  return id || null
}

// ── Response helpers (Vercel format) ────────────────────────

export function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
}

export function ok(res: VercelResponse, data: unknown) {
  return res.status(200).json({ data })
}

export function created(res: VercelResponse, data: unknown) {
  return res.status(201).json({ data })
}

export function badRequest(res: VercelResponse, message: string) {
  return res.status(400).json({ error: 'Bad Request', message })
}

export function notFound(res: VercelResponse, message = 'Not found') {
  return res.status(404).json({ error: 'Not Found', message })
}

export function serverError(res: VercelResponse, err: unknown) {
  const message = err instanceof Error ? err.message : 'Internal server error'
  console.error('API Error:', err)
  return res.status(500).json({ error: 'Internal Server Error', message })
}
