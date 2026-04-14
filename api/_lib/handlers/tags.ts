import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  getSupabase,
  ok,
  created,
  badRequest,
  notFound,
} from '../supabase.js'

export async function handleTags(
  req: VercelRequest,
  res: VercelResponse,
  id: string | null,
) {
  const sb = getSupabase()
  const method = req.method

  if (method === 'GET' && !id) {
    const { data, error } = await sb.from('tags').select('*').order('type').order('name')
    if (error) throw error
    return ok(res, data)
  }

  if (method === 'GET' && id) {
    const { data, error } = await sb.from('tags').select('*').eq('id', id).single()
    if (error || !data) return notFound(res, 'Tag non trovato')
    return ok(res, data)
  }

  const bodyAction = (req.body as Record<string, unknown>)?._action

  if (method === 'POST' && bodyAction === 'update') {
    const b = req.body || {}
    const tagId = b.id as string
    if (!tagId) return badRequest(res, 'id è obbligatorio')
    const update: Record<string, unknown> = {}
    if (b.name !== undefined) update.name = b.name
    if (b.parentId !== undefined) update.parent_id = b.parentId
    if (b.type !== undefined) update.type = b.type
    if (b.color !== undefined) update.color = b.color
    if (b.icon !== undefined) update.icon = b.icon
    if (b.isActive !== undefined) update.is_active = b.isActive

    const { data, error } = await sb.from('tags').update(update).eq('id', tagId).select().single()
    if (error || !data) return notFound(res, 'Tag non trovato')
    return ok(res, data)
  }

  if (method === 'POST' && bodyAction === 'delete') {
    const tagId = (req.body as Record<string, unknown>)?.id as string
    if (!tagId) return badRequest(res, 'id è obbligatorio')
    const { data, error } = await sb.from('tags').delete().eq('id', tagId).select('id').single()
    if (error || !data) return notFound(res, 'Tag non trovato')
    return ok(res, { deleted: true, id: tagId })
  }

  if (method === 'POST') {
    const b = req.body || {}
    if (!b.name || !b.type) return badRequest(res, 'name e type sono obbligatori')
    const { data, error } = await sb
      .from('tags')
      .insert({
        name: b.name,
        parent_id: b.parentId ?? null,
        type: b.type,
        color: b.color ?? null,
        icon: b.icon ?? null,
        is_active: b.isActive ?? true,
      })
      .select()
      .single()
    if (error) throw error
    return created(res, data)
  }

  if ((method === 'PUT' || method === 'PATCH') && id) {
    const b = req.body || {}
    const update: Record<string, unknown> = {}
    if (b.name !== undefined) update.name = b.name
    if (b.parentId !== undefined) update.parent_id = b.parentId
    if (b.type !== undefined) update.type = b.type
    if (b.color !== undefined) update.color = b.color
    if (b.icon !== undefined) update.icon = b.icon
    if (b.isActive !== undefined) update.is_active = b.isActive

    const { data, error } = await sb.from('tags').update(update).eq('id', id).select().single()
    if (error || !data) return notFound(res, 'Tag non trovato')
    return ok(res, data)
  }

  if (method === 'DELETE' && id) {
    const { data, error } = await sb.from('tags').delete().eq('id', id).select('id').single()
    if (error || !data) return notFound(res, 'Tag non trovato')
    return ok(res, { deleted: true, id })
  }

  return badRequest(res, 'Metodo non supportato')
}
