import {
  Upload,
  FileText,
  FileSpreadsheet,
  Settings2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  History,
} from 'lucide-react'

// Types reference: ImportProfile, ImportBatch from @/types

// Placeholder import profiles
const mockProfiles = [
  { id: '1', name: 'Intesa Sanpaolo CSV', container: 'Intesa Sanpaolo', fileType: 'csv', delimiter: ';', dateFormat: 'DD/MM/YYYY' },
  { id: '2', name: 'Unicredit XLSX', container: 'Unicredit', fileType: 'xlsx', delimiter: ',', dateFormat: 'DD/MM/YYYY' },
  { id: '3', name: 'Amex PDF', container: 'Amex Platino', fileType: 'pdf', delimiter: '—', dateFormat: 'DD/MM/YYYY' },
  { id: '4', name: 'PayPal CSV', container: 'PayPal', fileType: 'csv', delimiter: ',', dateFormat: 'YYYY-MM-DD' },
]

// Placeholder column mapping preview
const mockColumnMapping = [
  { source: 'Data Operazione', target: 'date', sample: '07/02/2026' },
  { source: 'Data Valuta', target: 'valueDate', sample: '07/02/2026' },
  { source: 'Descrizione', target: 'description', sample: 'Bonifico SEPA' },
  { source: 'Importo (EUR)', target: 'amount', sample: '-142,00' },
  { source: 'Causale', target: 'notes', sample: 'Pagamento bolletta' },
]

// Placeholder import history
const mockImportHistory = [
  { id: '1', filename: 'intesa_gen_2026.csv', profile: 'Intesa Sanpaolo CSV', date: '01/02/2026', total: 45, imported: 42, skipped: 2, duplicates: 1, status: 'completed' as const },
  { id: '2', filename: 'unicredit_gen_2026.xlsx', profile: 'Unicredit XLSX', date: '01/02/2026', total: 38, imported: 38, skipped: 0, duplicates: 0, status: 'completed' as const },
  { id: '3', filename: 'amex_gen_2026.pdf', profile: 'Amex PDF', date: '31/01/2026', total: 22, imported: 20, skipped: 0, duplicates: 2, status: 'completed' as const },
  { id: '4', filename: 'paypal_dic_2025.csv', profile: 'PayPal CSV', date: '05/01/2026', total: 15, imported: 0, skipped: 15, duplicates: 0, status: 'failed' as const },
]

const statusConfig = {
  completed: { icon: CheckCircle2, color: 'text-emerald-400', label: 'Completato' },
  failed: { icon: XCircle, color: 'text-red-400', label: 'Fallito' },
  partial: { icon: AlertTriangle, color: 'text-amber-400', label: 'Parziale' },
  processing: { icon: Clock, color: 'text-blue-400', label: 'In corso' },
}

export function ImportData() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Importa Dati</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Importa transazioni da file CSV, XLSX o PDF dei tuoi estratti conto
        </p>
      </div>

      {/* Upload area + Profile selector */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* File upload */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">Carica File</h2>
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-800/30 px-6 py-12 text-center hover:border-energy-500/50 hover:bg-zinc-800/50 transition-colors cursor-pointer">
            <Upload className="h-10 w-10 text-zinc-500 mb-3" />
            <p className="text-sm font-medium text-zinc-300">
              Trascina il file qui o clicca per selezionare
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Formati supportati: CSV, XLSX, PDF (max 10MB)
            </p>
            <div className="mt-4 flex items-center gap-3">
              <span className="flex items-center gap-1 rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-400">
                <FileSpreadsheet className="h-3 w-3" /> CSV
              </span>
              <span className="flex items-center gap-1 rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-400">
                <FileSpreadsheet className="h-3 w-3" /> XLSX
              </span>
              <span className="flex items-center gap-1 rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-400">
                <FileText className="h-3 w-3" /> PDF
              </span>
            </div>
          </div>
        </div>

        {/* Profile selector */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-zinc-100">Profilo di Import</h2>
            <button className="flex items-center gap-1 text-xs text-energy-400 hover:text-energy-300">
              <Settings2 className="h-3 w-3" />
              Gestisci profili
            </button>
          </div>
          <div className="space-y-2">
            {mockProfiles.map((profile) => (
              <button
                key={profile.id}
                className="flex w-full items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-left hover:border-zinc-600 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-700">
                    {profile.fileType === 'pdf' ? (
                      <FileText className="h-4 w-4 text-zinc-400" />
                    ) : (
                      <FileSpreadsheet className="h-4 w-4 text-zinc-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{profile.name}</p>
                    <p className="text-xs text-zinc-500">
                      {profile.container} | {profile.fileType.toUpperCase()} | {profile.dateFormat}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-zinc-500" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Column mapping preview */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-100">Anteprima Mappatura Colonne</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Verifica la corrispondenza tra le colonne del file e i campi del sistema
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left">
                <th className="px-6 py-3 font-medium text-zinc-400">Colonna Sorgente</th>
                <th className="px-6 py-3 font-medium text-zinc-400 text-center">
                  <ArrowRight className="inline h-4 w-4" />
                </th>
                <th className="px-6 py-3 font-medium text-zinc-400">Campo Destinazione</th>
                <th className="px-6 py-3 font-medium text-zinc-400">Esempio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {mockColumnMapping.map((col) => (
                <tr key={col.source} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-6 py-3 text-zinc-300 font-mono text-xs">{col.source}</td>
                  <td className="px-6 py-3 text-center">
                    <ArrowRight className="inline h-3 w-3 text-zinc-600" />
                  </td>
                  <td className="px-6 py-3">
                    <span className="rounded-md bg-energy-500/10 px-2 py-1 text-xs font-medium text-energy-400">
                      {col.target}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-zinc-500 font-mono text-xs">{col.sample}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-zinc-800 px-6 py-4">
          <button className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-600">
            Annulla
          </button>
          <button className="rounded-lg bg-energy-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-energy-400 transition-colors">
            Avvia Importazione
          </button>
        </div>
      </div>

      {/* Import history */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-zinc-800">
          <History className="h-5 w-5 text-zinc-400" />
          <h2 className="text-lg font-semibold text-zinc-100">Cronologia Import</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left">
                <th className="px-6 py-3 font-medium text-zinc-400">File</th>
                <th className="px-6 py-3 font-medium text-zinc-400">Profilo</th>
                <th className="px-6 py-3 font-medium text-zinc-400">Data</th>
                <th className="px-6 py-3 font-medium text-zinc-400 text-center">Totali</th>
                <th className="px-6 py-3 font-medium text-zinc-400 text-center">Importate</th>
                <th className="px-6 py-3 font-medium text-zinc-400 text-center">Saltate</th>
                <th className="px-6 py-3 font-medium text-zinc-400 text-center">Duplicati</th>
                <th className="px-6 py-3 font-medium text-zinc-400">Stato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {mockImportHistory.map((batch) => {
                const StatusIcon = statusConfig[batch.status].icon
                return (
                  <tr key={batch.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-3 text-zinc-200 font-mono text-xs">{batch.filename}</td>
                    <td className="px-6 py-3 text-zinc-400">{batch.profile}</td>
                    <td className="px-6 py-3 text-zinc-400">{batch.date}</td>
                    <td className="px-6 py-3 text-zinc-300 text-center">{batch.total}</td>
                    <td className="px-6 py-3 text-emerald-400 text-center">{batch.imported}</td>
                    <td className="px-6 py-3 text-amber-400 text-center">{batch.skipped}</td>
                    <td className="px-6 py-3 text-zinc-500 text-center">{batch.duplicates}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center gap-1 ${statusConfig[batch.status].color}`}>
                        <StatusIcon className="h-3.5 w-3.5" />
                        <span className="text-xs">{statusConfig[batch.status].label}</span>
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
