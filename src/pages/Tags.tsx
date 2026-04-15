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
  ChevronLeft,
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
import { PageHeader } from '@/components/ui/PageHeader'
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

function defaultColorForType(type: TagType): string {
  const defaults: Record<TagType, string> = {
    scope: '#7F77DD',
    category: '#378ADD',
    purpose: '#1D9E75',
    custom: '#1D9E75',
  }
  return defaults[type] ?? '#71717a'
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
  const [modalDefaults, setModalDefaults] = useState({ parentId: '', type: 'category' as TagType })

  // Miller columns state
  const [selectedScope, setSelectedScope] = useState<TagNode | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<TagNode | null>(null)
  const [mobileStep, setMobileStep] = useState(0)

  // Build full tree (unfiltered for columns)
  const fullTree = useMemo(() => {
    const filtered = tags.filter((t) => {
      if (!showInactive && !t.isActive) return false
      return true
    })
    return buildTree(filtered)
  }, [tags, showInactive])

  // Search-filtered tree (for flat search results)
  const searchTree = useMemo(() => {
    if (!search) return []
    const filtered = tags.filter((t) => {
      if (!showInactive && !t.isActive) return false
      return t.name.toLowerCase().includes(search.toLowerCase())
    })
    return buildTree(filtered)
  }, [tags, search, showInactive])

  const searchExpanded = useMemo(() => new Set(tags.map((t) => t.id)), [tags])
  const searchFlatList = useMemo(() => flattenTree(searchTree, searchExpanded), [searchTree, searchExpanded])

  // Miller column data
  const scopes = useMemo(() => fullTree.filter((n) => n.type === 'scope'), [fullTree])

  const categories = useMemo(() => {
    if (!selectedScope) return []
    // Show all direct children of the selected scope (categories + purposes)
    return selectedScope.childNodes
  }, [selectedScope])

  const columnTags = useMemo(() => {
    if (!selectedCategory) return []
    return selectedCategory.childNodes
  }, [selectedCategory])

  // Orphan tags: root-level nodes that are NOT scopes (categories/purposes without a parent)
  const orphanTags = useMemo(() => {
    return fullTree.filter((n) => n.type !== 'scope')
  }, [fullTree])

  // Keep selections in sync when data changes
  useMemo(() => {
    if (selectedScope) {
      const found = scopes.find((s) => s.id === selectedScope.id)
      if (!found) {
        setSelectedScope(null)
        setSelectedCategory(null)
      } else if (found !== selectedScope) {
        setSelectedScope(found)
        if (selectedCategory) {
          const catFound = found.childNodes.find((c) => c.id === selectedCategory.id)
          setSelectedCategory(catFound ?? null)
        }
      }
    }
  }, [scopes]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSelectScope(node: TagNode) {
    setSelectedScope(node)
    setSelectedCategory(null)
    setMobileStep(1)
  }

  function handleSelectCategory(node: TagNode) {
    setSelectedCategory(node)
    setMobileStep(2)
  }

  function openCreate(parentId?: string, type?: TagType) {
    setEditingTag(null)
    setModalDefaults({ parentId: parentId || '', type: type || 'category' })
    setShowModal(true)
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

  // ── Column item renderer ──────────────────────────────────
  function ColumnItem({
    node,
    isSelected,
    onSelect,
  }: {
    node: TagNode
    isSelected: boolean
    onSelect: (n: TagNode) => void
  }) {
    const hasChildren = node.childNodes.length > 0
    return (
      <div
        className={`flex items-center gap-2.5 px-4 py-2.5 cursor-pointer transition-colors group
          ${isSelected ? 'bg-energy-500/10' : 'hover:bg-zinc-800/50'}
          ${!node.isActive ? 'opacity-50' : ''}`}
        onClick={() => onSelect(node)}
      >
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: node.color ?? defaultColorForType(node.type) }}
        />
        <span className={`flex-1 text-sm truncate ${isSelected ? 'text-energy-400' : 'text-zinc-200'}`}>
          {node.name}
        </span>
        {!node.isActive && (
          <span className="shrink-0 rounded-full bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-400">
            Inattivo
          </span>
        )}
        {hasChildren && (
          <span className="text-xs text-zinc-500 group-hover:text-zinc-400">{node.childNodes.length}</span>
        )}
        {hasChildren && (
          <ChevronRight className="h-3.5 w-3.5 text-zinc-600 group-hover:text-zinc-400 shrink-0" />
        )}
        <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(node) }}
            className="rounded p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(node) }}
            className="rounded p-1 text-zinc-500 hover:text-red-400 hover:bg-zinc-700"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    )
  }

  // ── Column component ──────────────────────────────────────
  function Column({
    title,
    count,
    items,
    selectedId,
    onSelect,
    placeholder,
    addLabel,
    onAdd,
  }: {
    title: string
    count: number
    items: TagNode[]
    selectedId: string | null
    onSelect: (n: TagNode) => void
    placeholder?: string
    addLabel: string
    onAdd: () => void
  }) {
    return (
      <div className="flex flex-col h-[500px]">
        <div className="px-4 py-3 border-b border-zinc-800">
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            {title}
          </span>
          {count > 0 && (
            <span className="ml-2 text-xs text-zinc-500">({count})</span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {items.length > 0 ? (
            items.map((node) => (
              <ColumnItem
                key={node.id}
                node={node}
                isSelected={node.id === selectedId}
                onSelect={onSelect}
              />
            ))
          ) : placeholder ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-600 text-sm gap-2">
              <ChevronRight className="h-6 w-6 opacity-30" />
              <span>{placeholder}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-zinc-600 text-sm gap-2">
              <TagIcon className="h-6 w-6 opacity-30" />
              <span>Nessun elemento</span>
            </div>
          )}
        </div>
        <button
          onClick={onAdd}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-500 hover:text-energy-400 hover:bg-zinc-800/30 transition-colors border-t border-zinc-800"
        >
          <Plus className="h-3.5 w-3.5" />
          Aggiungi {addLabel}
        </button>
      </div>
    )
  }

  // ── Search flat list item (reused from old tree view) ─────
  function SearchResultItem({ node }: { node: TagNode }) {
    const TypeIcon = typeIcons[node.type] || TagIcon
    return (
      <div
        className={`flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800/30 transition-colors ${
          !node.isActive ? 'opacity-50' : ''
        }`}
      >
        <span
          className="h-3 w-3 rounded-full shrink-0"
          style={{ backgroundColor: node.color || '#6b7280' }}
        />
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
        </div>
        {!node.isActive && (
          <span className="shrink-0 rounded-full bg-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400">
            Inattivo
          </span>
        )}
        <div className="shrink-0 flex items-center gap-0.5">
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
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Tag"
        description={`${scopeCount} ambiti, ${categoryCount} categorie, ${tagCount} tag`}
        actions={
          <button
            className="flex items-center gap-2 rounded-lg bg-energy-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-energy-400 transition-colors"
            onClick={() => openCreate()}
          >
            <Plus className="h-4 w-4" />
            Nuovo Tag
          </button>
        }
      />

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
      </div>

      {/* Content: search results OR miller columns */}
      {search ? (
        /* ── Search results (flat list) ────────────────────── */
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {searchFlatList.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <TagIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nessun tag trovato</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/50">
              {searchFlatList.map((node) => (
                <SearchResultItem key={node.id} node={node} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* ── Miller columns ─────────────────────────────── */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">

            {/* Mobile: breadcrumb navigation */}
            <div className="lg:hidden flex items-center gap-2 px-4 py-3 border-b border-zinc-800 text-sm">
              <button
                onClick={() => {
                  setMobileStep(Math.max(0, mobileStep - 1))
                }}
                className={`text-zinc-400 hover:text-zinc-200 ${mobileStep === 0 ? 'invisible' : ''}`}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-zinc-500">
                {mobileStep === 0 && 'Ambiti'}
                {mobileStep === 1 && selectedScope?.name}
                {mobileStep === 2 && selectedCategory?.name}
              </span>
            </div>

            {/* Mobile: show only current column */}
            <div className="lg:hidden">
              {mobileStep === 0 && (
                <Column
                  title="Ambiti"
                  count={scopes.length}
                  items={scopes}
                  selectedId={selectedScope?.id ?? null}
                  onSelect={handleSelectScope}
                  addLabel="ambito"
                  onAdd={() => openCreate(undefined, 'scope')}
                />
              )}
              {mobileStep === 1 && (
                <Column
                  title="Categorie"
                  count={categories.length}
                  items={categories}
                  selectedId={selectedCategory?.id ?? null}
                  onSelect={handleSelectCategory}
                  placeholder="Seleziona un ambito"
                  addLabel="categoria"
                  onAdd={() => openCreate(selectedScope?.id, 'category')}
                />
              )}
              {mobileStep === 2 && (
                <Column
                  title="Tag"
                  count={columnTags.length}
                  items={columnTags}
                  selectedId={null}
                  onSelect={(node) => navigate(`/transactions?tagId=${node.id}`)}
                  placeholder="Seleziona una categoria"
                  addLabel="tag"
                  onAdd={() => openCreate(selectedCategory?.id, 'purpose')}
                />
              )}
            </div>

            {/* Desktop: all three columns side by side */}
            <div className="hidden lg:grid grid-cols-3 divide-x divide-zinc-800">
              <Column
                title="Ambiti"
                count={scopes.length}
                items={scopes}
                selectedId={selectedScope?.id ?? null}
                onSelect={handleSelectScope}
                addLabel="ambito"
                onAdd={() => openCreate(undefined, 'scope')}
              />
              <Column
                title="Categorie"
                count={categories.length}
                items={categories}
                selectedId={selectedCategory?.id ?? null}
                onSelect={handleSelectCategory}
                placeholder="Seleziona un ambito"
                addLabel="categoria"
                onAdd={() => openCreate(selectedScope?.id, 'category')}
              />
              <Column
                title="Tag"
                count={columnTags.length}
                items={columnTags}
                selectedId={null}
                onSelect={(node) => navigate(`/transactions?tagId=${node.id}`)}
                placeholder="Seleziona una categoria"
                addLabel="tag"
                onAdd={() => openCreate(selectedCategory?.id, 'purpose')}
              />
            </div>
          </div>

          {/* ── Orphan tags ────────────────────────────────── */}
          {orphanTags.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-xs text-zinc-500 mb-3">Tag senza categoria</p>
              <div className="flex flex-wrap gap-2">
                {orphanTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs bg-zinc-800 text-zinc-300 group cursor-pointer hover:bg-zinc-700"
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: tag.color ?? '#71717a' }}
                    />
                    {tag.name}
                    <button
                      onClick={() => openEdit(tag)}
                      className="hidden group-hover:block ml-0.5 text-zinc-500 hover:text-zinc-200"
                    >
                      <Pencil className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

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
              emptyLabel="-- Nessun genitore (root) --"
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
