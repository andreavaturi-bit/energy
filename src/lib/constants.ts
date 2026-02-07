import type { ContainerType, TransactionType, Frequency, TagType } from '@/types'

export const APP_NAME = 'eN€RGY'
export const APP_TAGLINE = 'Il denaro e\' energia'

export const CURRENCIES = [
  { code: 'EUR', symbol: '\u20AC', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'Dollaro USA' },
  { code: 'GBP', symbol: '\u00A3', name: 'Sterlina' },
  { code: 'CHF', symbol: 'CHF', name: 'Franco Svizzero' },
  { code: 'RON', symbol: 'RON', name: 'Leu Romeno' },
  { code: 'BTC', symbol: '\u20BF', name: 'Bitcoin' },
  { code: 'ETH', symbol: '\u039E', name: 'Ethereum' },
  { code: 'USDT', symbol: 'USDT', name: 'Tether' },
  { code: 'USDC', symbol: 'USDC', name: 'USD Coin' },
] as const

export const CONTAINER_TYPES: Array<{ value: ContainerType; label: string; icon: string }> = [
  { value: 'bank_account', label: 'Conto Corrente', icon: 'landmark' },
  { value: 'credit_card', label: 'Carta di Credito', icon: 'credit-card' },
  { value: 'trading', label: 'Trading', icon: 'trending-up' },
  { value: 'crypto', label: 'Crypto', icon: 'bitcoin' },
  { value: 'payment_service', label: 'Servizio Pagamento', icon: 'smartphone' },
  { value: 'cash', label: 'Contanti', icon: 'banknote' },
  { value: 'savings', label: 'Risparmio', icon: 'piggy-bank' },
  { value: 'voucher', label: 'Buoni', icon: 'ticket' },
  { value: 'other', label: 'Altro', icon: 'wallet' },
]

export const TRANSACTION_TYPES: Array<{ value: TransactionType; label: string; direction: 'in' | 'out' | 'transfer' }> = [
  { value: 'income', label: 'Entrata', direction: 'in' },
  { value: 'expense', label: 'Uscita', direction: 'out' },
  { value: 'transfer_out', label: 'Trasferimento (uscita)', direction: 'transfer' },
  { value: 'transfer_in', label: 'Trasferimento (entrata)', direction: 'transfer' },
  { value: 'capital_injection', label: 'Versamento c/capitale', direction: 'out' },
  { value: 'loan_out', label: 'Prestito dato', direction: 'out' },
  { value: 'loan_in', label: 'Prestito ricevuto', direction: 'in' },
  { value: 'repayment_out', label: 'Rimborso dato', direction: 'out' },
  { value: 'repayment_in', label: 'Rimborso ricevuto', direction: 'in' },
]

export const FREQUENCIES: Array<{ value: Frequency; label: string }> = [
  { value: 'daily', label: 'Giornaliera' },
  { value: 'weekly', label: 'Settimanale' },
  { value: 'biweekly', label: 'Bisettimanale' },
  { value: 'monthly', label: 'Mensile' },
  { value: 'bimonthly', label: 'Bimestrale' },
  { value: 'quarterly', label: 'Trimestrale' },
  { value: 'semi_annual', label: 'Semestrale' },
  { value: 'annual', label: 'Annuale' },
  { value: 'custom', label: 'Personalizzata' },
]

export const TAG_TYPES: Array<{ value: TagType; label: string; description: string }> = [
  { value: 'category', label: 'Categoria', description: 'Tipo di spesa/entrata (Affitto, Bollette, Stipendio...)' },
  { value: 'scope', label: 'Ambito', description: 'A chi fa capo (Personale, Familiare, Aziendale, VS/Opzionetika...)' },
  { value: 'purpose', label: 'Finalita\'', description: 'Scopo specifico (Da dividere con Mirko, C/capitale Shuffle...)' },
  { value: 'custom', label: 'Personalizzato', description: 'Tag libero' },
]

// Default scopes matching Andrea's structure
export const DEFAULT_SCOPES = [
  'Personale AV',
  'Familiare',
  'Kairos SRLS',
  'VS/Opzionetika (da dividere)',
  'Shuffle SSRL (Ghiaccio Spettacolo)',
  'LTD UK',
  'Romania',
] as const

// Default categories
export const DEFAULT_CATEGORIES = [
  'Affitto',
  'Box',
  'Bollette',
  'Spesa alimentare',
  'Ristorazione',
  'Trasporti',
  'Automobile',
  'Assicurazioni',
  'Salute',
  'Scuola',
  'Abbigliamento',
  'Tecnologia',
  'Subscriptions',
  'Formazione',
  'Palestra & Sport',
  'Viaggi & Vacanze',
  'Regali',
  'Tasse & Imposte',
  'F24',
  'Multe',
  'TARI',
  'IVA',
  'Commercialista',
  'Collaboratori',
  'Ufficio',
  'Marketing',
  'Domini & Hosting',
  'Software & SaaS',
  'Trading',
  'Crypto',
  'Investimenti',
  'Baby Sitter',
  'Pulizie',
  'Acqua',
  'Telepass',
  'Carta di credito (pagamento)',
  'Buoni pasto',
  'Contanti (prelievo)',
  'Altro',
] as const

export const DATE_FORMATS = [
  'DD/MM/YYYY',
  'DD-MM-YYYY',
  'YYYY-MM-DD',
  'MM/DD/YYYY',
  'DD.MM.YYYY',
] as const
