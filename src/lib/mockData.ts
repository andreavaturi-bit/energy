/**
 * €N€RGY - Mock Data Store
 *
 * Dati realistici basati sugli screenshot di Notion di Andrea.
 * Questo store viene usato finche' il database non e' collegato,
 * poi si swappa trasparentemente con le chiamate API reali.
 */

import type {
  Subject,
  Container,
  Tag,
  Counterparty,
  Transaction,
} from '@/types'

// ============================================================
// SUBJECTS
// ============================================================

export const SUBJECTS: Subject[] = [
  { id: 's-andrea', type: 'person', name: 'Andrea Vaturi', country: 'IT', role: 'owner', parentSubjectId: null, notes: 'Titolare. Libero professionista (P.IVA) + imprenditore.', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 's-moglie', type: 'person', name: 'Moglie AV', country: 'IT', role: 'family', parentSubjectId: 's-andrea', notes: 'Ha una Amex collegata al conto di Andrea.', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 's-massimo', type: 'person', name: 'Massimo Vaturi', country: 'IT', role: 'family', parentSubjectId: 's-andrea', notes: 'Figlio. Ha una prepagata.', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 's-mirko', type: 'person', name: 'Mirko Castignani', country: 'IT', role: 'partner', parentSubjectId: null, notes: 'Socio 50% VS/Opzionetika. Titolare Scacco Matto SRLS.', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 's-kairos', type: 'company', name: 'Kairos SRLS', legalForm: 'SRLS', country: 'IT', role: 'owner', parentSubjectId: 's-andrea', notes: 'SRL di Andrea al 100%.', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 's-scacco', type: 'company', name: 'Scacco Matto SRLS', legalForm: 'SRLS', country: 'IT', role: 'partner', parentSubjectId: 's-mirko', notes: 'Business 50/50 con Kairos.', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 's-shuffle', type: 'company', name: 'Shuffle SSRL', legalForm: 'SSRL', country: 'IT', role: 'other', parentSubjectId: 's-andrea', notes: 'Ghiaccio Spettacolo. Andrea 33%.', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 's-aod', type: 'company', name: 'Ace of Diamonds SRL', legalForm: 'SRL', country: 'RO', role: 'owner', parentSubjectId: 's-andrea', notes: 'Romania. In chiusura.', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 's-ua', type: 'company', name: 'Unfair Advantage SRL', legalForm: 'SRL', country: 'RO', role: 'owner', parentSubjectId: 's-andrea', notes: 'Romania. In chiusura.', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 's-tlf', type: 'company', name: 'TLF Advisory SRLS', legalForm: 'SRLS', country: 'IT', role: 'other', parentSubjectId: null, notes: 'Conto Revolut aziendale.', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 's-ltd', type: 'company', name: 'LTD UK (VS/Opzionetika)', legalForm: 'LTD', country: 'GB', role: 'partner', parentSubjectId: null, notes: 'LTD inglese con Mirko.', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
]

// ============================================================
// CONTAINERS
// ============================================================

export const CONTAINERS: Container[] = [
  // --- Conti correnti personali ---
  { id: 'c-isp', subjectId: 's-andrea', name: 'ISP 2767', type: 'bank_account', provider: 'Intesa Sanpaolo', currency: 'EUR', isMultiCurrency: false, initialBalance: '0', icon: 'landmark', color: '#0066CC', sortOrder: 0, isActive: true, notes: 'Conto corrente principale.', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'c-revolut', subjectId: 's-andrea', name: 'Revolut Personal', type: 'bank_account', provider: 'Revolut', currency: 'EUR', isMultiCurrency: true, initialBalance: '100', icon: 'smartphone', color: '#0075EB', sortOrder: 1, isActive: true, notes: 'Multi-valuta + risparmio.', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  // --- Contanti ---
  { id: 'c-cash', subjectId: 's-andrea', name: 'Contanti', type: 'cash', provider: null, currency: 'EUR', isMultiCurrency: false, initialBalance: '0', icon: 'banknote', color: '#22C55E', sortOrder: 2, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  // --- Servizi pagamento ---
  { id: 'c-paypal', subjectId: 's-andrea', name: 'PayPal', type: 'payment_service', provider: 'PayPal', currency: 'EUR', isMultiCurrency: true, initialBalance: '0', icon: 'smartphone', color: '#003087', sortOrder: 3, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'c-satispay', subjectId: 's-andrea', name: 'Satispay', type: 'payment_service', provider: 'Satispay', currency: 'EUR', isMultiCurrency: false, initialBalance: '100', icon: 'smartphone', color: '#EF4444', sortOrder: 4, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  // --- Carte di credito ---
  { id: 'c-amex-av', subjectId: 's-andrea', name: 'American Express Oro - AV', type: 'credit_card', provider: 'American Express', currency: 'EUR', isMultiCurrency: false, initialBalance: '0', billingDay: 10, icon: 'credit-card', color: '#C5A44E', sortOrder: 5, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'c-amex-vs', subjectId: 's-andrea', name: 'American Express Oro - VS', type: 'credit_card', provider: 'American Express', currency: 'EUR', isMultiCurrency: false, initialBalance: '0', billingDay: 10, icon: 'credit-card', color: '#C5A44E', sortOrder: 6, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'c-amex-rev', subjectId: 's-andrea', name: 'American Express Revolving', type: 'credit_card', provider: 'American Express', currency: 'EUR', isMultiCurrency: false, initialBalance: '0', icon: 'credit-card', color: '#8B7355', sortOrder: 7, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'c-amex-moglie', subjectId: 's-moglie', name: 'American Express Moglie', type: 'credit_card', provider: 'American Express', currency: 'EUR', isMultiCurrency: false, initialBalance: '0', billingDay: 10, linkedContainerId: 'c-isp', icon: 'credit-card', color: '#C5A44E', sortOrder: 8, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  // --- Risparmio ---
  { id: 'c-fondocassa', subjectId: 's-andrea', name: 'Fondo ca$$a', type: 'savings', provider: null, currency: 'EUR', isMultiCurrency: false, initialBalance: '1300', icon: 'piggy-bank', color: '#F59E0B', sortOrder: 9, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'c-nypiggy', subjectId: 's-andrea', name: 'New York Piggy', type: 'savings', provider: null, currency: 'EUR', isMultiCurrency: false, initialBalance: '0', icon: 'piggy-bank', color: '#EC4899', sortOrder: 10, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  // --- Trading personale ---
  { id: 'c-ib-av', subjectId: 's-andrea', name: 'Interactive Brokers AV', type: 'trading', provider: 'Interactive Brokers', currency: 'EUR', isMultiCurrency: true, initialBalance: '100', icon: 'trending-up', color: '#D62B1F', sortOrder: 11, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'c-tr', subjectId: 's-andrea', name: 'Trade Republic', type: 'trading', provider: 'Trade Republic', currency: 'EUR', isMultiCurrency: false, initialBalance: '11000', icon: 'trending-up', color: '#1A1A2E', sortOrder: 12, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'c-ibroker', subjectId: 's-andrea', name: 'iBroker.it', type: 'trading', provider: 'iBroker', currency: 'EUR', isMultiCurrency: false, initialBalance: '270.60', icon: 'trending-up', color: '#FF6600', sortOrder: 13, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'c-webank', subjectId: 's-andrea', name: 'Webank Trading', type: 'trading', provider: 'Webank', currency: 'EUR', isMultiCurrency: false, initialBalance: '1627.73', icon: 'trending-up', color: '#006837', sortOrder: 14, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'c-daniotti', subjectId: 's-andrea', name: 'Daniotti', type: 'trading', provider: 'Daniotti', currency: 'EUR', isMultiCurrency: false, initialBalance: '3000', icon: 'trending-up', color: '#D4A017', sortOrder: 15, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'c-ig', subjectId: 's-andrea', name: 'IG', type: 'trading', provider: 'IG', currency: 'EUR', isMultiCurrency: true, initialBalance: '0', icon: 'trending-up', color: '#DC143C', sortOrder: 16, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'c-soisy', subjectId: 's-andrea', name: 'Soisy', type: 'trading', provider: 'Soisy', currency: 'EUR', isMultiCurrency: false, initialBalance: '59.37', icon: 'trending-up', color: '#5B21B6', sortOrder: 17, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'c-degiro', subjectId: 's-andrea', name: 'Degiro', type: 'trading', provider: 'Degiro', currency: 'EUR', isMultiCurrency: true, initialBalance: '129.39', icon: 'trending-up', color: '#00A3E0', sortOrder: 18, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'c-lenndy', subjectId: 's-andrea', name: 'Lenndy', type: 'trading', provider: 'Lenndy', currency: 'EUR', isMultiCurrency: false, initialBalance: '54.01', icon: 'trending-up', color: '#4A90D9', sortOrder: 19, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  // --- Crypto ---
  { id: 'c-binance', subjectId: 's-andrea', name: 'Binance', type: 'crypto', provider: 'Binance', currency: 'EUR', isMultiCurrency: true, initialBalance: '10000', icon: 'bitcoin', color: '#F3BA2F', sortOrder: 20, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'c-wirex', subjectId: 's-andrea', name: 'Wirex', type: 'crypto', provider: 'Wirex', currency: 'EUR', isMultiCurrency: true, initialBalance: '0', icon: 'bitcoin', color: '#00C3FF', sortOrder: 21, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'c-cryptocom', subjectId: 's-andrea', name: 'Crypto.com', type: 'crypto', provider: 'Crypto.com', currency: 'EUR', isMultiCurrency: true, initialBalance: '197.47', icon: 'bitcoin', color: '#103F68', sortOrder: 22, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'c-coinbase', subjectId: 's-andrea', name: 'Coinbase', type: 'crypto', provider: 'Coinbase', currency: 'EUR', isMultiCurrency: true, initialBalance: '405.94', icon: 'bitcoin', color: '#0052FF', sortOrder: 23, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'c-blockfi', subjectId: 's-andrea', name: 'BlockFi', type: 'crypto', provider: 'BlockFi', currency: 'USD', isMultiCurrency: false, initialBalance: '7.59', icon: 'bitcoin', color: '#694ED6', sortOrder: 24, isActive: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'c-deribit', subjectId: 's-andrea', name: 'Deribit', type: 'crypto', provider: 'Deribit', currency: 'USD', isMultiCurrency: true, initialBalance: '1300', icon: 'bitcoin', color: '#57E099', sortOrder: 25, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'c-trust', subjectId: 's-andrea', name: 'Trust Wallet', type: 'crypto', provider: 'Trust Wallet', currency: 'USD', isMultiCurrency: true, initialBalance: '0', icon: 'bitcoin', color: '#3375BB', sortOrder: 26, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'c-poly', subjectId: 's-andrea', name: 'Polymarket', type: 'crypto', provider: 'Polymarket', currency: 'USD', isMultiCurrency: false, initialBalance: '100', icon: 'bitcoin', color: '#4C6EF5', sortOrder: 27, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'c-climber', subjectId: 's-andrea', name: 'Climbermine', type: 'crypto', provider: 'Climbermine', currency: 'USD', isMultiCurrency: false, initialBalance: '1000', icon: 'bitcoin', color: '#00BFA5', sortOrder: 28, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'c-metamask', subjectId: 's-andrea', name: 'MetaMask', type: 'crypto', provider: 'MetaMask', currency: 'USD', isMultiCurrency: true, initialBalance: '0', icon: 'bitcoin', color: '#E2761B', sortOrder: 29, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'c-bybit', subjectId: 's-andrea', name: 'ByBit', type: 'crypto', provider: 'ByBit', currency: 'USD', isMultiCurrency: true, initialBalance: '1000', icon: 'bitcoin', color: '#F7A600', sortOrder: 30, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  // --- Conti aziendali Kairos ---
  { id: 'c-ib-kairos', subjectId: 's-kairos', name: 'Interactive Brokers Kairos', type: 'trading', provider: 'Interactive Brokers', currency: 'EUR', isMultiCurrency: true, initialBalance: '7700', icon: 'trending-up', color: '#D62B1F', sortOrder: 31, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'c-isp-kairos', subjectId: 's-kairos', name: 'ISP Kairos', type: 'bank_account', provider: 'Intesa Sanpaolo', currency: 'EUR', isMultiCurrency: false, initialBalance: '0', icon: 'landmark', color: '#0066CC', sortOrder: 32, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'c-zurich', subjectId: 's-kairos', name: 'Zurich Bank Kairos', type: 'bank_account', provider: 'Zurich Bank', currency: 'EUR', isMultiCurrency: false, initialBalance: '0', icon: 'landmark', color: '#003399', sortOrder: 33, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'c-amex-kairos', subjectId: 's-kairos', name: 'Amex Kairos', type: 'credit_card', provider: 'American Express', currency: 'EUR', isMultiCurrency: false, initialBalance: '0', icon: 'credit-card', color: '#C5A44E', sortOrder: 34, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'c-pp-kairos', subjectId: 's-kairos', name: 'PayPal Kairos', type: 'payment_service', provider: 'PayPal', currency: 'EUR', isMultiCurrency: true, initialBalance: '0', icon: 'smartphone', color: '#003087', sortOrder: 35, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'c-qonto', subjectId: 's-kairos', name: 'Qonto Kairos', type: 'bank_account', provider: 'Qonto', currency: 'EUR', isMultiCurrency: false, initialBalance: '0', icon: 'landmark', color: '#7B61FF', sortOrder: 36, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'c-stripe', subjectId: 's-kairos', name: 'Stripe Kairos', type: 'payment_service', provider: 'Stripe', currency: 'EUR', isMultiCurrency: true, initialBalance: '0', icon: 'smartphone', color: '#635BFF', sortOrder: 37, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'c-soldo', subjectId: 's-kairos', name: 'Soldo Kairos', type: 'payment_service', provider: 'Soldo', currency: 'EUR', isMultiCurrency: false, initialBalance: '0', icon: 'smartphone', color: '#1A1A1A', sortOrder: 38, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'c-saxo', subjectId: 's-kairos', name: 'Saxo Kairos', type: 'trading', provider: 'Saxo Bank', currency: 'EUR', isMultiCurrency: true, initialBalance: '0', icon: 'trending-up', color: '#003D6A', sortOrder: 39, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'c-wise', subjectId: 's-kairos', name: 'Wise Kairos', type: 'payment_service', provider: 'Wise', currency: 'EUR', isMultiCurrency: true, initialBalance: '0', icon: 'smartphone', color: '#9FE870', sortOrder: 40, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  // --- Romania ---
  { id: 'c-bt-lei', subjectId: 's-aod', name: 'Banca Transilvania - LEI', type: 'bank_account', provider: 'Banca Transilvania', currency: 'RON', isMultiCurrency: false, initialBalance: '0', icon: 'landmark', color: '#FFD700', sortOrder: 41, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'c-bt-eur-aod', subjectId: 's-aod', name: 'Banca Transilvania - EUR (AoD)', type: 'bank_account', provider: 'Banca Transilvania', currency: 'EUR', isMultiCurrency: false, initialBalance: '0', icon: 'landmark', color: '#FFD700', sortOrder: 42, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'c-bt-eur-ua', subjectId: 's-ua', name: 'Banca Transilvania - EUR (UA)', type: 'bank_account', provider: 'Banca Transilvania', currency: 'EUR', isMultiCurrency: false, initialBalance: '0', icon: 'landmark', color: '#FFD700', sortOrder: 43, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'c-aod-eur', subjectId: 's-aod', name: 'Ace of Diamonds - EUR account', type: 'bank_account', provider: 'Ace of Diamonds', currency: 'EUR', isMultiCurrency: false, initialBalance: '35000', icon: 'landmark', color: '#DC2626', sortOrder: 44, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  // --- TLF ---
  { id: 'c-rev-tlf', subjectId: 's-tlf', name: 'Revolut - TLF Advisory', type: 'bank_account', provider: 'Revolut', currency: 'EUR', isMultiCurrency: true, initialBalance: '0', icon: 'smartphone', color: '#0075EB', sortOrder: 45, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  // --- Gruppo VS ---
  { id: 'c-tasty', subjectId: 's-kairos', name: 'tastyworks - tastyClub', type: 'trading', provider: 'tastytrade', currency: 'USD', isMultiCurrency: false, initialBalance: '5131', icon: 'trending-up', color: '#CE1141', sortOrder: 46, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'c-ib-prt', subjectId: 's-kairos', name: 'IB - ProRealTime', type: 'trading', provider: 'Interactive Brokers', currency: 'EUR', isMultiCurrency: true, initialBalance: '0', icon: 'trending-up', color: '#D62B1F', sortOrder: 47, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'c-ib-mm', subjectId: 's-kairos', name: 'IB - Mastermind', type: 'trading', provider: 'Interactive Brokers', currency: 'EUR', isMultiCurrency: true, initialBalance: '5000', icon: 'trending-up', color: '#D62B1F', sortOrder: 48, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'c-exante', subjectId: 's-kairos', name: 'Exante', type: 'trading', provider: 'Exante', currency: 'EUR', isMultiCurrency: true, initialBalance: '0', icon: 'trending-up', color: '#1B3A5C', sortOrder: 49, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'c-webank-vs', subjectId: 's-kairos', name: 'Webank - Portafoglio strategico', type: 'trading', provider: 'Webank', currency: 'EUR', isMultiCurrency: false, initialBalance: '10000', icon: 'trending-up', color: '#006837', sortOrder: 50, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'c-schwab', subjectId: 's-kairos', name: 'Schwab', type: 'trading', provider: 'Charles Schwab', currency: 'USD', isMultiCurrency: false, initialBalance: '0', icon: 'trending-up', color: '#00A3E0', sortOrder: 51, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  // --- Prepagata figlio ---
  { id: 'c-massimo', subjectId: 's-massimo', name: 'Prepagata Massimo', type: 'bank_account', provider: null, currency: 'EUR', isMultiCurrency: false, initialBalance: '0', icon: 'credit-card', color: '#8B5CF6', sortOrder: 52, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
]

// ============================================================
// TAGS
// ============================================================

export const TAGS: Tag[] = [
  // Scope
  { id: 't-personale', name: 'Personale', type: 'scope', color: '#3B82F6', icon: 'user', isActive: true, createdAt: '2024-01-01T00:00:00Z' },
  { id: 't-familiare', name: 'Familiare', type: 'scope', color: '#8B5CF6', icon: 'users', isActive: true, createdAt: '2024-01-01T00:00:00Z' },
  { id: 't-kairos', name: 'Aziendale Kairos', type: 'scope', color: '#F59E0B', icon: 'building', isActive: true, createdAt: '2024-01-01T00:00:00Z' },
  { id: 't-vs', name: 'VS / Opzionetika', type: 'scope', color: '#EF4444', icon: 'target', isActive: true, createdAt: '2024-01-01T00:00:00Z' },
  { id: 't-ghiaccio', name: 'Ghiaccio Spettacolo', type: 'scope', color: '#06B6D4', icon: 'snowflake', isActive: true, createdAt: '2024-01-01T00:00:00Z' },
  // Purpose
  { id: 't-dividere', name: 'Da dividere con Mirko', type: 'purpose', color: '#F97316', icon: 'split', isActive: true, createdAt: '2024-01-01T00:00:00Z' },
  { id: 't-capitale', name: 'Versamento c/capitale', type: 'purpose', color: '#14B8A6', icon: 'arrow-down-to-line', isActive: true, createdAt: '2024-01-01T00:00:00Z' },
  { id: 't-iva', name: 'Scaricabile IVA', type: 'purpose', color: '#84CC16', icon: 'receipt', isActive: true, createdAt: '2024-01-01T00:00:00Z' },
  { id: 't-parenti', name: 'Per conto parenti', type: 'purpose', color: '#D946EF', icon: 'heart-handshake', isActive: true, createdAt: '2024-01-01T00:00:00Z' },
  { id: 't-figli', name: 'Accantonamento figli', type: 'purpose', color: '#EC4899', icon: 'baby', isActive: true, createdAt: '2024-01-01T00:00:00Z' },
  // Category
  { id: 't-affitto', name: 'Affitto', type: 'category', color: '#6366F1', icon: 'home', isActive: true, createdAt: '2024-01-01T00:00:00Z' },
  { id: 't-bollette', name: 'Bollette', type: 'category', color: '#F59E0B', icon: 'zap', isActive: true, createdAt: '2024-01-01T00:00:00Z' },
  { id: 't-spesa', name: 'Spesa alimentare', type: 'category', color: '#22C55E', icon: 'shopping-cart', isActive: true, createdAt: '2024-01-01T00:00:00Z' },
  { id: 't-scuola', name: 'Scuola', type: 'category', color: '#8B5CF6', icon: 'book-open', isActive: true, createdAt: '2024-01-01T00:00:00Z' },
  { id: 't-babysitter', name: 'Baby Sitter', type: 'category', color: '#EC4899', icon: 'baby', isActive: true, createdAt: '2024-01-01T00:00:00Z' },
  { id: 't-auto', name: 'Automobile', type: 'category', color: '#64748B', icon: 'car', isActive: true, createdAt: '2024-01-01T00:00:00Z' },
  { id: 't-f24', name: 'F24', type: 'category', color: '#DC2626', icon: 'file-text', isActive: true, createdAt: '2024-01-01T00:00:00Z' },
  { id: 't-multe', name: 'Multe', type: 'category', color: '#EF4444', icon: 'alert-triangle', isActive: true, createdAt: '2024-01-01T00:00:00Z' },
  { id: 't-corsi', name: 'Corsi VS / Opzionetika', type: 'category', color: '#22C55E', icon: 'presentation', isActive: true, createdAt: '2024-01-01T00:00:00Z' },
  { id: 't-coreografia', name: 'Coreografia', type: 'category', color: '#22C55E', icon: 'music-2', isActive: true, createdAt: '2024-01-01T00:00:00Z' },
]

// ============================================================
// COUNTERPARTIES
// ============================================================

export const COUNTERPARTIES: Counterparty[] = [
  { id: 'cp-netflix', name: 'Netflix', type: 'service', defaultCategory: 'Netflix', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'cp-spotify', name: 'Spotify', type: 'service', defaultCategory: 'Spotify', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'cp-ade', name: 'Agenzia delle Entrate', type: 'government', defaultCategory: 'F24', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'cp-proprietario', name: 'Proprietario casa', type: 'person', defaultCategory: 'Affitto', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'cp-monia', name: 'Monia (baby sitter)', type: 'person', defaultCategory: 'Baby Sitter', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'cp-esselunga', name: 'Esselunga', type: 'store', defaultCategory: 'Spesa alimentare', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'cp-enel', name: 'Enel', type: 'company', defaultCategory: 'Bollette', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'cp-scacco', name: 'Scacco Matto SRLS', type: 'company', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
]

// ============================================================
// SAMPLE TRANSACTIONS (per dimostrare le funzionalita')
// ============================================================

export const TRANSACTIONS: Transaction[] = [
  { id: 'tx-1', date: '2025-02-01', description: 'Affitto febbraio 2025', amount: '-1800.00', currency: 'EUR', containerId: 'c-isp', counterpartyId: 'cp-proprietario', type: 'expense', status: 'completed', source: 'manual', createdAt: '2025-02-01T00:00:00Z', updatedAt: '2025-02-01T00:00:00Z', tags: [TAGS[0], TAGS[10]] },
  { id: 'tx-2', date: '2025-02-03', description: 'Spesa Esselunga', amount: '-187.40', currency: 'EUR', containerId: 'c-amex-av', counterpartyId: 'cp-esselunga', type: 'expense', status: 'completed', source: 'manual', createdAt: '2025-02-03T00:00:00Z', updatedAt: '2025-02-03T00:00:00Z', tags: [TAGS[1], TAGS[12]] },
  { id: 'tx-3', date: '2025-02-05', description: 'Fattura coreografia - Spettacolo su ghiaccio Torino', amount: '3500.00', currency: 'EUR', containerId: 'c-isp', type: 'income', status: 'completed', source: 'manual', createdAt: '2025-02-05T00:00:00Z', updatedAt: '2025-02-05T00:00:00Z', tags: [TAGS[0], TAGS[19]] },
  { id: 'tx-4', date: '2025-02-05', description: 'Netflix mensile', amount: '-17.99', currency: 'EUR', containerId: 'c-amex-av', counterpartyId: 'cp-netflix', type: 'expense', status: 'completed', source: 'manual', createdAt: '2025-02-05T00:00:00Z', updatedAt: '2025-02-05T00:00:00Z', tags: [TAGS[1]] },
  { id: 'tx-5', date: '2025-02-06', description: 'Monia baby sitter - settimana 5-9 Feb', amount: '-300.00', currency: 'EUR', containerId: 'c-isp', counterpartyId: 'cp-monia', type: 'expense', status: 'completed', source: 'manual', createdAt: '2025-02-06T00:00:00Z', updatedAt: '2025-02-06T00:00:00Z', tags: [TAGS[1], TAGS[14]] },
  { id: 'tx-6', date: '2025-02-07', description: 'Bolletta Enel bimestre dic-gen', amount: '-245.80', currency: 'EUR', containerId: 'c-isp', counterpartyId: 'cp-enel', type: 'expense', status: 'completed', source: 'manual', createdAt: '2025-02-07T00:00:00Z', updatedAt: '2025-02-07T00:00:00Z', tags: [TAGS[1], TAGS[11]] },
  { id: 'tx-7', date: '2025-02-10', description: 'Incasso corso Opzionetika - modulo avanzato', amount: '4200.00', currency: 'EUR', containerId: 'c-isp-kairos', type: 'income', status: 'completed', source: 'manual', sharedWithSubjectId: 's-mirko', sharePercentage: '50', createdAt: '2025-02-10T00:00:00Z', updatedAt: '2025-02-10T00:00:00Z', tags: [TAGS[3], TAGS[5], TAGS[18]] },
  { id: 'tx-8', date: '2025-02-12', description: 'Trasferimento ISP -> Binance', amount: '-2000.00', currency: 'EUR', containerId: 'c-isp', type: 'transfer_out', transferLinkedId: 'tx-9', status: 'completed', source: 'manual', createdAt: '2025-02-12T00:00:00Z', updatedAt: '2025-02-12T00:00:00Z' },
  { id: 'tx-9', date: '2025-02-12', description: 'Trasferimento ISP -> Binance', amount: '2000.00', currency: 'EUR', containerId: 'c-binance', type: 'transfer_in', transferLinkedId: 'tx-8', status: 'completed', source: 'manual', createdAt: '2025-02-12T00:00:00Z', updatedAt: '2025-02-12T00:00:00Z' },
  { id: 'tx-10', date: '2025-02-15', description: 'F24 - IVA 4Q 2024', amount: '-3200.00', currency: 'EUR', containerId: 'c-isp-kairos', counterpartyId: 'cp-ade', type: 'expense', status: 'pending', source: 'manual', createdAt: '2025-02-15T00:00:00Z', updatedAt: '2025-02-15T00:00:00Z', tags: [TAGS[2], TAGS[16]] },
  { id: 'tx-11', date: '2025-02-18', description: 'Fattura consulenza broker XYZ', amount: '1500.00', currency: 'EUR', containerId: 'c-isp-kairos', type: 'income', status: 'pending', source: 'manual', sharedWithSubjectId: 's-mirko', sharePercentage: '50', createdAt: '2025-02-18T00:00:00Z', updatedAt: '2025-02-18T00:00:00Z', tags: [TAGS[3], TAGS[5]] },
  { id: 'tx-12', date: '2025-01-28', description: 'Versamento c/capitale Shuffle (Ghiaccio Spettacolo)', amount: '-5000.00', currency: 'EUR', containerId: 'c-isp-kairos', type: 'capital_injection', status: 'completed', source: 'manual', createdAt: '2025-01-28T00:00:00Z', updatedAt: '2025-01-28T00:00:00Z', tags: [TAGS[4], TAGS[6]] },
]

// ============================================================
// HELPERS
// ============================================================

export function getSubject(id: string): Subject | undefined {
  return SUBJECTS.find(s => s.id === id)
}

export function getContainer(id: string): Container | undefined {
  return CONTAINERS.find(c => c.id === id)
}

export function getCounterparty(id: string): Counterparty | undefined {
  return COUNTERPARTIES.find(c => c.id === id)
}

export function getContainersBySubject(subjectId: string): Container[] {
  return CONTAINERS.filter(c => c.subjectId === subjectId)
}

export function getContainersByType(type: Container['type']): Container[] {
  return CONTAINERS.filter(c => c.type === type)
}

export function getTransactionsByContainer(containerId: string): Transaction[] {
  return TRANSACTIONS.filter(t => t.containerId === containerId)
}
