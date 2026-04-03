import { useState } from 'react'
import {
  FileInput,
  Download,
  Plus,
  Pencil,
  Trash2,
  Database,
  Loader2,
} from 'lucide-react'
import {
  useImportProfiles,
  useCreateImportProfile,
  useDeleteImportProfile,
  useContainers,
} from '@/lib/hooks'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import type { ImportProfile } from '@/types'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

export function Settings() {
  const { data: importProfiles = [], isLoading: profilesLoading } = useImportProfiles()
  const { data: containers = [] } = useContainers()
  const deleteProfile = useDeleteImportProfile()
  const createProfile = useCreateImportProfile()

  const [seedLoading, setSeedLoading] = useState(false)
  const [seedResult, setSeedResult] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  async function handleSeed() {
    if (!confirm('Questo importera le categorie, tag e controparti dai dati Notion. Continuare?')) return
    setSeedLoading(true)
    setSeedResult(null)
    try {
      const resp = await fetch(`${API_BASE}/seed`, { method: 'POST' })
      const json = await resp.json()
      const data = json.data || json
      setSeedResult(data.results?.join('\n') || 'Completato!')
    } catch (err) {
      setSeedResult(`Errore: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setSeedLoading(false)
    }
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Eliminare il profilo "${name}"?`)) return
    deleteProfile.mutate(id)
  }

  function getContainerName(containerId: string): string {
    return containers.find((c) => c.id === containerId)?.name ?? containerId
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Impostazioni</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Profili di import e esportazione dati
        </p>
      </div>

      {/* Import profiles */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <FileInput className="h-5 w-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-zinc-100">Profili di Import</h2>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-lg bg-energy-500 px-3 py-1.5 text-xs font-medium text-zinc-950 hover:bg-energy-400 transition-colors"
          >
            <Plus className="h-3 w-3" />
            Nuovo Profilo
          </button>
        </div>

        {profilesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-energy-400" />
          </div>
        ) : importProfiles.length === 0 ? (
          <EmptyState
            icon={FileInput}
            title="Nessun profilo di import"
            description="Crea il tuo primo profilo per importare transazioni da CSV"
            action={{ label: 'Nuovo Profilo', onClick: () => setShowCreateModal(true) }}
          />
        ) : (
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
                {importProfiles.map((profile) => {
                  const profileAny = profile as unknown as Record<string, unknown>
                  const containerName = profileAny.containers
                    ? (profileAny.containers as { name: string })?.name
                    : getContainerName(profile.containerId)

                  return (
                    <tr key={profile.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-6 py-3 text-zinc-200 font-medium">{profile.name}</td>
                      <td className="px-6 py-3 text-zinc-400">{containerName}</td>
                      <td className="px-6 py-3">
                        <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300 uppercase">
                          {profile.fileType}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-zinc-400 font-mono">{profile.delimiter}</td>
                      <td className="px-6 py-3 text-zinc-400 text-xs">{profile.dateFormat}</td>
                      <td className="px-6 py-3 text-zinc-400">{profile.encoding}</td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
                            title="Elimina"
                            onClick={() => handleDelete(profile.id, profile.name)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Seed from Notion */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database className="h-5 w-5 text-energy-400" />
          <h2 className="text-lg font-semibold text-zinc-100">Importa Dati Notion</h2>
        </div>
        <p className="text-sm text-zinc-400 mb-4">
          Importa categorie (Aree / Categorie), attivita e controparti dai dati Notion esportati.
          I tag e controparti non utilizzati verranno rimossi prima dell'importazione.
        </p>
        <button
          onClick={handleSeed}
          disabled={seedLoading}
          className="flex items-center gap-2 rounded-lg bg-energy-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-energy-400 transition-colors disabled:opacity-50"
        >
          {seedLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
          {seedLoading ? 'Importazione in corso...' : 'Importa Categorie e Controparti'}
        </button>
        {seedResult && (
          <pre className="mt-4 rounded-lg bg-zinc-800 p-4 text-xs text-zinc-300 whitespace-pre-wrap">{seedResult}</pre>
        )}
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

      {/* Create profile modal */}
      {showCreateModal && (
        <CreateProfileModal
          containers={containers}
          onClose={() => setShowCreateModal(false)}
          onSave={(data) => {
            createProfile.mutate(data as Partial<ImportProfile>)
            setShowCreateModal(false)
          }}
        />
      )}
    </div>
  )
}

// ── Create Profile Modal ───────────────────────────────────

function CreateProfileModal({
  containers,
  onClose,
  onSave,
}: {
  containers: Array<{ id: string; name: string; isActive: boolean }>
  onClose: () => void
  onSave: (data: {
    name: string
    containerId: string
    fileType: string
    delimiter: string
    dateFormat: string
    encoding: string
  }) => void
}) {
  const [form, setForm] = useState({
    name: '',
    containerId: '',
    fileType: 'csv',
    delimiter: ',',
    dateFormat: 'DD/MM/YYYY',
    encoding: 'UTF-8',
  })

  function handleSave() {
    if (!form.name || !form.containerId) return
    onSave(form)
  }

  return (
    <Modal open onClose={onClose} title="Nuovo Profilo di Import" size="lg">
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Nome profilo *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Es. Intesa Sanpaolo - Conto AV"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-energy-500 focus:outline-none focus:ring-1 focus:ring-energy-500"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Contenitore *</label>
          <select
            value={form.containerId}
            onChange={(e) => setForm({ ...form, containerId: e.target.value })}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-energy-500 focus:outline-none"
          >
            <option value="">Seleziona</option>
            {containers.filter((c) => c.isActive).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Tipo file</label>
            <select
              value={form.fileType}
              onChange={(e) => setForm({ ...form, fileType: e.target.value })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-energy-500 focus:outline-none"
            >
              <option value="csv">CSV</option>
              <option value="xlsx">XLSX</option>
              <option value="pdf">PDF</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Delimitatore</label>
            <select
              value={form.delimiter}
              onChange={(e) => setForm({ ...form, delimiter: e.target.value })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-energy-500 focus:outline-none"
            >
              <option value=",">Virgola (,)</option>
              <option value=";">Punto e virgola (;)</option>
              <option value="\t">Tab</option>
              <option value="|">Pipe (|)</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Formato data</label>
            <select
              value={form.dateFormat}
              onChange={(e) => setForm({ ...form, dateFormat: e.target.value })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-energy-500 focus:outline-none"
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              <option value="DD-MM-YYYY">DD-MM-YYYY</option>
              <option value="DD.MM.YYYY">DD.MM.YYYY</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Encoding</label>
            <select
              value={form.encoding}
              onChange={(e) => setForm({ ...form, encoding: e.target.value })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-energy-500 focus:outline-none"
            >
              <option value="UTF-8">UTF-8</option>
              <option value="ISO-8859-1">ISO-8859-1 (Latin1)</option>
              <option value="Windows-1252">Windows-1252</option>
            </select>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-3 mt-6">
        <button className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700" onClick={onClose}>
          Annulla
        </button>
        <button
          className="rounded-lg bg-energy-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-energy-400 disabled:opacity-50"
          onClick={handleSave}
          disabled={!form.name || !form.containerId}
        >
          Crea Profilo
        </button>
      </div>
    </Modal>
  )
}
