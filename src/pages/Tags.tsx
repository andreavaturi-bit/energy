import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  Search,
  Tag as TagIcon,
  FolderOpen,
  Layers,
} from 'lucide-react'
import { useTags, useCreateTag, useUpdateTag, useDeleteTag } from '@/lib/hooks'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import type { Tag, TagType } from '@/types'

// ── Constants ───────────────────────────────────────────────

const typeLabels: Record<TagType, string> = {
  scope: 'Ambito',
  category: 'Categoria',
  purpose: 'Tag',
  custom: 'Tag',
}

const typeIcons: Record<TagType, typeof Layers> = {
  scope: Layers,
  category: FolderOpen,
  purpose: TagIcon,
  custom: TagIcon,
}

const typeColors: Record<TagType, string> = {
  scope: 'text-purple-400 bg-purple-500/10',
  category: 'text-blue-400 bg-blue-500/10',
  purpose: 'text-emerald-400 bg-emerald-500/10',
  custom: 'text-emerald-400 bg-emerald-500/10',
}

// ── Tree node type ──────────────────────────────────────────

interface TagNode extends Tag {
  childNodes: TagNode[]
  depth: number
}

function buildTree(tags: Tag[]): TagNode[] {
  const map = new Map<string, TagNode>()
  const roots: TagNode[] = []

  // Create nodes
  for (const tag of tags) {
    map.set(tag.id, { ...tag, childNodes: [], depth: 0 })
  }

  // Link children to parents
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      const parent = map.get(node.parentId)!
      node.depth = parent.depth + 1
      parent.childNodes.push(node)
    } else {
      roots.push(node)
    }
  }

  // Sort: scope first, then category, then others; within same type alphabetical
  const typeOrder: Record<string, number> = { scope: 0, category: 1, purpose: 2, custom: 3 }
  function sortNodes(nodes: TagNode[]) {
    nodes.sort((a, b) => {
      const ta = typeOrder[a.type] ?? 99
      const tb = typeOrder[b.type] ?? 99
      if (ta !== tb) return ta - tb
      return a.name.localeCompare(b.name)
    })
    for (const n of nodes) sortNodes(n.childNodes)
  }
  sortNodes(roots)

  return roots
}

function flattenTree(nodes: TagNode[], expanded: Set<string>): TagNode[] {
  const result: TagNode[] = []
  function walk(list: TagNode[], depth: number) {
    for (const node of list) {
      result.push({ ...node, depth })
      if (node.childNodes.length > 0 && expanded.has(node.id)) {
        walk(node.childNodes, depth + 1)
      }
    }
  }
  walk(nodes, 0)
  return result
}

// ── Main component ──────────────────────────────────────────

export function Tags() {
  const navigate = useNavigate()
  const { data: tags = [], isLoading, isError, error } = useTags()
  const createTag = useCreateTag()
  const updateTag = useUpdateTag()
  const deleteTag = useDeleteTag()

  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // Build tree from tags
  const tree = useMemo(() => {
    const filtered = tags.filter((t) => {
      if (!showInactive && !t.isActive) return false
      if (search) {
        return t.name.toLowerCase().includes(search.toLowerCase())
      }
      return true
    })
    return buildTree(filtered)
  }, [tags, search, showInactive])

  // Auto-expand all when searching
  const effectiveExpanded = useMemo(() => {
    if (search) {
      return new Set(tags.map((t) => t.id))
    }
    return expanded
  }, [search, expanded, tags])

  const flatList = useMemo(() => flattenTree(tree, effectiveExpanded), [tree, effectiveExpanded])

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function expandAll() {
    setExpanded(new Set(tags.map((t) => t.id)))
  }

  function collapseAll() {
    setExpanded(new Set())
  }

  function openCreate(parentId?: string, type?: TagType) {
    setEditingTag(null)
    setShowModal(true)
    // Store suggested parent/type in a temp way via the modal
    setModalDefaults({ parentId: parentId || '', type: type || 'category' })
  }

  function openEdit(tag: Tag) {
    setEditingTag(tag)
    setModalDefaults({ parentId: tag.parentId || '', type: tag.type })
    setShowModal(true)
  }

  function handleDelete(tag: Tag) {
    const children = tags.filter((t) => t.parentId === tag.id)
    if (children.length > 0) {
      alert(`Impossibile eliminare "${tag.name}": ha ${children.length} elementi figli. Elimina prima i figli.`)
      return
    }
    if (!confirm(`Eliminare il tag "${tag.name}"?`)) return
    deleteTag.mutate(tag.id)
  }

  function handleToggleActive(tag: Tag) {
    updateTag.mutate({ id: tag.id, data: { isActive: !tag.isActive } })
  }

  const [modalDefaults, setModalDefaults] = useState({ parentId: '', type: 'category' as TagType })

  // Stats
  const scopeCount = tags.filter((t) => t.type === 'scope' && t.isActive).length
  const categoryCount = tags.filter((t) => t.type === 'category' && t.isActive).length
  const tagCount = tags.filter((t) => (t.type === 'purpose' || t.type === 'custom') && t.isActive).length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-zinc-400">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Caricamento tag...</span>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-red-400">
          <AlertCircle className="h-6 w-6" />
          <span>Errore: {error instanceof Error ? error.message : 'Errore sconosciuto'}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Tag</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {scopeCount} ambiti, {categoryCount} categorie, {tagCount} tag
          </p>
        </div>
        <button
          className="flex items-center gap-2 rounded-lg bg-energy-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-energy-400 transition-colors"
          onClick={() => openCreate()}
        >
          <Plus className="h-4 w-4" />
          Nuovo Tag
        </button>
      </div>

      {/* Hierarchy explanation */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${typeColors.scope}`}>
              <Layers className="h-3 w-3" /> Ambito
            </span>
            <ChevronRight className="h-3 w-3 text-zinc-600" />
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${typeColors.category}`}>
              <FolderOpen className="h-3 w-3" /> Categoria
            </span>
            <ChevronRight className="h-3 w-3 text-zinc-600" />
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${typeColors.purpose}`}>
              <TagIcon className="h-3 w-3" /> Tag
            </span>
          </div>
          <span className="text-xs text-zinc-500 hidden sm:block">
            Gerarchia: un Ambito contiene Categorie, che a loro volta contengono Tag specifici
          </span>
        </div>
      </div>

      {/* Search and controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Cerca tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-500 focus:border-energy-500 focus:outline-none focus:ring-1 focus:ring-energy-500"
          />
        </div>
        <button
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition-colors ${
            showInactive
              ? 'border-energy-500 bg-energy-500/10 text-energy-400'
              : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
          }`}
          onClick={() => setShowInactive(!showInactive)}
        >
          <EyeOff className="h-3.5 w-3.5" />
          Inattivi
        </button>
        <button
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors"
          onClick={expandAll}
        >
          Espandi tutto
        </button>
        <button
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors"
          onClick={collapseAll}
        >
          Comprimi tutto
        </button>
      </div>

      {/* Tree list */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {flatList.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            <TagIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nessun tag trovato</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {flatList.map((node) => {
              const TypeIcon = typeIcons[node.type] || TagIcon
              const hasChildren = node.childNodes.length > 0
              const isExpanded = effectiveExpanded.has(node.id)

              return (
                <div
                  key={node.id}
                  className={`flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800/30 transition-colors ${
                    !node.isActive ? 'opacity-50' : ''
                  }`}
                  style={{ paddingLeft: `${16 + node.depth * 28}px` }}
                >
                  {/* Expand/collapse toggle */}
                  <button
                    className={`shrink-0 rounded p-0.5 ${
                      hasChildren ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700' : 'text-transparent cursor-default'
                    }`}
                    onClick={() => hasChildren && toggleExpand(node.id)}
                    disabled={!hasChildren}
                  >
                    {hasChildren ? (
                      isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                    ) : (
                      <span className="block h-4 w-4" />
                    )}
                  </button>

                  {/* Color dot */}
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: node.color || '#6b7280' }}
                  />

                  {/* Name and type */}
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <button
                      className="text-sm font-medium text-zinc-200 truncate hover:text-energy-400 transition-colors text-left"
                      onClick={() => navigate(`/transactions?tagId=${node.id}`)}
                      title={`Vedi transazioni con tag "${node.name}"`}
                    >
                      {node.name}
                    </button>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 ${typeColors[node.type]}`}>
                      <TypeIcon className="h-2.5 w-2.5" />
                      {typeLabels[node.type]}
                    </span>
                    {hasChildren && (
                      <span className="text-[10px] text-zinc-500">{node.childNodes.length}</span>
                    )}
                  </div>

                  {/* Inactive badge */}
                  {!node.isActive && (
                    <span className="shrink-0 rounded-full bg-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400">
                      Inattivo
                    </span>
                  )}

                  {/* Actions */}
                  <div className="shrink-0 flex items-center gap-0.5">
                    {/* Add child */}
                    {(node.type === 'scope' || node.type === 'category') && (
                      <button
                        className="rounded p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-energy-400 transition-colors"
                        title={`Aggiungi figlio a "${node.name}"`}
                        onClick={() => openCreate(
                          node.id,
                          node.type === 'scope' ? 'category' : 'purpose',
                        )}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      className="rounded p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300 transition-colors"
                      title="Modifica"
                      onClick={() => openEdit(node)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="rounded p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300 transition-colors"
                      title={node.isActive ? 'Disattiva' : 'Riattiva'}
                      onClick={() => handleToggleActive(node)}
                    >
                      {node.isActive ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      className="rounded p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-red-400 transition-colors"
                      title="Elimina"
                      onClick={() => handleDelete(node)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <TagModal
          tag={editingTag}
          allTags={tags}
          defaults={modalDefaults}
          onClose={() => setShowModal(false)}
          onSave={(data) => {
            if (editingTag) {
              updateTag.mutate(
                { id: editingTag.id, data },
                { onSuccess: () => setShowModal(false) },
              )
            } else {
              createTag.mutate(data, {
                onSuccess: () => setShowModal(false),
              })
            }
          }}
        />
      )}
    </div>
  )
}

// ── Tag Modal ───────────────────────────────────────────────

function TagModal({
  tag,
  allTags,
  defaults,
  onClose,
  onSave,
}: {
  tag: Tag | null
  allTags: Tag[]
  defaults: { parentId: string; type: TagType }
  onClose: () => void
  onSave: (data: { name: string; type: TagType; color?: string; icon?: string; parentId?: string }) => void
}) {
  const [form, setForm] = useState({
    name: tag?.name || '',
    type: tag?.type || defaults.type,
    color: tag?.color || '#22C55E',
    parentId: tag?.parentId || defaults.parentId,
  })

  function handleSave() {
    if (!form.name.trim()) return
    onSave({
      name: form.name,
      type: form.type,
      color: form.color,
      parentId: form.parentId || undefined,
    })
  }

  // Build parent options — only show scope/category as potential parents
  const parentOptions = allTags
    .filter((t) => t.id !== tag?.id && t.isActive && (t.type === 'scope' || t.type === 'category'))
    .map((t) => {
      const parent = t.parentId ? allTags.find((p) => p.id === t.parentId) : null
      return {
        value: t.id,
        label: parent ? `${parent.name} > ${t.name}` : t.name,
        color: t.color,
      }
    })

  // Suggest type based on parent
  function handleParentChange(parentId: string) {
    const parent = allTags.find((t) => t.id === parentId)
    let suggestedType = form.type
    if (!parent) {
      suggestedType = 'scope'
    } else if (parent.type === 'scope') {
      suggestedType = 'category'
    } else if (parent.type === 'category') {
      suggestedType = 'purpose'
    }
    setForm({ ...form, parentId, type: suggestedType })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-100">
            {tag ? 'Modifica Tag' : 'Nuovo Tag'}
          </h2>
          <button className="rounded-md p-1 text-zinc-400 hover:text-zinc-200" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Nome *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-energy-500 focus:outline-none focus:ring-1 focus:ring-energy-500"
              placeholder="es. Personale, Affitto, Bollette..."
              autoFocus
            />
          </div>

          {/* Parent */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Genitore (posizione nella gerarchia)</label>
            <SearchableSelect
              value={form.parentId}
              onChange={handleParentChange}
              options={parentOptions}
              placeholder="Nessuno (elemento root)"
              allowEmpty
              emptyLabel="— Nessun genitore (root) —"
            />
          </div>

          {/* Type + Color */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Tipo</label>
              <SearchableSelect
                value={form.type}
                onChange={(v) => setForm({ ...form, type: v as TagType })}
                options={[
                  { value: 'scope', label: 'Ambito' },
                  { value: 'category', label: 'Categoria' },
                  { value: 'purpose', label: 'Finalita\'' },
                  { value: 'custom', label: 'Custom' },
                ]}
                placeholder="Tipo..."
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Colore</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="h-9 w-9 rounded border border-zinc-700 bg-zinc-800 cursor-pointer"
                />
                <input
                  type="text"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 font-mono focus:border-energy-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800">
          <button className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700" onClick={onClose}>
            Annulla
          </button>
          <button
            className="rounded-lg bg-energy-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-energy-400 disabled:opacity-50"
            onClick={handleSave}
            disabled={!form.name.trim()}
          >
            {tag ? 'Salva' : 'Crea Tag'}
          </button>
        </div>
      </div>
    </div>
  )
}
