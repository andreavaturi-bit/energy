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
    name: 'Intesa Sanpaolo (colonna unica)',
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
    name: 'Intesa Sanpaolo (Accrediti/Addebiti)',
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
    },
    amountInverted: false,
    separateAmountColumns: true,
    incomeColumn: 'Accrediti',
    expenseColumn: 'Addebiti',
    dedupColumns: ['Data Contabile', 'Descrizione', 'Accrediti', 'Addebiti'],
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
    const mappedCols = [...Object.values(profile.columnMapping)]
    // Include income/expense column names for split-amount profiles
    if (profile.incomeColumn) mappedCols.push(profile.incomeColumn)
    if (profile.expenseColumn) mappedCols.push(profile.expenseColumn)
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
 * Verifica che anno/mese/giorno formino una data di calendario reale
 * (scarta 31/02, 31/04, 29/02 in anni non bisestili, ecc.) e la
 * restituisce come YYYY-MM-DD. Ritorna null se la data non esiste.
 */
function buildValidDate(yy: string, mm: string, dd: string): string | null {
  const y = parseInt(yy.padStart(4, '20'), 10)
  const m = parseInt(mm, 10)
  const d = parseInt(dd, 10)
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  // Round-trip: costruisco la data e verifico che i componenti non siano
  // stati normalizzati (es. 31 aprile -> 1 maggio).
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    return null
  }
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/**
 * Converte una data dal formato del CSV a YYYY-MM-DD.
 * Ritorna null per date inesistenti: meglio una riga in errore visibile
 * in anteprima che un intero chunk di 50 righe rifiutato da Postgres.
 */
export function parseDate(value: string, format: string): string | null {
  if (!value) return null
  const v = value.trim()

  try {
    switch (format) {
      case 'DD/MM/YYYY':
      case 'DD-MM-YYYY': {
        const parts = v.split(/[/\-.]/)
        if (parts.length < 3) return null
        return buildValidDate(parts[2], parts[1], parts[0])
      }
      case 'MM/DD/YYYY': {
        const parts = v.split(/[/\-.]/)
        if (parts.length < 3) return null
        return buildValidDate(parts[2], parts[0], parts[1])
      }
      case 'YYYY-MM-DD': {
        // Potrebbe avere timestamp: "2024-01-15 10:30:00"
        const datePart = v.split(/[T\s]/)[0]
        const m = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/)
        if (!m) return null
        return buildValidDate(m[1], m[2], m[3])
      }
      default:
        return null
    }
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
  if (value === null || value === undefined) return null
  let v = String(value).trim()
  if (v === '') return null

  // Rimuovi simboli valuta, spazi e suffissi comuni (CR/DR/EUR/€)
  v = v.replace(/[€$£¥\s]/g, '')
  v = v.replace(/(CR|DR|EUR|USD|GBP)$/i, '')

  // Segno: gestisci esplicitamente sia il segno iniziale sia quello posposto
  // (alcuni gestionali scrivono "12,50-" per le uscite). parseFloat lo
  // ignorerebbe silenziosamente trasformando un'uscita in entrata.
  let sign = 1
  if (/^[-+]/.test(v)) {
    if (v[0] === '-') sign = -1
    v = v.slice(1)
  } else if (/[-+]$/.test(v)) {
    if (v.endsWith('-')) sign = -1
    v = v.slice(0, -1)
  }
  // Parentesi contabili: (12,50) = -12,50
  if (/^\(.*\)$/.test(v)) {
    sign = -1
    v = v.slice(1, -1)
  }

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

  // Dopo la normalizzazione deve restare solo un numero ben formato:
  // qualsiasi carattere residuo (es. separatori mal configurati) e' un errore,
  // non un valore da accettare a caso come fa parseFloat.
  if (!/^\d+(\.\d+)?$/.test(v)) return null

  const num = parseFloat(v)
  if (!Number.isFinite(num)) return null

  return inverted ? -sign * num : sign * num
}

// ============================================================
// DEDUP HASH
// ============================================================

/**
 * Normalizza una descrizione per l'hash: trim + whitespace collassato a
 * singolo spazio. NIENTE case/accent folding, deve restare byte-identica
 * alla normalizzazione SQL `trim(regexp_replace(d,'\s+',' ','g'))`.
 */
export function normalizeDescription(desc: string): string {
  return (desc || '').trim().replace(/\s+/g, ' ')
}

/**
 * Costruisce la stringa canonica per l'hash di dedup. DEVE produrre gli
 * stessi byte della funzione SQL `canonical_tx_hash` (vedi migration
 * import_canonical_hash): date | amount(2dp con segno) | normdesc | occorrenza.
 */
export function canonicalString(
  date: string,
  amount: number,
  description: string,
  occurrence: number,
): string {
  return `${date}|${amount.toFixed(2)}|${normalizeDescription(description)}|${occurrence}`
}

/**
 * SHA-256 esadecimale di una stringa (UTF-8) via WebCrypto.
 * Parita' verificata con `encode(digest(...,'sha256'),'hex')` di Postgres.
 */
export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
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

  // 2. Primo passaggio: parsing e validazione di ogni riga (sincrono)
  const mapping = profile.columnMapping as Record<string, string>
  type Pre = {
    row: Record<string, string>
    index: number
    date: string | null
    description: string
    amount: number | null
    currency: string
    valueDate?: string
    externalId?: string
    errors: string[]
  }

  const pre: Pre[] = data.map((row, index) => {
    // Parse date
    const dateRaw = mapping.date ? row[mapping.date] : ''
    const date = parseDate(dateRaw, profile.dateFormat)

    // Parse description
    const description = mapping.description ? (row[mapping.description] || '').trim() : ''

    // Parse amount
    let amount: number | null = null
    if (profile.separateAmountColumns && profile.incomeColumn && profile.expenseColumn) {
      const income = parseAmount(row[profile.incomeColumn], profile.decimalSeparator, profile.thousandsSeparator)
      const expense = parseAmount(row[profile.expenseColumn], profile.decimalSeparator, profile.thousandsSeparator)
      // Distinguo esplicitamente null (cella vuota/non valida) da 0:
      // un accredito a 0 e' legittimo, non un errore.
      if (income !== null && income !== 0) amount = Math.abs(income)
      else if (expense !== null && expense !== 0) amount = -Math.abs(expense)
      else if (income !== null) amount = income
      else if (expense !== null) amount = expense === 0 ? 0 : -Math.abs(expense)
      else amount = null
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

    const errors: string[] = []
    if (!date) errors.push(`Data non valida: "${dateRaw}"`)
    if (amount === null) errors.push(`Importo non valido: "${mapping.amount ? row[mapping.amount] : ''}"`)
    if (!description) errors.push('Descrizione mancante')

    return { row, index, date, description, amount, currency, valueDate, externalId, errors }
  })

  // 3. Calcola l'indice di occorrenza per (data, importo, descrizione normalizzata)
  //    sulle righe valide del file, per non perdere i twin legittimi.
  const occCounter = new Map<string, number>()

  // 4. Secondo passaggio: hash canonico (async) e stato finale
  const parsedRows: ParsedRow[] = await Promise.all(pre.map(async (p): Promise<ParsedRow> => {
    let hash = ''
    if (p.errors.length === 0 && p.date && p.amount !== null) {
      const key = `${p.date}|${p.amount.toFixed(2)}|${normalizeDescription(p.description)}`
      const occurrence = occCounter.get(key) ?? 0
      occCounter.set(key, occurrence + 1)
      hash = await sha256Hex(canonicalString(p.date, p.amount, p.description, occurrence))
    }

    const isDuplicate = hash !== '' && existingHashes.has(hash)
    const status: ParsedRow['status'] =
      p.errors.length > 0 ? 'error' :
      isDuplicate ? 'duplicate' :
      'ready'

    return {
      raw: p.row,
      mapped: {
        date: p.date || '1970-01-01',
        description: p.description,
        amount: p.amount ?? 0,
        currency: p.currency,
        valueDate: p.valueDate,
        externalId: p.externalId,
      },
      rowIndex: p.index,
      hash,
      status,
      error: p.errors.length > 0 ? p.errors.join('; ') : undefined,
    }
  }))

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
/**
 * Patterns in the description that indicate a credit-card settlement
 * (addebito carta di credito sul conto corrente). These should be
 * categorised as transfers, not income/expense.
 */
const TRANSFER_DESCRIPTION_PATTERNS = [
  'ADDEBITO IN C/C SALVO BUON FINE',
]

export function convertToTransactions(
  rows: ParsedRow[],
  containerId: string,
  source: 'csv_import' | 'pdf_import' = 'csv_import',
): Partial<Transaction>[] {
  return rows
    .filter(r => r.status === 'ready')
    .map(row => {
      const descUpper = (row.mapped.description || '').toUpperCase()
      const isTransfer = TRANSFER_DESCRIPTION_PATTERNS.some(p => descUpper.includes(p))

      const type: TransactionType = isTransfer
        ? (row.mapped.amount >= 0 ? 'transfer_in' : 'transfer_out')
        : (row.mapped.amount >= 0 ? 'income' : 'expense')

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
