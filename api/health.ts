import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''

  const health: Record<string, unknown> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: {
      SUPABASE_URL: url ? url.slice(0, 30) + '...' : '(NOT SET)',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set ✓' : '(NOT SET)',
      SUPABASE_ANON_KEY: (process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ? 'set ✓' : '(NOT SET)',
    },
    checks: {} as Record<string, unknown>,
  }

  const checks = health.checks as Record<string, unknown>

  // Check 1: URL format
  if (!url) {
    checks.url = '❌ SUPABASE_URL is missing'
    health.status = 'error'
  } else if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
    checks.url = `❌ SUPABASE_URL looks wrong (should be https://xxx.supabase.co, got: ${url.slice(0, 40)}...)`
    health.status = 'error'
  } else {
    checks.url = '✅ URL format OK'
  }

  // Check 2: Key present
  if (!key) {
    checks.key = '❌ No API key found (need SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY)'
    health.status = 'error'
  } else {
    checks.key = '✅ API key present'
  }

  // Check 3: Try actual DB connection
  if (url && key && url.startsWith('https://')) {
    try {
      const sb = createClient(url, key)
      const { error } = await sb.from('subjects').select('id').limit(1)
      if (error) {
        checks.db = `❌ DB query failed: ${error.message}`
        health.status = 'error'
      } else {
        checks.db = '✅ DB connection OK'
      }
    } catch (err) {
      checks.db = `❌ Connection error: ${err instanceof Error ? err.message : String(err)}`
      health.status = 'error'
    }
  } else {
    checks.db = '⏭️ Skipped (fix URL/key first)'
  }

  return res.status(health.status === 'ok' ? 200 : 503).json(health)
}
