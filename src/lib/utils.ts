import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'
import type { TransactionType, ContainerType } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- Currency formatting ---
// Manual Italian-style formatting to guarantee thousands separator (.)
// across all browsers and environments.

const currencySymbols: Record<string, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  RON: 'lei',
  CHF: 'CHF',
}

function formatItalian(num: number): string {
  const [intPart, decPart] = Math.abs(num).toFixed(2).split('.')
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${num < 0 ? '-' : ''}${grouped},${decPart}`
}

export function formatCurrency(amount: number | string, currency = 'EUR'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '—'
  const symbol = currencySymbols[currency] || currency
  return `${formatItalian(num)} ${symbol}`
}

export function formatAmount(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '—'
  return formatItalian(num)
}

// --- Date formatting ---

export function formatDate(date: string | Date, fmt = 'dd/MM/yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, fmt, { locale: it })
}

export function formatDateShort(date: string | Date): string {
  return formatDate(date, 'dd MMM yyyy')
}

export function formatMonth(date: string | Date): string {
  return formatDate(date, 'MMMM yyyy')
}

// --- Transaction helpers ---

export function isInflow(type: TransactionType): boolean {
  return ['income', 'transfer_in', 'loan_in', 'repayment_in'].includes(type)
}

export function isOutflow(type: TransactionType): boolean {
  return ['expense', 'transfer_out', 'capital_injection', 'loan_out', 'repayment_out'].includes(type)
}

export function isTransfer(type: TransactionType): boolean {
  return type === 'transfer_in' || type === 'transfer_out'
}

export function transactionTypeLabel(type: TransactionType): string {
  const labels: Record<TransactionType, string> = {
    income: 'Entrata',
    expense: 'Uscita',
    transfer_out: 'Trasferimento (uscita)',
    transfer_in: 'Trasferimento (entrata)',
    capital_injection: 'Versamento c/capitale',
    loan_out: 'Prestito dato',
    loan_in: 'Prestito ricevuto',
    repayment_out: 'Rimborso dato',
    repayment_in: 'Rimborso ricevuto',
  }
  return labels[type]
}

export function transactionTypeColor(type: TransactionType): string {
  if (isInflow(type)) return 'text-income'
  if (isTransfer(type)) return 'text-transfer'
  return 'text-expense'
}

// --- Container helpers ---

export function containerTypeLabel(type: ContainerType): string {
  const labels: Record<ContainerType, string> = {
    bank_account: 'Conto Corrente',
    credit_card: 'Carta di Credito',
    trading: 'Trading',
    crypto: 'Crypto',
    payment_service: 'Servizio Pagamento',
    cash: 'Contanti',
    savings: 'Risparmio',
    voucher: 'Buoni',
    other: 'Altro',
  }
  return labels[type]
}

export function containerTypeIcon(type: ContainerType): string {
  const icons: Record<ContainerType, string> = {
    bank_account: 'landmark',
    credit_card: 'credit-card',
    trading: 'trending-up',
    crypto: 'bitcoin',
    payment_service: 'smartphone',
    cash: 'banknote',
    savings: 'piggy-bank',
    voucher: 'ticket',
    other: 'wallet',
  }
  return icons[type]
}

// --- Number helpers ---

export function parseDecimal(value: string, decimalSeparator = ','): number {
  if (!value) return 0
  const cleaned = value
    .replace(/\s/g, '')
    .replace(/\./g, '')  // Remove thousands separator (Italian)
    .replace(decimalSeparator, '.') // Normalize decimal separator
  return parseFloat(cleaned) || 0
}

export function toDecimalString(value: number): string {
  return value.toFixed(4)
}
