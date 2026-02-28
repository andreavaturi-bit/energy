import { useState, useRef, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Check,
  X,
  Loader2,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import {
  PRESET_PROFILES,
  detectProfile,
  detectDelimiter,
  processCSVImport,
  convertToTransactions,
  parseCSVFile,
} from '@/lib/csvEngine'
import type { ImportPreview, ParsedRow } from '@/lib/csvEngine'
import { useContainers, useSubjects } from '@/lib/hooks'
import { transactionsApi } from '@/lib/api'
import { useQueryClient } from '@tanstack/react-query'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import type { ImportProfile } from '@/types'

// ============================================================
// TYPES
// ============================================================

type WizardStep = 1 | 2 | 3 | 4

type ProfileSelection =
  | { type: 'preset'; index: number }
  | { type: 'custom' }

interface CustomProfile {
  delimiter: string
  dateFormat: string
  decimalSeparator: string
  thousandsSeparator: string
  skipRows: number
  amountInverted: boolean
  separateAmountColumns: boolean
}

interface ColumnMapping {
  date: string
  description: string
  amount: string
  amountIn: string
  amountOut: string
  currency: string
  valueDate: string
  externalId: string
  notes: string
}

interface ImportResultData {
  imported: number
  duplicates: number
  errors: number
  errorMessages?: string[]
}

// ============================================================
// CONSTANTS
// ============================================================

const STEP_LABELS = [
  { num: 1, label: 'Carica File' },
  { num: 2, label: 'Profilo' },
  { num: 3, label: 'Anteprima' },
  { num: 4, label: 'Risultato' },
]

const DELIMITER_OPTIONS = [
  { value: ',', label: 'Virgola (,)' },
  { value: ';', label: 'Punto e virgola (;)' },
  { value: '\t', label: 'Tab' },
]

const DATE_FORMAT_OPTIONS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
]

const DECIMAL_OPTIONS = [
  { value: ',', label: 'Virgola (,)' },
  { value: '.', label: 'Punto (.)' },
]

const THOUSANDS_OPTIONS = [
  { value: '.', label: 'Punto (.)' },
  { value: ',', label: 'Virgola (,)' },
  { value: '', label: 'Nessuno' },
]

const MAPPING_FIELDS_SINGLE: { key: keyof ColumnMapping; label: string; required: boolean }[] = [
  { key: 'date', label: 'Data', required: true },
  { key: 'description', label: 'Descrizione', required: true },
  { key: 'amount', label: 'Importo', required: true },
  { key: 'currency', label: 'Valuta', required: false },
  { key: 'valueDate', label: 'Data Valuta', required: false },
  { key: 'externalId', label: 'ID Esterno', required: false },
  { key: 'notes', label: 'Note', required: false },
]

const MAPPING_FIELDS_SPLIT: { key: keyof ColumnMapping; label: string; required: boolean }[] = [
  { key: 'date', label: 'Data', required: true },
  { key: 'description', label: 'Descrizione', required: true },
  { key: 'amountIn', label: 'Accrediti (Entrate)', required: true },
  { key: 'amountOut', label: 'Addebiti (Uscite)', required: true },
  { key: 'currency', label: 'Valuta', required: false },
  { key: 'valueDate', label: 'Data Valuta', required: false },
  { key: 'externalId', label: 'ID Esterno', required: false },
  { key: 'notes', label: 'Note', required: false },
]

// ============================================================
// HELPER: group containers by subject
// ============================================================

function useGroupedContainers() {
  const { data: allContainers = [] } = useContainers()
  const { data: allSubjects = [] } = useSubjects()

  return useMemo(() => {
    type ContainerItem = (typeof allContainers)[number]
    const groups: { subject: { id: string; name: string }; containers: ContainerItem[] }[] = []
    const subjectMap = new Map<string, ContainerItem[]>()

    for (const c of allContainers) {
      if (!c.isActive) continue
      const list = subjectMap.get(c.subjectId) || []
      list.push(c)
      subjectMap.set(c.subjectId, list)
    }

    for (const [subjectId, containers] of subjectMap) {
      const subject = allSubjects.find((s) => s.id === subjectId)
      groups.push({
        subject: { id: subjectId, name: subject?.name || subjectId },
        containers: containers.sort((a, b) => a.sortOrder - b.sortOrder),
      })
    }

    // Sort groups by subject order
    const subjectOrder = allSubjects.map(s => s.id)
    groups.sort((a, b) => subjectOrder.indexOf(a.subject.id) - subjectOrder.indexOf(b.subject.id))

    return groups
  }, [allContainers, allSubjects])
}

// ============================================================
// STEP INDICATOR
// ============================================================

function StepIndicator({ currentStep }: { currentStep: WizardStep }) {
  return (
    <div className="flex items-center justify-center gap-1">
      {STEP_LABELS.map(({ num, label }, idx) => {
        const isActive = num === currentStep
        const isCompleted = num < currentStep
        return (
          <div key={num} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors',
                  isActive && 'bg-energy-500 text-zinc-950',
                  isCompleted && 'bg-energy-500/20 text-energy-400',
                  !isActive && !isCompleted && 'bg-zinc-800 text-zinc-500',
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : num}
              </div>
              <span
                className={cn(
                  'text-sm font-medium hidden sm:inline',
                  isActive && 'text-zinc-100',
                  isCompleted && 'text-energy-400',
                  !isActive && !isCompleted && 'text-zinc-500',
                )}
              >
                {label}
              </span>
            </div>
            {idx < STEP_LABELS.length - 1 && (
              <ChevronRight className="mx-2 h-4 w-4 text-zinc-600" />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ============================================================
// FORMAT FILE SIZE
// ============================================================

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function ImportData() {
  // --- Wizard state ---
  const [step, setStep] = useState<WizardStep>(1)

  // --- Step 1 state ---
  const [file, setFile] = useState<File | null>(null)
  const [containerId, setContainerId] = useState<string>('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // --- Step 2 state ---
  const [detectedColumns, setDetectedColumns] = useState<string[]>([])
  const [profileSelection, setProfileSelection] = useState<ProfileSelection | null>(null)
  const [autoDetectedProfile, setAutoDetectedProfile] = useState<string | null>(null)
  const [customProfile, setCustomProfile] = useState<CustomProfile>({
    delimiter: ';',
    dateFormat: 'DD/MM/YYYY',
    decimalSeparator: ',',
    thousandsSeparator: '.',
    skipRows: 0,
    amountInverted: false,
    separateAmountColumns: false,
  })
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    date: '',
    description: '',
    amount: '',
    amountIn: '',
    amountOut: '',
    currency: '',
    valueDate: '',
    externalId: '',
    notes: '',
  })

  // --- Step 3 state ---
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // --- Step 4 state ---
  const [importResult, setImportResult] = useState<ImportResultData | null>(null)

  // --- Grouped containers ---
  const groupedContainers = useGroupedContainers()

  // ============================================================
  // FILE HANDLING
  // ============================================================

  const handleFile = useCallback((f: File) => {
    if (!f.name.toLowerCase().endsWith('.csv')) return
    setFile(f)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const f = e.dataTransfer.files[0]
      if (f) handleFile(f)
    },
    [handleFile],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]
      if (f) handleFile(f)
    },
    [handleFile],
  )

  // ============================================================
  // STEP TRANSITIONS
  // ============================================================

  /** Step 1 -> 2: read file header to detect columns */
  const goToStep2 = useCallback(async () => {
    if (!file) return

    // Read file text for delimiter detection & column extraction
    const text = await file.text()
    const delimiter = detectDelimiter(text)

    const { columns } = await parseCSVFile(file, delimiter, 'UTF-8', 0)
    setDetectedColumns(columns)

    // Auto-detect profile
    const detected = detectProfile(columns)
    if (detected) {
      setAutoDetectedProfile(detected.name)
      const idx = PRESET_PROFILES.findIndex(p => p.name === detected.name)
      setProfileSelection({ type: 'preset', index: idx })
      // Fill column mapping from detected profile
      const mapping = detected.columnMapping as Record<string, string>
      setColumnMapping({
        date: mapping.date || '',
        description: mapping.description || '',
        amount: mapping.amount || '',
        amountIn: detected.incomeColumn || '',
        amountOut: detected.expenseColumn || '',
        currency: mapping.currency || '',
        valueDate: mapping.valueDate || '',
        externalId: mapping.externalId || '',
        notes: mapping.notes || '',
      })
      // Set custom profile defaults from detected
      setCustomProfile({
        delimiter: detected.delimiter,
        dateFormat: detected.dateFormat,
        decimalSeparator: detected.decimalSeparator,
        thousandsSeparator: detected.thousandsSeparator,
        skipRows: detected.skipRows,
        amountInverted: detected.amountInverted,
        separateAmountColumns: detected.separateAmountColumns,
      })
    } else {
      setAutoDetectedProfile(null)
      setProfileSelection(null)
      setColumnMapping({
        date: '',
        description: '',
        amount: '',
        amountIn: '',
        amountOut: '',
        currency: '',
        valueDate: '',
        externalId: '',
        notes: '',
      })
      setCustomProfile({
        delimiter,
        dateFormat: 'DD/MM/YYYY',
        decimalSeparator: ',',
        thousandsSeparator: '.',
        skipRows: 0,
        amountInverted: false,
        separateAmountColumns: false,
      })
    }

    setStep(2)
  }, [file])

  /** Select a preset profile and fill column mapping */
  const selectPresetProfile = useCallback(
    (index: number) => {
      setProfileSelection({ type: 'preset', index })
      const profile = PRESET_PROFILES[index]
      const mapping = profile.columnMapping as Record<string, string>
      setColumnMapping({
        date: mapping.date || '',
        description: mapping.description || '',
        amount: mapping.amount || '',
        amountIn: profile.incomeColumn || '',
        amountOut: profile.expenseColumn || '',
        currency: mapping.currency || '',
        valueDate: mapping.valueDate || '',
        externalId: mapping.externalId || '',
        notes: mapping.notes || '',
      })
      setCustomProfile({
        delimiter: profile.delimiter,
        dateFormat: profile.dateFormat,
        decimalSeparator: profile.decimalSeparator,
        thousandsSeparator: profile.thousandsSeparator,
        skipRows: profile.skipRows,
        amountInverted: profile.amountInverted,
        separateAmountColumns: profile.separateAmountColumns,
      })
    },
    [],
  )

  /** Build the effective ImportProfile from current selection */
  const buildEffectiveProfile = useCallback((): Omit<ImportProfile, 'id' | 'containerId' | 'createdAt' | 'updatedAt'> => {
    const base =
      profileSelection?.type === 'preset'
        ? PRESET_PROFILES[profileSelection.index]
        : null

    const src = profileSelection?.type === 'custom' ? customProfile : (base ?? customProfile)

    const isSplit = src.separateAmountColumns

    return {
      name: base?.name || 'Personalizzato',
      fileType: 'csv',
      delimiter: src.delimiter,
      dateFormat: src.dateFormat,
      decimalSeparator: src.decimalSeparator,
      thousandsSeparator: src.thousandsSeparator,
      encoding: 'UTF-8',
      skipRows: src.skipRows,
      columnMapping: {
        date: columnMapping.date,
        description: columnMapping.description,
        ...(!isSplit ? { amount: columnMapping.amount } : {}),
        ...(columnMapping.currency ? { currency: columnMapping.currency } : {}),
        ...(columnMapping.valueDate ? { valueDate: columnMapping.valueDate } : {}),
        ...(columnMapping.externalId ? { externalId: columnMapping.externalId } : {}),
        ...(columnMapping.notes ? { notes: columnMapping.notes } : {}),
      },
      amountInverted: src.amountInverted,
      separateAmountColumns: isSplit,
      ...(isSplit ? { incomeColumn: columnMapping.amountIn, expenseColumn: columnMapping.amountOut } : {}),
      dedupColumns: isSplit
        ? [columnMapping.date, columnMapping.description, columnMapping.amountIn, columnMapping.amountOut].filter(Boolean)
        : [columnMapping.date, columnMapping.description, columnMapping.amount].filter(Boolean),
    }
  }, [profileSelection, customProfile, columnMapping])

  /** Step 2 -> 3: process import */
  const goToStep3 = useCallback(async () => {
    if (!file) return
    setIsProcessing(true)
    try {
      const profile = buildEffectiveProfile()
      const result = await processCSVImport(file, profile)
      setPreview(result)
      setStep(3)
    } catch (err) {
      console.error('Import processing failed:', err)
    } finally {
      setIsProcessing(false)
    }
  }, [file, buildEffectiveProfile])

  // --- Import in progress flag ---
  const [isImporting, setIsImporting] = useState(false)
  const queryClient = useQueryClient()

  /** Step 3 -> 4: perform import */
  const performImport = useCallback(async () => {
    if (!preview || isImporting) return

    const readyRows = preview.parsedRows.filter(r => r.status === 'ready')
    const transactions = convertToTransactions(readyRows, containerId, 'csv_import')

    if (transactions.length === 0) return

    setIsImporting(true)
    try {
      const result = await transactionsApi.batchCreate(transactions)

      // Invalidate caches so transaction list and stats refresh
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })

      setImportResult({
        imported: result.inserted,
        duplicates: preview.duplicateCount,
        errors: result.failed + preview.errorCount,
        errorMessages: result.errors,
      })
      setStep(4)
    } catch (err) {
      console.error('Import failed:', err)
      const message = err instanceof Error ? err.message : 'Errore sconosciuto'
      setImportResult({
        imported: 0,
        duplicates: preview.duplicateCount,
        errors: preview.readyCount + preview.errorCount,
        errorMessages: [message],
      })
      setStep(4)
    } finally {
      setIsImporting(false)
    }
  }, [preview, containerId, isImporting, queryClient])

  /** Reset wizard */
  const resetWizard = useCallback(() => {
    setStep(1)
    setFile(null)
    setContainerId('')
    setDetectedColumns([])
    setProfileSelection(null)
    setAutoDetectedProfile(null)
    setPreview(null)
    setImportResult(null)
    setColumnMapping({
      date: '',
      description: '',
      amount: '',
      amountIn: '',
      amountOut: '',
      currency: '',
      valueDate: '',
      externalId: '',
      notes: '',
    })
    setCustomProfile(p => ({ ...p, separateAmountColumns: false }))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  // ============================================================
  // VALIDATION
  // ============================================================

  const step1Valid = file !== null && containerId !== ''
  const amountValid = customProfile.separateAmountColumns
    ? columnMapping.amountIn !== '' && columnMapping.amountOut !== ''
    : columnMapping.amount !== ''
  const step2Valid =
    profileSelection !== null &&
    columnMapping.date !== '' &&
    columnMapping.description !== '' &&
    amountValid

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Importa Dati</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Importa transazioni da file CSV nel contenitore selezionato
        </p>
      </div>

      {/* Step indicator */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-6 py-4">
        <StepIndicator currentStep={step} />
      </div>

      {/* ============================== STEP 1 ============================== */}
      {step === 1 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* File upload */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="mb-4 text-lg font-semibold text-zinc-100">Carica File CSV</h2>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileInput}
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-16 text-center transition-colors',
                isDragging
                  ? 'border-energy-500 bg-energy-500/5'
                  : file
                    ? 'border-energy-500/50 bg-energy-500/5'
                    : 'border-zinc-700 bg-zinc-800/30 hover:border-zinc-600 hover:bg-zinc-800/50',
              )}
            >
              {file ? (
                <>
                  <FileSpreadsheet className="mb-3 h-10 w-10 text-energy-400" />
                  <p className="text-sm font-medium text-zinc-200">{file.name}</p>
                  <p className="mt-1 text-xs text-zinc-400">{formatFileSize(file.size)}</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setFile(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    className="mt-3 text-xs text-zinc-500 underline hover:text-zinc-300"
                  >
                    Rimuovi file
                  </button>
                </>
              ) : (
                <>
                  <Upload className="mb-3 h-10 w-10 text-zinc-500" />
                  <p className="text-sm font-medium text-zinc-300">
                    Trascina il file qui o clicca per selezionare
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">Formato supportato: CSV</p>
                </>
              )}
            </div>
          </div>

          {/* Container selector */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="mb-4 text-lg font-semibold text-zinc-100">
              Seleziona Contenitore
            </h2>
            <p className="mb-3 text-xs text-zinc-500">
              Le transazioni importate verranno associate a questo contenitore
            </p>
            <select
              value={containerId}
              onChange={(e) => setContainerId(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-200 focus:border-energy-500 focus:outline-none focus:ring-1 focus:ring-energy-500 [color-scheme:dark]"
            >
              <option value="">-- Seleziona un contenitore --</option>
              {groupedContainers.map((group) => (
                <optgroup key={group.subject.id} label={group.subject.name}>
                  {group.containers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.currency})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>

            {containerId && (
              <div className="mt-4 rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-3">
                {(() => {
                  const container = groupedContainers.flatMap(g => g.containers).find(c => c.id === containerId)
                  if (!container) return null
                  const subject = groupedContainers.find(g => g.containers.some(c => c.id === containerId))?.subject
                  return (
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${container.color}20` }}
                      >
                        <FileSpreadsheet className="h-4 w-4" style={{ color: container.color || '#888' }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-200">{container.name}</p>
                        <p className="text-xs text-zinc-500">
                          {subject?.name} &middot; {container.provider || container.type} &middot; {container.currency}
                        </p>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="col-span-full flex justify-end">
            <button
              disabled={!step1Valid}
              onClick={goToStep2}
              className={cn(
                'flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium transition-colors',
                step1Valid
                  ? 'bg-energy-500 text-zinc-950 hover:bg-energy-400'
                  : 'cursor-not-allowed bg-zinc-800 text-zinc-600',
              )}
            >
              Avanti
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ============================== STEP 2 ============================== */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Detected columns */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="mb-3 text-lg font-semibold text-zinc-100">Colonne Rilevate</h2>
            <div className="flex flex-wrap gap-2">
              {detectedColumns.map((col) => (
                <Badge key={col} variant="outline" size="md">
                  {col}
                </Badge>
              ))}
            </div>
          </div>

          {/* Auto-detect message */}
          <div
            className={cn(
              'rounded-xl border px-6 py-4',
              autoDetectedProfile
                ? 'border-energy-500/30 bg-energy-500/5'
                : 'border-amber-500/30 bg-amber-500/5',
            )}
          >
            {autoDetectedProfile ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-energy-400" />
                <p className="text-sm text-zinc-200">
                  Profilo rilevato automaticamente:{' '}
                  <span className="font-semibold text-energy-400">{autoDetectedProfile}</span>
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                <p className="text-sm text-zinc-200">
                  Nessun profilo rilevato automaticamente. Seleziona un profilo manualmente.
                </p>
              </div>
            )}
          </div>

          {/* Profile list */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="mb-4 text-lg font-semibold text-zinc-100">Profilo di Importazione</h2>
            <div className="space-y-2">
              {PRESET_PROFILES.map((profile, idx) => {
                const isSelected =
                  profileSelection?.type === 'preset' && profileSelection.index === idx
                return (
                  <button
                    key={profile.name}
                    onClick={() => selectPresetProfile(idx)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors',
                      isSelected
                        ? 'border-energy-500 bg-energy-500/10'
                        : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'flex h-5 w-5 items-center justify-center rounded-full border-2',
                          isSelected
                            ? 'border-energy-500 bg-energy-500'
                            : 'border-zinc-600 bg-transparent',
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3 text-zinc-950" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-200">{profile.name}</p>
                        <p className="text-xs text-zinc-500">
                          Delimitatore: <span className="text-zinc-400">{profile.delimiter === '\t' ? 'Tab' : `"${profile.delimiter}"`}</span>
                          {' '}&middot; Data: <span className="text-zinc-400">{profile.dateFormat}</span>
                          {' '}&middot; Decimale: <span className="text-zinc-400">{profile.decimalSeparator}</span>
                        </p>
                      </div>
                    </div>
                    {isSelected && <Badge variant="success" size="sm">Selezionato</Badge>}
                  </button>
                )
              })}

              {/* Custom profile option */}
              <button
                onClick={() => setProfileSelection({ type: 'custom' })}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors',
                  profileSelection?.type === 'custom'
                    ? 'border-energy-500 bg-energy-500/10'
                    : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600',
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-5 w-5 items-center justify-center rounded-full border-2',
                      profileSelection?.type === 'custom'
                        ? 'border-energy-500 bg-energy-500'
                        : 'border-zinc-600 bg-transparent',
                    )}
                  >
                    {profileSelection?.type === 'custom' && (
                      <Check className="h-3 w-3 text-zinc-950" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">Personalizzato</p>
                    <p className="text-xs text-zinc-500">Configura manualmente tutti i parametri</p>
                  </div>
                </div>
                {profileSelection?.type === 'custom' && (
                  <Badge variant="success" size="sm">Selezionato</Badge>
                )}
              </button>
            </div>
          </div>

          {/* Custom profile settings */}
          {profileSelection?.type === 'custom' && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="mb-4 text-lg font-semibold text-zinc-100">Impostazioni Personalizzate</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Delimiter */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-400">Delimitatore</label>
                  <select
                    value={customProfile.delimiter}
                    onChange={(e) =>
                      setCustomProfile((p) => ({ ...p, delimiter: e.target.value }))
                    }
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-energy-500 focus:outline-none [color-scheme:dark]"
                  >
                    {DELIMITER_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date format */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-400">Formato Data</label>
                  <select
                    value={customProfile.dateFormat}
                    onChange={(e) =>
                      setCustomProfile((p) => ({ ...p, dateFormat: e.target.value }))
                    }
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-energy-500 focus:outline-none [color-scheme:dark]"
                  >
                    {DATE_FORMAT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Decimal separator */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-400">
                    Separatore Decimale
                  </label>
                  <select
                    value={customProfile.decimalSeparator}
                    onChange={(e) =>
                      setCustomProfile((p) => ({ ...p, decimalSeparator: e.target.value }))
                    }
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-energy-500 focus:outline-none [color-scheme:dark]"
                  >
                    {DECIMAL_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Thousands separator */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-400">
                    Separatore Migliaia
                  </label>
                  <select
                    value={customProfile.thousandsSeparator}
                    onChange={(e) =>
                      setCustomProfile((p) => ({ ...p, thousandsSeparator: e.target.value }))
                    }
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-energy-500 focus:outline-none [color-scheme:dark]"
                  >
                    {THOUSANDS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Skip rows */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-400">
                    Righe da Saltare
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={customProfile.skipRows}
                    onChange={(e) =>
                      setCustomProfile((p) => ({
                        ...p,
                        skipRows: Math.max(0, parseInt(e.target.value) || 0),
                      }))
                    }
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-energy-500 focus:outline-none [color-scheme:dark]"
                  />
                </div>

                {/* Amount inverted */}
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customProfile.amountInverted}
                      onChange={(e) =>
                        setCustomProfile((p) => ({ ...p, amountInverted: e.target.checked }))
                      }
                      className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-energy-500 focus:ring-energy-500"
                    />
                    <span className="text-sm text-zinc-300">Importo invertito</span>
                  </label>
                </div>

                {/* Separate amount columns */}
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customProfile.separateAmountColumns}
                      onChange={(e) =>
                        setCustomProfile((p) => ({ ...p, separateAmountColumns: e.target.checked }))
                      }
                      className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-energy-500 focus:ring-energy-500"
                    />
                    <span className="text-sm text-zinc-300">Colonne separate Entrate/Uscite</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Column mapping */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="mb-4 text-lg font-semibold text-zinc-100">Mappatura Colonne</h2>
            <p className="mb-4 text-xs text-zinc-500">
              Associa le colonne del CSV ai campi del sistema. I campi con * sono obbligatori.
              {customProfile.separateAmountColumns && (
                <span className="ml-1 text-energy-400">
                  Modalità colonne separate attiva: mappa le colonne Accrediti e Addebiti.
                </span>
              )}
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(customProfile.separateAmountColumns ? MAPPING_FIELDS_SPLIT : MAPPING_FIELDS_SINGLE).map(({ key, label, required }) => (
                <div key={key}>
                  <label className="mb-1 block text-xs font-medium text-zinc-400">
                    {label}
                    {required && <span className="text-red-400"> *</span>}
                  </label>
                  <select
                    value={columnMapping[key]}
                    onChange={(e) =>
                      setColumnMapping((m) => ({ ...m, [key]: e.target.value }))
                    }
                    className={cn(
                      'w-full rounded-lg border bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-energy-500 focus:outline-none [color-scheme:dark]',
                      required && !columnMapping[key]
                        ? 'border-red-500/50'
                        : 'border-zinc-700',
                    )}
                  >
                    <option value="">-- Non mappato --</option>
                    {detectedColumns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-6 py-2.5 text-sm text-zinc-300 hover:border-zinc-600 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Indietro
            </button>
            <button
              disabled={!step2Valid || isProcessing}
              onClick={goToStep3}
              className={cn(
                'flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium transition-colors',
                step2Valid && !isProcessing
                  ? 'bg-energy-500 text-zinc-950 hover:bg-energy-400'
                  : 'cursor-not-allowed bg-zinc-800 text-zinc-600',
              )}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Elaborazione...
                </>
              ) : (
                <>
                  Avanti
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ============================== STEP 3 ============================== */}
      {step === 3 && preview && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <SummaryCard
              label="Totale righe"
              value={preview.totalRows}
              color="text-zinc-100"
              bg="bg-zinc-800"
            />
            <SummaryCard
              label="Pronte"
              value={preview.readyCount}
              color="text-green-400"
              bg="bg-green-500/10"
            />
            <SummaryCard
              label="Duplicati"
              value={preview.duplicateCount}
              color="text-amber-400"
              bg="bg-amber-500/10"
            />
            <SummaryCard
              label="Errori"
              value={preview.errorCount}
              color="text-red-400"
              bg="bg-red-500/10"
            />
          </div>

          {/* Preview table */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800">
              <h2 className="text-lg font-semibold text-zinc-100">Anteprima Transazioni</h2>
              <p className="mt-1 text-xs text-zinc-500">
                {preview.totalRows} righe analizzate dal file {preview.filename}
              </p>
            </div>
            <div className="max-h-[28rem] overflow-y-auto overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-zinc-900">
                  <tr className="border-b border-zinc-800 text-left">
                    <th className="px-4 py-3 font-medium text-zinc-400 w-16">#</th>
                    <th className="px-4 py-3 font-medium text-zinc-400 w-24">Stato</th>
                    <th className="px-4 py-3 font-medium text-zinc-400 w-28">Data</th>
                    <th className="px-4 py-3 font-medium text-zinc-400">Descrizione</th>
                    <th className="px-4 py-3 font-medium text-zinc-400 text-right w-32">Importo</th>
                    <th className="px-4 py-3 font-medium text-zinc-400 w-16">Valuta</th>
                    <th className="px-4 py-3 font-medium text-zinc-400">Errore</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {preview.parsedRows.map((row) => (
                    <PreviewRow key={row.rowIndex} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-6 py-2.5 text-sm text-zinc-300 hover:border-zinc-600 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Indietro
            </button>
            <button
              disabled={preview.readyCount === 0 || isImporting}
              onClick={performImport}
              className={cn(
                'flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium transition-colors',
                preview.readyCount > 0 && !isImporting
                  ? 'bg-energy-500 text-zinc-950 hover:bg-energy-400'
                  : 'cursor-not-allowed bg-zinc-800 text-zinc-600',
              )}
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importazione in corso...
                </>
              ) : (
                <>
                  Importa {preview.readyCount} transazioni
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ============================== STEP 4 ============================== */}
      {step === 4 && importResult && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 px-6 py-16">
          {importResult.imported > 0 ? (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-energy-500/15">
                <CheckCircle2 className="h-8 w-8 text-energy-400" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-zinc-100">Importazione Completata</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Le transazioni sono state importate nel contenitore selezionato.
              </p>
            </>
          ) : (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15">
                <XCircle className="h-8 w-8 text-red-400" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-zinc-100">Importazione Fallita</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Nessuna transazione importata. Controlla gli errori qui sotto.
              </p>
            </>
          )}

          {/* Result summary */}
          <div className="mt-8 flex gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">{importResult.imported}</p>
              <p className="text-xs text-zinc-500">Importate</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-400">{importResult.duplicates}</p>
              <p className="text-xs text-zinc-500">Duplicati saltati</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-400">{importResult.errors}</p>
              <p className="text-xs text-zinc-500">Errori</p>
            </div>
          </div>

          {/* Error details */}
          {importResult.errorMessages && importResult.errorMessages.length > 0 && (
            <div className="mt-6 w-full max-w-lg rounded-lg border border-red-500/30 bg-red-500/5 p-4">
              <p className="mb-2 text-sm font-medium text-red-400">Dettaglio errori:</p>
              {importResult.errorMessages.map((msg, i) => (
                <p key={i} className="text-xs text-zinc-400 break-all">
                  {msg}
                </p>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 flex gap-4">
            <button
              onClick={resetWizard}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-6 py-2.5 text-sm text-zinc-300 hover:border-zinc-600 transition-colors"
            >
              Importa un altro file
            </button>
            <Link
              to="/transactions"
              className="inline-flex items-center gap-2 rounded-lg bg-energy-500 px-6 py-2.5 text-sm font-medium text-zinc-950 hover:bg-energy-400 transition-colors"
            >
              Vai alle Transazioni
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function SummaryCard({
  label,
  value,
  color,
  bg,
}: {
  label: string
  value: number
  color: string
  bg: string
}) {
  return (
    <div className={cn('rounded-xl border border-zinc-800 p-5', bg)}>
      <p className="text-xs font-medium text-zinc-400">{label}</p>
      <p className={cn('mt-1 text-2xl font-bold', color)}>{value}</p>
    </div>
  )
}

function PreviewRow({ row }: { row: ParsedRow }) {
  const rowBg =
    row.status === 'ready'
      ? 'bg-green-500/[0.03]'
      : row.status === 'duplicate'
        ? 'bg-amber-500/[0.03]'
        : row.status === 'error'
          ? 'bg-red-500/[0.03]'
          : ''

  const statusBadge =
    row.status === 'ready' ? (
      <Badge variant="success" size="sm">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        OK
      </Badge>
    ) : row.status === 'duplicate' ? (
      <Badge variant="warning" size="sm">
        DUP
      </Badge>
    ) : (
      <Badge variant="danger" size="sm">
        <X className="mr-1 h-3 w-3" />
        ERR
      </Badge>
    )

  const amountNum = row.mapped.amount
  const amountColor = amountNum >= 0 ? 'text-green-400' : 'text-red-400'

  let formattedDate = row.mapped.date
  try {
    if (row.mapped.date && row.mapped.date !== '1970-01-01') {
      formattedDate = formatDate(row.mapped.date)
    }
  } catch {
    // keep raw
  }

  return (
    <tr className={cn('transition-colors hover:bg-zinc-800/40', rowBg)}>
      <td className="px-4 py-2.5 text-zinc-500 font-mono text-xs">{row.rowIndex + 1}</td>
      <td className="px-4 py-2.5">{statusBadge}</td>
      <td className="px-4 py-2.5 text-zinc-300 text-xs">{formattedDate}</td>
      <td className="px-4 py-2.5 text-zinc-200 text-xs max-w-xs truncate">
        {row.mapped.description}
      </td>
      <td className={cn('px-4 py-2.5 text-right font-mono text-xs font-medium', amountColor)}>
        {formatCurrency(amountNum, row.mapped.currency)}
      </td>
      <td className="px-4 py-2.5 text-zinc-500 text-xs">{row.mapped.currency}</td>
      <td className="px-4 py-2.5 text-red-400 text-xs max-w-xs truncate">
        {row.error || ''}
      </td>
    </tr>
  )
}
