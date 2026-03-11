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

const API_BASE = import.meta.env.VITE_API_URL || '/api'

export function Settings() {
  const [seedLoading, setSeedLoading] = useState(false)
  const [seedResult, setSeedResult] = useState<string | null>(null)

  async function handleSeed() {
    if (!confirm('Questo importerà le categorie, tag e controparti dai dati Notion. Continuare?')) return
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
  const importProfiles = [
    { id: '1', name: 'Intesa Sanpaolo - Conto AV', container: 'Intesa Sanpaolo 2767', fileType: 'CSV', delimiter: ';', encoding: 'ISO-8859-1', dateFormat: 'DD/MM/YYYY' },
    { id: '2', name: 'Revolut - Andrea EUR', container: 'Revolut Andrea', fileType: 'CSV', delimiter: ',', encoding: 'UTF-8', dateFormat: 'YYYY-MM-DD' },
    { id: '3', name: 'Amex Platino AV', container: 'American Express Platino', fileType: 'CSV', delimiter: ',', encoding: 'UTF-8', dateFormat: 'DD/MM/YYYY' },
    { id: '4', name: 'PayPal - Kairos', container: 'PayPal Kairos', fileType: 'CSV', delimiter: ',', encoding: 'UTF-8', dateFormat: 'DD/MM/YYYY' },
    { id: '5', name: 'Interactive Brokers', container: 'Interactive Brokers', fileType: 'CSV', delimiter: ',', encoding: 'UTF-8', dateFormat: 'YYYY-MM-DD' },
    { id: '6', name: 'Satispay', container: 'Satispay', fileType: 'CSV', delimiter: ',', encoding: 'UTF-8', dateFormat: 'YYYY-MM-DD' },
  ]

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

      {/* Seed from Notion */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database className="h-5 w-5 text-energy-400" />
          <h2 className="text-lg font-semibold text-zinc-100">Importa Dati Notion</h2>
        </div>
        <p className="text-sm text-zinc-400 mb-4">
          Importa categorie (Aree → Categorie), attività e controparti dai dati Notion esportati.
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
    </div>
  )
}
