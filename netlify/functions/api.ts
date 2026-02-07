import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
}

function jsonResponse(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }
}

const ROUTE_HANDLERS: Record<string, (event: HandlerEvent) => ReturnType<Handler>> = {
  '/subjects': async (event) => {
    return jsonResponse(200, { data: [], message: 'subjects endpoint placeholder' })
  },
  '/containers': async (event) => {
    return jsonResponse(200, { data: [], message: 'containers endpoint placeholder' })
  },
  '/transactions': async (event) => {
    return jsonResponse(200, { data: [], message: 'transactions endpoint placeholder' })
  },
  '/tags': async (event) => {
    return jsonResponse(200, { data: [], message: 'tags endpoint placeholder' })
  },
  '/counterparties': async (event) => {
    return jsonResponse(200, { data: [], message: 'counterparties endpoint placeholder' })
  },
  '/recurrences': async (event) => {
    return jsonResponse(200, { data: [], message: 'recurrences endpoint placeholder' })
  },
  '/budget': async (event) => {
    return jsonResponse(200, { data: [], message: 'budget endpoint placeholder' })
  },
  '/import': async (event) => {
    return jsonResponse(200, { data: [], message: 'import endpoint placeholder' })
  },
  '/stats': async (event) => {
    return jsonResponse(200, { data: [], message: 'stats endpoint placeholder' })
  },
}

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: '',
    }
  }

  // Strip the /.netlify/functions/api prefix to get the route path
  const path = event.path.replace('/.netlify/functions/api', '') || '/'

  // Find matching route handler
  const matchedRoute = Object.keys(ROUTE_HANDLERS).find((route) => path === route || path.startsWith(route + '/'))

  if (matchedRoute) {
    return ROUTE_HANDLERS[matchedRoute](event)
  }

  return jsonResponse(404, { error: 'Not found', message: `No handler for path: ${path}` })
}

export { handler }
