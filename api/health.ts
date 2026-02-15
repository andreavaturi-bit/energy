import type { VercelRequest, VercelResponse } from '@vercel/node'
import { neon } from '@neondatabase/serverless'

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const health: Record<string, unknown> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    runtime: 'vercel',
    env: {
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      databaseUrlPrefix: process.env.DATABASE_URL
        ? process.env.DATABASE_URL.slice(0, 25) + '...'
        : null,
    },
  }

  // Test DB connectivity if DATABASE_URL is set
  if (process.env.DATABASE_URL) {
    try {
      const sql = neon(process.env.DATABASE_URL)
      const result = await sql`SELECT 1 as ping`
      health.db = { connected: true, ping: result[0]?.ping }
    } catch (err) {
      health.status = 'degraded'
      health.db = {
        connected: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  } else {
    health.status = 'error'
    health.db = { connected: false, error: 'DATABASE_URL not set' }
  }

  return res.status(health.status === 'ok' ? 200 : 503).json(health)
}
