import { neon } from '@neondatabase/serverless'

/**
 * Returns a tagged-template SQL function connected to Neon.
 * Each call reuses the same connection for the function invocation lifetime.
 *
 * Requires DATABASE_URL env var in Netlify dashboard.
 */
export function getDb() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  return neon(url)
}

/**
 * Parse a JSON body from a Netlify Function event.
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
  // Take everything up to the next slash or end
  const id = rest.split('/')[0]
  return id || null
}

/**
 * Standard JSON response helper
 */
export function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }
}

export function ok(data: unknown) {
  return json(200, { data })
}

export function created(data: unknown) {
  return json(201, { data })
}

export function noContent() {
  return json(204, null)
}

export function badRequest(message: string) {
  return json(400, { error: 'Bad Request', message })
}

export function notFound(message = 'Not found') {
  return json(404, { error: 'Not Found', message })
}

export function serverError(err: unknown) {
  const message = err instanceof Error ? err.message : 'Internal server error'
  console.error('API Error:', err)
  return json(500, { error: 'Internal Server Error', message })
}
