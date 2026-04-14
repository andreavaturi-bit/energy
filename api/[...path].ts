import type { VercelRequest, VercelResponse } from '@vercel/node'
import { setCors, serverError } from './_lib/supabase.js'
import { handleSubjects } from './_lib/handlers/subjects.js'
import { handleCounterparties } from './_lib/handlers/counterparties.js'
import { handleContainers } from './_lib/handlers/containers.js'
import { handleTags } from './_lib/handlers/tags.js'
import { handleTransactions } from './_lib/handlers/transactions.js'
import { handleRecurrences } from './_lib/handlers/recurrences.js'
import { handleBudget } from './_lib/handlers/budget.js'
import { handleSmartRules } from './_lib/handlers/smart-rules.js'
import { handleInstallmentPlans } from './_lib/handlers/installment-plans.js'
import { handleImportProfiles } from './_lib/handlers/import-profiles.js'
import { handleStats } from './_lib/handlers/stats.js'
import { handleSeed } from './_lib/handlers/seed.js'

// ============================================================
// MAIN ROUTER
// ============================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  // Extract path segments — always parse from req.url for reliability
  // (Vercel rewrites can alter req.query.path, making it unreliable)
  const url = req.url || ''
  const pathPart = url.split('?')[0]
  const apiPath = pathPart.replace(/^\/api\/?/, '')
  const segments = apiPath ? apiPath.split('/').filter(Boolean) : []

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
      case 'smart-rules':
        return await handleSmartRules(req, res, segments[1] || null)
      case 'installment-plans':
        return await handleInstallmentPlans(req, res, segments[1] || null)
      case 'import-profiles':
        return await handleImportProfiles(req, res, segments[1] || null)
      case 'stats':
        return await handleStats(req, res, segments)
      case 'seed':
        return await handleSeed(req, res)
      case 'health':
        return res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
      case '':
        return res.status(200).json({
          status: 'ok',
          endpoints: [
            'subjects', 'containers', 'counterparties', 'tags', 'transactions',
            'recurrences', 'budget', 'smart-rules', 'installment-plans',
            'import-profiles', 'stats', 'health',
          ],
        })
      default:
        return res.status(404).json({
          error: 'Not Found',
          message: `Nessun handler per: /${segments.join('/')}`,
        })
    }
  } catch (err) {
    return serverError(res, err)
  }
}
