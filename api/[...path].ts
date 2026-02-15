/**
 * Vercel Serverless Function – thin adapter
 *
 * Delegates all API logic to the Netlify function handler
 * (which uses @neondatabase/serverless + DATABASE_URL).
 * This way both deployment targets share the same Neon-based code.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { HandlerEvent } from '@netlify/functions'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore – re-export shape
import { handler as netlifyHandler } from '../netlify/functions/api'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ── CORS ────────────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()

  // ── Build a Netlify-like event from the Vercel request ──────
  // Vercel catch-all gives req.query.path = ['stats'] or ['transactions', 'abc']
  // Strip 'path' (the catch-all param) from the query, keep the rest
  const { path: _pathSegments, ...restQuery } = req.query
  const queryStringParameters: Record<string, string> = {}
  for (const [key, val] of Object.entries(restQuery)) {
    queryStringParameters[key] = Array.isArray(val) ? val[0] : (val as string) || ''
  }

  const event = {
    path: req.url?.split('?')[0] || '/',
    httpMethod: req.method || 'GET',
    headers: req.headers as Record<string, string>,
    multiValueHeaders: {},
    queryStringParameters,
    multiValueQueryStringParameters: {},
    body: req.body ? JSON.stringify(req.body) : null,
    isBase64Encoded: false,
    rawUrl: `https://${req.headers.host || 'localhost'}${req.url || '/'}`,
    rawQuery: new URLSearchParams(queryStringParameters).toString(),
  } satisfies HandlerEvent

  // ── Call the Netlify handler ────────────────────────────────
  try {
    const result = await netlifyHandler(event, {} as never)
    if (!result) {
      return res.status(500).json({ error: 'Internal Server Error', message: 'No response from handler' })
    }

    // Forward headers
    if (result.headers) {
      for (const [key, value] of Object.entries(result.headers)) {
        if (typeof value === 'string') {
          res.setHeader(key, value)
        }
      }
    }

    // Forward body
    const statusCode = result.statusCode || 500
    if (result.body) {
      try {
        return res.status(statusCode).json(JSON.parse(result.body))
      } catch {
        return res.status(statusCode).send(result.body)
      }
    }
    return res.status(statusCode).end()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('Vercel adapter error:', err)
    return res.status(500).json({ error: 'Internal Server Error', message })
  }
}
