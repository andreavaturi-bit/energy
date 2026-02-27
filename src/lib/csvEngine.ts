/**
 * €N€RGY - CSV Import Engine
 *
 * Motore di importazione CSV che gestisce i formati eterogenei
 * dei diversi conti bancari, trading, crypto, carte di credito.
 *
 * Funzionalita':
 * - Parsing CSV con PapaParse (qualsiasi delimitatore/encoding)
 * - Profili di importazione per-conto (column mapping, formato date, decimali)
 * - Normalizzazione importi (virgola/punto, colonne separate entrate/uscite)
 * - Deduplicazione basata su hash delle righe
 * - Preview prima dell'importazione definitiva
 */

import Papa from 'papaparse'
import type { ImportProfile, Transaction, TransactionType } from '@/types'

// ============================================================
// TYPES
// ============================================================

export interface ParsedRow {
  /** Riga originale dal CSV */
  raw: Record<string, string>
  /** Riga normalizzata e mappata */
  mapped: {
    date: string        // YYYY-MM-DD
    description: string
    amount: number      // negativo = uscita, positivo = entrata
    currency: string
    valueDate?: string
    externalId?: string
    notes?: string
  }
  /** Indice riga nel file originale */
  rowIndex: number
  /** Hash per dedup */
  hash: string
  /** Stato */
  status: 'ready' | 'duplicate' | 'error' | 'skipped'
  /** Errore se presente */
  error?: string
}

export interface ImportPreview {
  filename: string
  totalRows: number
  parsedRows: ParsedRow[]
  readyCount: number
  duplicateCount: number
  errorCount: number
  skippedCount: number
  /** Colonne trovate nel CSV */
  detectedColumns: string[]
}

export interface ImportResult {
  imported: number
  duplicates: number
  errors: number
  skipped: number
  transactions: Partial<Transaction>[]
}

// ============================================================
// PRESET IMPORT PROFILES
// Profili preconfigurati per i conti piu' comuni di Andrea
// ============================================================

export const PRESET_PROFILES: Omit<ImportProfile, 'id' | 'containerId' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Intesa Sanpaolo',
    fileType: 'csv',
    delimiter: ';',
    dateFormat: 'DD/MM/YYYY',
    decimalSeparator: ',',
    thousandsSeparator: '.',
    encoding: 'UTF-8',
    skipRows: 0,
    columnMapping: {
      date: 'Data Contabile',
      valueDate: 'Data Valuta',
      description: 'Descrizione',
      amount: 'Importo',
    },
    amountInverted: false,
    separateAmountColumns: false,
    dedupColumns: ['Data Contabile', 'Descrizione', 'Importo'],
  },
  {
    name: 'Revolut',
    fileType: 'csv',
    delimiter: ',',
    dateFormat: 'YYYY-MM-DD',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    encoding: 'UTF-8',
    skipRows: 0,
    columnMapping: {
      date: 'Started Date',
      description: 'Description',
      amount: 'Amount',
      currency: 'Currency',
    },
    amountInverted: false,
    separateAmountColumns: false,
    dedupColumns: ['Started Date', 'Description', 'Amount'],
  },
  {
    name: 'American Express (CSV)',
    fileType: 'csv',
    delimiter: ',',
    dateFormat: 'MM/DD/YYYY',
    decimalSeparator: ',',
    thousandsSeparator: '.',
    encoding: 'UTF-8',
    skipRows: 0,
    columnMapping: {
      date: 'Data',
      description: 'Descrizione',
      amount: 'Importo',
    },
    amountInverted: true, // Amex inverte: positivo = spesa
    separateAmountColumns: false,
    dedupColumns: ['Data', 'Descrizione', 'Importo'],
  },
  {
    name: 'PayPal',
    fileType: 'csv',
    delimiter: ',',
    dateFormat: 'DD/MM/YYYY',
    decimalSeparator: ',',
    thousandsSeparator: '.',
    encoding: 'UTF-8',
    skipRows: 0,
    columnMapping: {
      date: 'Data',
      description: 'Nome',
      amount: 'Lordo',
      currency: 'Valuta',
      externalId: 'Codice transazione',
    },
    amountInverted: false,
    separateAmountColumns: false,
    dedupColumns: ['Codice transazione'],
  },
  {
    name: 'Binance',
    fileType: 'csv',
    delimiter: ',',
    dateFormat: 'YYYY-MM-DD',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    encoding: 'UTF-8',
    skipRows: 0,
    columnMapping: {
      date: 'Date(UTC)',
      description: 'Operation',
      amount: 'Change',
      currency: 'Coin',
    },
    amountInverted: false,
    separateAmountColumns: false,
    dedupColumns: ['Date(UTC)', 'Operation', 'Change', 'Coin'],
  },
  {
    name: 'Interactive Brokers',
    fileType: 'csv',
    delimiter: ',',
    dateFormat: 'YYYY-MM-DD',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    encoding: 'UTF-8',
    skipRows: 0,
    columnMapping: {
      date: 'Date/Time',
      description: 'Description',
      amount: 'Amount',
      currency: 'Currency',
    },
    amountInverted: false,
    separateAmountColumns: false,
    dedupColumns: ['Date/Time', 'Description', 'Amount'],
  },
  {
    name: 'Satispay',
    fileType: 'csv',
    delimiter: ';',
    dateFormat: 'DD/MM/YYYY',
    decimalSeparator: ',',
    thousandsSeparator: '.',
    encoding: 'UTF-8',
    skipRows: 0,
    columnMapping: {
      date: 'Data',
      description: 'Descrizione',
      amount: 'Importo',
    },
    amountInverted: false,
    separateAmountColumns: false,
    dedupColumns: ['Data', 'Descrizione', 'Importo'],
  },
  {
    name: 'Generico (separatore ;)',
    fileType: 'csv',
    delimiter: ';',
    dateFormat: 'DD/MM/YYYY',
    decimalSeparator: ',',
    thousandsSeparator: '.',
    encoding: 'UTF-8',
    skipRows: 0,
    columnMapping: {},
    amountInverted: false,
    separateAmountColumns: false,
    dedupColumns: [],
  },
  {
    name: 'Generico (separatore ,)',
    fileType: 'csv',
    delimiter: ',',
    dateFormat: 'DD/MM/YYYY',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    encoding: 'UTF-8',
    skipRows: 0,
    columnMapping: {},
    amountInverted: false,
    separateAmountColumns: false,
    dedupColumns: [],
  },
]

// ============================================================
// PARSING
// ============================================================

/**
 * Parse un file CSV e restituisci le righe grezze
 */
export function parseCSVFile(
  file: File,
  delimiter = ',',
  encoding = 'UTF-8',
  skipRows = 0,
): Promise<{ data: Record<string, string>[]; columns: string[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      delimiter: delimiter === 'auto' ? undefined : delimiter,
      header: true,
      skipEmptyLines: true,
      encoding,
      transformHeader: (header: string) => header.trim(),
      complete: (results) => {
        const data = (results.data as Record<string, string>[]).slice(skipRows)
        const columns = results.meta.fields?.map(f => f.trim()) || []
        resolve({ data, columns })
      },
      error: (error: Error) => reject(error),
    })
  })
}

/**
 * Rileva automaticamente il delimitatore analizzando le prime righe
 */
export function detectDelimiter(text: string): string {
  const firstLines = text.split('\n').slice(0, 5).join('\n')
  const semicolons = (firstLines.match(/;/g) || []).length
  const commas = (firstLines.match(/,/g) || []).length
  const tabs = (firstLines.match(/\t/g) || []).length

  if (tabs > semicolons && tabs > commas) return '\t'
  if (semicolons > commas) return ';'
  return ','
}

/**
 * Cerca di trovare il profilo di importazione migliore
 * analizzando le colonne del CSV
 */
export function detectProfile(columns: string[]): typeof PRESET_PROFILES[number] | null {
  const colSet = new Set(columns.map(c => c.toLowerCase().trim()))

  for (const profile of PRESET_PROFILES) {
    const mappedCols = Object.values(profile.columnMapping)
    if (mappedCols.length === 0) continue

    const matchCount = mappedCols.filter(col =>
      colSet.has(col.toLowerCase().trim())
    ).length

    if (matchCount === mappedCols.length) {
      return profile
    }
  }

  return null
}

// ============================================================
// DATE PARSING
// ============================================================

/**
 * Converte una data dal formato del CSV a YYYY-MM-DD
 */
export function parseDate(value: string, format: string): string | null {
  if (!value) return null
  const v = value.trim()

  try {
    let mm: string, dd: string, yy: string

    switch (format) {
      case 'DD/MM/YYYY':
      case 'DD-MM-YYYY': {
        const parts = v.split(/[/\-.]/)
        if (parts.length < 3) return null
        ;[dd, mm, yy] = parts
        break
      }
      case 'MM/DD/YYYY': {
        const parts = v.split(/[/\-.]/)
        if (parts.length < 3) return null
        ;[mm, dd, yy] = parts
        break
      }
      case 'YYYY-MM-DD': {
        // Potrebbe avere timestamp: "2024-01-15 10:30:00"
        const datePart = v.split(/[T\s]/)[0]
        if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart
        return null
      }
      default:
        return null
    }

    const month = parseInt(mm, 10)
    const day = parseInt(dd, 10)

    // Auto-correct swapped month/day: if month > 12 but day <= 12, swap them
    if (month > 12 && day >= 1 && day <= 12) {
      const tmp = mm
      mm = dd
      dd = tmp
    }

    // Validate
    const m = parseInt(mm, 10)
    const d = parseInt(dd, 10)
    if (m < 1 || m > 12 || d < 1 || d > 31) return null

    return `${yy.padStart(4, '20')}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
  } catch {
    return null
  }
}

// ============================================================
// AMOUNT PARSING
// ============================================================

/**
 * Parsa un importo dal CSV gestendo separatori italiani/inglesi
 */
export function parseAmount(
  value: string,
  decimalSeparator = ',',
  thousandsSeparator = '.',
  inverted = false,
): number | null {
  if (!value) return null
  let v = value.trim()

  // Rimuovi simboli valuta e spazi
  v = v.replace(/[€$£¥\s]/g, '')

  // Rimuovi separatore migliaia
  if (thousandsSeparator === '.') {
    v = v.replace(/\./g, '')
  } else if (thousandsSeparator === ',') {
    v = v.replace(/,/g, '')
  }

  // Normalizza separatore decimale
  if (decimalSeparator === ',') {
    v = v.replace(',', '.')
  }

  const num = parseFloat(v)
  if (isNaN(num)) return null

  return inverted ? -num : num
}

// ============================================================
// DEDUP HASH
// ============================================================

/**
 * Genera un hash semplice per deduplicazione
 */
export function generateRowHash(row: Record<string, string>, dedupColumns: string[]): string {
  const cols = dedupColumns.length > 0
    ? dedupColumns
    : Object.keys(row)

  const values = cols
    .map(col => (row[col] || '').trim().toLowerCase())
    .join('|')

  // Simple hash (djb2)
  let hash = 5381
  for (let i = 0; i < values.length; i++) {
    hash = ((hash << 5) + hash) + values.charCodeAt(i)
    hash = hash & hash // Convert to 32-bit int
  }
  return Math.abs(hash).toString(36)
}

// ============================================================
// MAIN IMPORT FLOW
// ============================================================

/**
 * Processa un file CSV completo e genera l'anteprima dell'importazione
 */
export async function processCSVImport(
  file: File,
  profile: Omit<ImportProfile, 'id' | 'containerId' | 'createdAt' | 'updatedAt'>,
  existingHashes: Set<string> = new Set(),
): Promise<ImportPreview> {
  // 1. Parse CSV
  const { data, columns } = await parseCSVFile(
    file,
    profile.delimiter,
    profile.encoding,
    profile.skipRows,
  )

  // 2. Processa ogni riga
  const parsedRows: ParsedRow[] = data.map((row, index) => {
    const mapping = profile.columnMapping as Record<string, string>

    // Parse date
    const dateRaw = mapping.date ? row[mapping.date] : ''
    const date = parseDate(dateRaw, profile.dateFormat)

    // Parse description
    const description = mapping.description ? (row[mapping.description] || '').trim() : ''

    // Parse amount
    let amount: number | null = null
    if (profile.separateAmountColumns && profile.incomeColumn && profile.expenseColumn) {
      const incomeVal = row[profile.incomeColumn]
      const expenseVal = row[profile.expenseColumn]
      const income = parseAmount(incomeVal, profile.decimalSeparator, profile.thousandsSeparator)
      const expense = parseAmount(expenseVal, profile.decimalSeparator, profile.thousandsSeparator)
      if (income && income > 0) amount = income
      else if (expense && expense > 0) amount = -expense
      else amount = income || expense
    } else {
      const amountRaw = mapping.amount ? row[mapping.amount] : ''
      amount = parseAmount(amountRaw, profile.decimalSeparator, profile.thousandsSeparator, profile.amountInverted)
    }

    // Parse currency
    const currency = mapping.currency ? (row[mapping.currency] || 'EUR').trim().toUpperCase() : 'EUR'

    // Parse optional fields
    const valueDate = mapping.valueDate
      ? parseDate(row[mapping.valueDate] || '', profile.dateFormat) || undefined
      : undefined
    const externalId = mapping.externalId
      ? (row[mapping.externalId] || '').trim() || undefined
      : undefined

    // Generate hash
    const hash = generateRowHash(row, profile.dedupColumns || [])

    // Validate
    const errors: string[] = []
    if (!date) errors.push(`Data non valida: "${dateRaw}"`)
    if (amount === null) errors.push(`Importo non valido: "${mapping.amount ? row[mapping.amount] : ''}"`)
    if (!description) errors.push('Descrizione mancante')

    // Check dedup
    const isDuplicate = existingHashes.has(hash)

    const status: ParsedRow['status'] =
      errors.length > 0 ? 'error' :
      isDuplicate ? 'duplicate' :
      'ready'

    return {
      raw: row,
      mapped: {
        date: date || '1970-01-01',
        description,
        amount: amount || 0,
        currency,
        valueDate,
        externalId,
      },
      rowIndex: index,
      hash,
      status,
      error: errors.length > 0 ? errors.join('; ') : undefined,
    }
  })

  return {
    filename: file.name,
    totalRows: data.length,
    parsedRows,
    readyCount: parsedRows.filter(r => r.status === 'ready').length,
    duplicateCount: parsedRows.filter(r => r.status === 'duplicate').length,
    errorCount: parsedRows.filter(r => r.status === 'error').length,
    skippedCount: parsedRows.filter(r => r.status === 'skipped').length,
    detectedColumns: columns,
  }
}

/**
 * Converte le righe parsate in transazioni pronte per il database
 */
export function convertToTransactions(
  rows: ParsedRow[],
  containerId: string,
  source: 'csv_import' | 'pdf_import' = 'csv_import',
): Partial<Transaction>[] {
  return rows
    .filter(r => r.status === 'ready')
    .map(row => {
      const type: TransactionType = row.mapped.amount >= 0 ? 'income' : 'expense'

      return {
        date: row.mapped.date,
        valueDate: row.mapped.valueDate,
        description: row.mapped.description,
        amount: row.mapped.amount.toFixed(4),
        currency: row.mapped.currency,
        containerId,
        type,
        status: 'completed' as const,
        source,
        externalId: row.mapped.externalId,
        externalHash: row.hash,
      }
    })
}
