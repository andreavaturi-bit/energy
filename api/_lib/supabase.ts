import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { VercelResponse } from '@vercel/node'

let _supabase: SupabaseClient | null = null

/**
 * Returns a Supabase client (reused within invocation).
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars in Vercel dashboard.
 */
export function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not set')
  }
  _supabase = createClient(url, key)
  return _supabase
}

// ── Response helpers ────────────────────────────────────────

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

export function noContent(res: VercelResponse) {
  return res.status(204).end()
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
