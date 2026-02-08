import { useState } from 'react'
import {
  Tag,
  FileInput,
  Database,
  Download,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  RefreshCw,
  ChevronRight,
  X,
} from 'lucide-react'
import { TAGS, CONTAINERS } from '@/lib/mockData'
import type { Tag as TagEntity, TagType } from '@/types'

const typeLabels: Record<TagType, string> = {
  category: 'Categoria',
  scope: 'Ambito',
  purpose: 'Finalita\'',
  custom: 'Custom',
}

export function Settings() {
  const [tags, setTags] = useState<TagEntity[]>([...TAGS])
  const [showTagModal, setShowTagModal] = useState(false)
  const [editingTag, setEditingTag] = useState<TagEntity | null>(null)
  const [tagFilter, setTagFilter] = useState<'all' | TagType>('all')

  const filteredTags = tagFilter === 'all' ? tags : tags.filter((t) => t.type === tagFilter)

  const importProfiles = [
    { id: '1', name: 'Intesa Sanpaolo - Conto AV', container: 'Intesa Sanpaolo 2767', fileType: 'CSV', delimiter: ';', encoding: 'ISO-8859-1', dateFormat: 'DD/MM/YYYY' },
    { id: '2', name: 'Revolut - Andrea EUR', container: 'Revolut Andrea', fileType: 'CSV', delimiter: ',', encoding: 'UTF-8', dateFormat: 'YYYY-MM-DD' },
    { id: '3', name: 'Amex Platino AV', container: 'American Express Platino', fileType: 'CSV', delimiter: ',', encoding: 'UTF-8', dateFormat: 'DD/MM/YYYY' },
    { id: '4', name: 'PayPal - Kairos', container: 'PayPal Kairos', fileType: 'CSV', delimiter: ',', encoding: 'UTF-8', dateFormat: 'DD/MM/YYYY' },
    { id: '5', name: 'Interactive Brokers', container: 'Interactive Brokers', fileType: 'CSV', delimiter: ',', encoding: 'UTF-8', dateFormat: 'YYYY-MM-DD' },
    { id: '6', name: 'Satispay', container: 'Satispay', fileType: 'CSV', delimiter: ',', encoding: 'UTF-8', dateFormat: 'YYYY-MM-DD' },
  ]

  function openTagCreate() {
    setEditingTag(null)
    setShowTagModal(true)
  }

  function openTagEdit(tag: TagEntity) {
    setEditingTag(tag)
    setShowTagModal(true)
  }

  function handleDeleteTag(id: string) {
    setTags((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Impostazioni</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Configurazione tag, profili di import, database e esportazione dati
        </p>
      </div>

      {/* Tags management */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-energy-400" />
            <h2 className="text-lg font-semibold text-zinc-100">Gestione Tag</h2>
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">{tags.length}</span>
          </div>
          <button
            className="flex items-center gap-2 rounded-lg bg-energy-500 px-3 py-1.5 text-xs font-medium text-zinc-950 hover:bg-energy-400 transition-colors"
            onClick={openTagCreate}
          >
            <Plus className="h-3 w-3" />
            Nuovo Tag
          </button>
        </div>
        {/* Filter by type */}
        <div className="px-6 py-3 border-b border-zinc-800/50 flex items-center gap-2">
          {(['all', 'category', 'scope', 'purpose', 'custom'] as const).map((type) => (
            <button
              key={type}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                tagFilter === type
                  ? 'bg-energy-500/10 text-energy-400'
                  : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
              }`}
              onClick={() => setTagFilter(type)}
            >
              {type === 'all' ? 'Tutti' : typeLabels[type]}
            </button>
          ))}
        </div>
        <div className="max-h-[400px] overflow-y-auto divide-y divide-zinc-800/50">
          {filteredTags.map((tag) => {
            const parent = tag.parentId ? tags.find((t) => t.id === tag.parentId) : null
            return (
              <div key={tag.id} className="flex items-center gap-4 px-6 py-3 hover:bg-zinc-800/30 transition-colors">
                <div
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: tag.color || '#6b7280' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {parent && (
                      <>
                        <span className="text-xs text-zinc-500">{parent.name}</span>
                        <ChevronRight className="h-3 w-3 text-zinc-600" />
                      </>
                    )}
                    <p className="text-sm font-medium text-zinc-200">{tag.name}</p>
                  </div>
                </div>
                <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                  {typeLabels[tag.type] || tag.type}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                    title="Modifica"
                    onClick={() => openTagEdit(tag)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
                    title="Elimina"
                    onClick={() => handleDeleteTag(tag.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Import profiles */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <FileInput className="h-5 w-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-zinc-100">Profili di Import</h2>
          </div>
          <button className="flex items-center gap-2 rounded-lg bg-energy-500 px-3 py-1.5 text-xs font-medium text-zinc-950 hover:bg-energy-400 transition-colors">
            <Plus className="h-3 w-3" />
            Nuovo Profilo
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left">
                <th className="px-6 py-3 font-medium text-zinc-400">Nome</th>
                <th className="px-6 py-3 font-medium text-zinc-400">Contenitore</th>
                <th className="px-6 py-3 font-medium text-zinc-400">Tipo</th>
                <th className="px-6 py-3 font-medium text-zinc-400">Delimitatore</th>
                <th className="px-6 py-3 font-medium text-zinc-400">Formato Data</th>
                <th className="px-6 py-3 font-medium text-zinc-400">Encoding</th>
                <th className="px-6 py-3 font-medium text-zinc-400 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {importProfiles.map((profile) => (
                <tr key={profile.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-6 py-3 text-zinc-200 font-medium">{profile.name}</td>
                  <td className="px-6 py-3 text-zinc-400">{profile.container}</td>
                  <td className="px-6 py-3">
                    <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                      {profile.fileType}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-zinc-400 font-mono">{profile.delimiter}</td>
                  <td className="px-6 py-3 text-zinc-400 text-xs">{profile.dateFormat}</td>
                  <td className="px-6 py-3 text-zinc-400">{profile.encoding}</td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300" title="Modifica">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-red-400" title="Elimina">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Database connection */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database className="h-5 w-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-zinc-100">Connessione Database</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Host</label>
            <input
              type="text"
              value="ep-small-flower-agda4omk-pooler.c-2.eu-central-1.aws.neon.tech"
              readOnly
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Database</label>
            <input
              type="text"
              value="neondb"
              readOnly
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Provider</label>
            <input
              type="text"
              value="Neon (Postgres)"
              readOnly
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Stato</label>
            <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="text-sm text-emerald-400">Connesso</span>
              <span className="text-xs text-zinc-500 ml-auto">11 subjects, 53 containers, 64 tags, 19 counterparties</span>
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-600">
            <RefreshCw className="h-4 w-4" />
            Testa Connessione
          </button>
        </div>
      </div>

      {/* Export data */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Download className="h-5 w-5 text-amber-400" />
          <h2 className="text-lg font-semibold text-zinc-100">Esporta Dati</h2>
        </div>
        <p className="text-sm text-zinc-400 mb-4">
          Esporta tutti i dati in formato CSV o JSON per backup o analisi esterna.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Transazioni', desc: 'CSV / JSON' },
            { label: 'Contenitori', desc: 'CSV / JSON' },
            { label: 'Budget', desc: 'CSV / JSON' },
            { label: 'Backup Completo', desc: 'JSON (tutti i dati)' },
          ].map((item) => (
            <button key={item.label} className="flex flex-col items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-4 hover:border-zinc-600 transition-colors">
              <Download className="h-5 w-5 text-zinc-400" />
              <span className="text-sm font-medium text-zinc-200">{item.label}</span>
              <span className="text-xs text-zinc-500">{item.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tag create/edit modal */}
      {showTagModal && (
        <TagModal
          tag={editingTag}
          allTags={tags}
          onClose={() => setShowTagModal(false)}
          onSave={(data) => {
            if (editingTag) {
              setTags((prev) =>
                prev.map((t) => (t.id === editingTag.id ? { ...t, ...data } : t)),
              )
            } else {
              const newTag: TagEntity = {
                id: `tag-${Date.now()}`,
                name: data.name,
                type: data.type,
                color: data.color || null,
                icon: data.icon || null,
                parentId: data.parentId || null,
                isActive: true,
                createdAt: new Date().toISOString(),
              }
              setTags((prev) => [...prev, newTag])
            }
            setShowTagModal(false)
          }}
        />
      )}
    </div>
  )
}

function TagModal({
  tag,
  allTags,
  onClose,
  onSave,
}: {
  tag: TagEntity | null
  allTags: TagEntity[]
  onClose: () => void
  onSave: (data: { name: string; type: TagType; color?: string; icon?: string; parentId?: string }) => void
}) {
  const [form, setForm] = useState({
    name: tag?.name || '',
    type: tag?.type || ('category' as TagType),
    color: tag?.color || '#22C55E',
    parentId: tag?.parentId || '',
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-100">
            {tag ? 'Modifica Tag' : 'Nuovo Tag'}
          </h2>
          <button className="rounded-md p-1 text-zinc-400 hover:text-zinc-200" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Nome *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-energy-500 focus:outline-none focus:ring-1 focus:ring-energy-500"
              placeholder="es. Affitto, Personale, VS/Opzionetika..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Tipo</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as TagType })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-energy-500 focus:outline-none"
              >
                <option value="category">Categoria</option>
                <option value="scope">Ambito</option>
                <option value="purpose">Finalita'</option>
                <option value="custom">Custom</option>
              </select>
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
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Tag Genitore (opzionale)</label>
            <select
              value={form.parentId}
              onChange={(e) => setForm({ ...form, parentId: e.target.value })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-energy-500 focus:outline-none"
            >
              <option value="">— Nessuno —</option>
              {allTags
                .filter((t) => t.id !== tag?.id && t.isActive)
                .map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({typeLabels[t.type]})</option>
                ))}
            </select>
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
