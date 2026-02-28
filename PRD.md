# EN€RGY — Product Requirements Document (PRD)

> **Versione:** 1.0
> **Ultimo aggiornamento:** 2026-02-28
> **Motto:** "Il denaro è energia"

---

## 1. Panoramica del Progetto

**EN€RGY** è un'applicazione web di gestione finanziaria personale e aziendale.
Supporta più soggetti (persone fisiche e società), più conti/contenitori per ciascun soggetto, multi-valuta, condivisione costi tra partner, ricorrenze, piani rateali, budget, proiezioni e importazione CSV da banche/broker/crypto.

L'interfaccia è interamente in **italiano**, con tema **dark-only** (sfondo zinc-950) e colore primario **verde "energy"** (#22c55e).

L'app gira come **SPA React** servita da Vite, con API serverless Vercel (un unico catch-all handler) che parlano con un database **PostgreSQL Neon** tramite **Supabase JS client**.

---

## 2. Tech Stack

### Frontend
| Libreria | Versione | Uso |
|----------|---------|-----|
| React | 19.x | UI framework |
| React Router DOM | 7.x | Routing client-side |
| TanStack React Query | 5.x | Server state, caching, mutazioni |
| TanStack React Table | 8.x | Tabelle dati con sorting/paginazione |
| Tailwind CSS | 4.x | Styling utility-first (configurazione via `@theme` in CSS, NO tailwind.config.js) |
| Lucide React | 0.563.x | Iconografia |
| Recharts | 3.x | Grafici (usato nelle statistiche) |
| date-fns | 4.x | Formattazione date (locale italiano) |
| PapaParse | 5.x | Parsing CSV |
| clsx + tailwind-merge | — | Composizione classi CSS |
| uuid | 13.x | Generazione ID |

### Backend / Database
| Tecnologia | Uso |
|-----------|-----|
| Vercel Serverless Functions | API handler (singolo file catch-all) |
| PostgreSQL (Neon) | Database |
| Supabase JS Client | ORM/query builder |
| Drizzle ORM | Schema definition (opzionale, presente nel progetto) |

### Build & Deploy
| Tool | Uso |
|------|-----|
| Vite | Build tool + dev server |
| TypeScript | Tipizzazione statica (strict mode) |
| Vercel | Hosting & deploy |

---

## 3. Architettura

```
┌─────────────────────────────────────────────────┐
│                    BROWSER                       │
│                                                  │
│  React SPA (Vite)                               │
│  ├── React Router → 11 pagine                   │
│  ├── React Query → cache + mutazioni            │
│  └── API client (fetch wrapper)                 │
│           │                                      │
│           ▼                                      │
│  /api/[...path].ts  (Vercel Serverless)          │
│  ├── setCors(res)                               │
│  ├── routing manuale su segmenti path            │
│  └── Supabase JS client                         │
│           │                                      │
│           ▼                                      │
│  PostgreSQL (Neon Serverless)                    │
│  └── ~15 tabelle + 2 junction tables            │
└─────────────────────────────────────────────────┘
```

### Struttura file

```
/
├── api/
│   ├── [...path].ts          ← Unico handler API (catch-all)
│   └── _lib/
│       └── supabase.js       ← Client Supabase + helper risposte
├── src/
│   ├── main.tsx              ← Entry point (React Query Provider + Router)
│   ├── App.tsx               ← Definizione route
│   ├── index.css             ← Tailwind @theme + stili globali
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx ← Layout responsive con sidebar
│   │   │   └── Sidebar.tsx   ← Navigazione laterale
│   │   └── ui/
│   │       ├── Badge.tsx     ← Badge con varianti
│   │       ├── Input.tsx     ← Input, Select, Textarea
│   │       ├── Modal.tsx     ← Modal portal con backdrop
│   │       ├── StatCard.tsx  ← Card metrica con trend
│   │       └── EmptyState.tsx← Stato vuoto con CTA
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Transactions.tsx
│   │   ├── Containers.tsx
│   │   ├── Subjects.tsx
│   │   ├── Budget.tsx
│   │   ├── Recurrences.tsx
│   │   ├── Pendenze.tsx
│   │   ├── Projections.tsx
│   │   ├── ImportData.tsx
│   │   ├── Statistics.tsx
│   │   └── Settings.tsx
│   ├── lib/
│   │   ├── api.ts            ← Client API (fetch wrapper)
│   │   ├── hooks.ts          ← React Query hooks per ogni risorsa
│   │   ├── csvEngine.ts      ← Motore importazione CSV
│   │   ├── transforms.ts     ← snake_case ↔ camelCase
│   │   ├── utils.ts          ← Formattazione, helper
│   │   └── constants.ts      ← Costanti app
│   └── types/
│       └── index.ts          ← Tutte le interfacce TypeScript
├── public/
│   └── manifest.json         ← PWA manifest
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### Path alias
- `@/*` → `./src/*`
- `@db/*` → `./db/*`

---

## 4. Design System

### 4.1 Colori

#### Colore primario — "Energy" (verde)
```
energy-50:  #f0fdf4
energy-100: #dcfce7
energy-200: #bbf7d0
energy-300: #86efac
energy-400: #4ade80
energy-500: #22c55e  ← primario (CTA, accent, logo)
energy-600: #16a34a  ← hover
energy-700: #15803d
energy-800: #166534
energy-900: #14532d
```

#### Colori semantici
| Variabile | Hex | Uso |
|-----------|-----|-----|
| `expense` | `#ef4444` | Uscite, errori |
| `income` | `#22c55e` | Entrate, successo |
| `transfer` | `#3b82f6` | Trasferimenti, info |
| `pending` | `#f59e0b` | In attesa, warning |

#### Scala Zinc (neutri, tema dark)
| Token | Hex | Uso |
|-------|-----|-----|
| zinc-950 | `#09090b` | Sfondo app |
| zinc-900 | `#18181b` | Card, sidebar, modal |
| zinc-800 | `#27272a` | Bordi |
| zinc-700 | `#3f3f46` | Bordi input |
| zinc-600 | `#52525b` | Testo disabilitato |
| zinc-500 | `#71717a` | Testo terziario |
| zinc-400 | `#a1a1aa` | Testo secondario, label |
| zinc-300 | `#d4d4d8` | Testo corpo |
| zinc-200 | `#e4e4e7` | Testo input |
| zinc-100 | `#f4f4f5` | Testo primario, titoli |

### 4.2 Tipografia

| Font | Stack | Uso |
|------|-------|-----|
| Sans | `"Inter", system-ui, -apple-system, sans-serif` | Tutto il testo |
| Mono | `"JetBrains Mono", "Fira Code", monospace` | Importi, valute, dati |

### 4.3 Bordi e Arrotondamenti
- Input/Button: `rounded-lg` (8px)
- Card/Modal: `rounded-xl` (12px)
- Badge/Avatar: `rounded-full`

### 4.4 Ombre
- Solo il Modal usa `shadow-2xl`. Tutto il resto è flat.

### 4.5 Pattern di interazione
- **Hover button**: `transition-colors hover:bg-energy-400` (schiarisce)
- **Hover link sidebar**: `hover:bg-zinc-800 hover:text-zinc-200`
- **Focus input**: `focus:border-energy-500 focus:ring-1 focus:ring-energy-500`
- **Disabled**: `disabled:opacity-50 disabled:cursor-not-allowed`
- **Active sidebar**: `bg-energy-500/10 text-energy-400`

### 4.6 Responsive
- Mobile-first, breakpoint principale: `lg:` (1024px)
- Sidebar: drawer a sinistra su mobile (hamburger), fissa su desktop
- Grid card: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`

---

## 5. Componenti UI Condivisi

### 5.1 Badge
```typescript
interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline'
  size?: 'sm' | 'md'
  color?: string // colore custom hex
}
```
- Ogni variante ha `bg-{color}-500/15 text-{color}-400`
- Supporta colore custom con opacità dinamica

### 5.2 Modal
```typescript
interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}
```
- Rendered via portal su `document.body`
- Chiusura con ESC, click backdrop
- Animazione fade + zoom-in-95
- Backdrop `bg-black/60 backdrop-blur-sm`
- Body scroll lock quando aperto

### 5.3 StatCard
```typescript
interface StatCardProps {
  title: string
  value: string
  subtitle?: string
  icon: LucideIcon
  trend?: { value: number; label: string }
}
```
- Icona in cerchio `bg-energy-500/15`
- Trend positivo verde, negativo rosso

### 5.4 Input / Select / Textarea
- Tutti con supporto `label`, `error`, `forwardRef`
- Stile uniforme: `border-zinc-700 bg-zinc-800 text-zinc-100`
- Errore: bordo `border-red-500` + messaggio rosso sotto

### 5.5 EmptyState
```typescript
interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: { label: string; onClick: () => void }
}
```

---

## 6. Database Schema

### 6.1 Tabelle Principali

#### `subjects` — Soggetti (persone fisiche e società)
| Colonna | Tipo | Note |
|---------|------|------|
| id | uuid PK | gen_random_uuid() |
| type | text | `'person'` \| `'company'` |
| name | text | NOT NULL |
| legal_form | text | SRLS, SRL, LTD... (solo company) |
| tax_id | text | P.IVA, CF |
| country | text | Default `'IT'` |
| role | text | `'owner'` \| `'family'` \| `'partner'` \| `'other'` |
| parent_subject_id | uuid FK → subjects | Gerarchia (figli sotto padre) |
| notes | text | |
| is_active | boolean | Default true |
| created_at | timestamptz | Default now() |
| updated_at | timestamptz | Default now() |

#### `containers` — Contenitori (conti, carte, wallet, ecc.)
| Colonna | Tipo | Note |
|---------|------|------|
| id | uuid PK | |
| subject_id | uuid FK → subjects | NOT NULL |
| name | text | NOT NULL |
| type | text | `'bank_account'` \| `'credit_card'` \| `'trading'` \| `'crypto'` \| `'payment_service'` \| `'cash'` \| `'savings'` \| `'voucher'` \| `'other'` |
| provider | text | "Intesa Sanpaolo", "Binance", ecc. |
| currency | text | Default `'EUR'` |
| is_multi_currency | boolean | Default false |
| initial_balance | decimal(15,4) | Default 0 |
| billing_day | integer | Giorno fatturazione (carte credito) |
| linked_container_id | uuid FK → containers | Carta → conto collegato |
| goal_amount | decimal | Obiettivo risparmio |
| goal_description | text | |
| icon | text | |
| color | text | Hex color per UI |
| sort_order | integer | Ordine visualizzazione |
| is_pinned | boolean | Preferito in dashboard |
| is_active | boolean | Default true |
| notes | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**Saldo calcolato:** `current_balance = initial_balance + SUM(transactions.amount)` dove status ≠ `'cancelled'`

#### `counterparties` — Controparti
| Colonna | Tipo | Note |
|---------|------|------|
| id | uuid PK | |
| name | text | NOT NULL |
| type | text | `'person'` \| `'company'` \| `'service'` \| `'store'` \| `'government'` \| `'other'` |
| default_category | text | |
| notes | text | |
| is_active | boolean | |
| created_at / updated_at | timestamptz | |

#### `tags` — Tag gerarchici
| Colonna | Tipo | Note |
|---------|------|------|
| id | uuid PK | |
| name | text | NOT NULL |
| parent_id | uuid FK → tags | Tag genitore (gerarchia) |
| type | text | `'category'` \| `'scope'` \| `'purpose'` \| `'custom'` |
| color | text | Hex |
| icon | text | |
| is_active | boolean | |
| created_at | timestamptz | |

#### `transactions` — Transazioni (tabella principale)
| Colonna | Tipo | Note |
|---------|------|------|
| id | uuid PK | |
| date | date | Data contabile |
| value_date | date | Data valuta (opzionale) |
| description | text | |
| notes | text | |
| amount | decimal(15,4) | Negativo = uscita, positivo = entrata |
| currency | text | Default `'EUR'` |
| amount_eur | decimal | Controvalore in EUR |
| exchange_rate | decimal(12,6) | Tasso cambio |
| container_id | uuid FK → containers | NOT NULL |
| counterparty_id | uuid FK → counterparties | |
| type | text | Vedi sotto |
| transfer_linked_id | uuid FK → transactions | Link bidirezionale per trasferimenti |
| status | text | `'completed'` \| `'pending'` \| `'projected'` \| `'cancelled'` |
| source | text | `'manual'` \| `'csv_import'` \| `'pdf_import'` \| `'recurring_generated'` |
| import_batch_id | uuid FK → import_batches | |
| recurrence_id | uuid FK → recurrences | Template che l'ha generata |
| split_parent_id | uuid FK → transactions | Per transazioni split |
| shared_with_subject_id | uuid FK → subjects | Condivisione costi |
| share_percentage | decimal(5,2) | % condivisione |
| installment_plan_id | uuid FK → installment_plans | |
| installment_number | integer | |
| external_id | text | ID esterno (dedup) |
| external_hash | text | Hash dedup da import |
| created_at / updated_at | timestamptz | |

**Transaction Types:**
- `income` — Entrata
- `expense` — Uscita
- `transfer_out` — Trasferimento in uscita (negativo)
- `transfer_in` — Trasferimento in entrata (positivo)
- `capital_injection` — Apporto capitale
- `loan_out` — Prestito erogato
- `loan_in` — Prestito ricevuto
- `repayment_out` — Rimborso in uscita
- `repayment_in` — Rimborso in entrata

#### `transaction_tags` — Junction N:N
| Colonna | Tipo |
|---------|------|
| transaction_id | uuid FK → transactions (cascade delete) |
| tag_id | uuid FK → tags (cascade delete) |
| PK: (transaction_id, tag_id) |

#### `recurrences` — Ricorrenze (template)
| Colonna | Tipo | Note |
|---------|------|------|
| id | uuid PK | |
| description | text | NOT NULL |
| frequency | text | `'daily'` \| `'weekly'` \| `'biweekly'` \| `'monthly'` \| `'bimonthly'` \| `'quarterly'` \| `'semi_annual'` \| `'annual'` \| `'custom'` |
| interval_days | integer | Per frequenza custom |
| day_of_month | integer | Es. 15 |
| day_of_week | integer | 0=Lun, 6=Dom |
| business_days_only | boolean | |
| amount | decimal | |
| amount_is_estimate | boolean | Importo stimato |
| currency | text | Default EUR |
| container_id | uuid FK | |
| counterparty_id | uuid FK | |
| type | text | income/expense/ecc. |
| shared_with_subject_id | uuid FK → subjects | |
| share_percentage | decimal(5,2) | |
| start_date | date | NOT NULL |
| end_date | date | Null = indefinita |
| reminder_days_before | integer | |
| is_active | boolean | |
| created_at / updated_at | timestamptz | |

#### `recurrence_tags` — Junction N:N
| Colonna | Tipo |
|---------|------|
| recurrence_id | uuid FK (cascade) |
| tag_id | uuid FK (cascade) |

#### `installment_plans` — Piani rateali
| Colonna | Tipo | Note |
|---------|------|------|
| id | uuid PK | |
| description | text | |
| total_amount | decimal(15,4) | |
| currency | text | |
| number_of_installments | integer | |
| counterparty_id | uuid FK | |
| container_id | uuid FK | |
| reminder_days_before | integer | |
| notes | text | |
| is_active | boolean | |
| created_at / updated_at | timestamptz | |

#### `installments` — Rate individuali
| Colonna | Tipo | Note |
|---------|------|------|
| id | uuid PK | |
| plan_id | uuid FK → installment_plans (cascade) | |
| installment_number | integer | |
| amount | decimal(15,4) | |
| due_date | date | |
| status | text | `'pending'` \| `'paid'` \| `'overdue'` \| `'cancelled'` |
| transaction_id | uuid FK → transactions | Link a pagamento effettivo |
| reminder_days_before | integer | |
| notes | text | |
| created_at / updated_at | timestamptz | |

#### `budget_periods` — Periodi budget
| Colonna | Tipo |
|---------|------|
| id | uuid PK |
| name | text |
| start_date | date |
| end_date | date |
| is_active | boolean |
| created_at | timestamptz |

#### `budget_allocations` — Allocazioni budget
| Colonna | Tipo | Note |
|---------|------|------|
| id | uuid PK | |
| period_id | uuid FK → budget_periods (cascade) | |
| tag_id | uuid FK → tags | Categoria |
| subject_id | uuid FK → subjects | |
| allocated_amount | decimal(15,4) | |
| currency | text | |
| notes | text | |
| created_at / updated_at | timestamptz | |

#### `import_profiles` — Profili importazione
| Colonna | Tipo | Note |
|---------|------|------|
| id | uuid PK | |
| container_id | uuid FK | |
| name | text | |
| file_type | text | csv/xlsx/pdf |
| delimiter | text | |
| date_format | text | DD/MM/YYYY ecc. |
| decimal_separator | text | |
| thousands_separator | text | |
| encoding | text | |
| skip_rows | integer | |
| column_mapping | jsonb | `{ date: "Col1", description: "Col2", ... }` |
| amount_inverted | boolean | |
| separate_amount_columns | boolean | |
| income_column | text | Nome colonna entrate |
| expense_column | text | Nome colonna uscite |
| dedup_columns | text[] | Colonne per hash dedup |
| notes | text | |
| created_at / updated_at | timestamptz | |

#### `import_batches` — Log importazioni
| Colonna | Tipo |
|---------|------|
| id | uuid PK |
| profile_id | uuid FK |
| container_id | uuid FK |
| filename | text |
| imported_at | timestamptz |
| total_rows | integer |
| imported_rows | integer |
| skipped_rows | integer |
| duplicate_rows | integer |
| status | text (`'processing'` \| `'completed'` \| `'failed'` \| `'partial'`) |
| error_log | jsonb |
| notes | text |

#### `savings_goals` — Obiettivi risparmio
| Colonna | Tipo |
|---------|------|
| id | uuid PK |
| container_id | uuid FK |
| name | text |
| target_amount | decimal(15,4) |
| currency | text |
| target_date | date |
| current_amount | decimal |
| notes | text |
| is_active | boolean |
| created_at / updated_at | timestamptz |

#### `exchange_rates` — Tassi di cambio
| Colonna | Tipo |
|---------|------|
| id | uuid PK |
| base_currency | text |
| target_currency | text |
| rate | decimal(12,6) |
| date | date |
| source | text |

#### `reminders` — Promemoria
| Colonna | Tipo |
|---------|------|
| id | uuid PK |
| title | text |
| description | text |
| recurrence_id | uuid FK (cascade) |
| installment_id | uuid FK (cascade) |
| due_date | date |
| reminder_date | date |
| status | text (`'pending'` \| `'sent'` \| `'dismissed'`) |
| created_at | timestamptz |

---

## 7. API Endpoints

Tutti gli endpoint sono gestiti da un unico file catch-all `/api/[...path].ts`.
Tutte le risposte di successo wrappano i dati in `{ data: T }`.
Le risposte di errore usano `{ error: "tipo", message: "dettaglio" }`.

### 7.1 CORS
Ogni risposta imposta CORS headers. Le richieste OPTIONS ricevono 204.

### 7.2 Pattern POST-based actions
Per aggirare limitazioni di Vercel con path multi-segmento, molte operazioni usano POST con `_action` nel body:
- `_action: 'update'` → aggiornamento
- `_action: 'delete'` → cancellazione
- `_action: 'transfer'` → crea trasferimento
- `_action: 'update-transfer'` → aggiorna trasferimento
- `_action: 'get'` → lettura via POST

### 7.3 Endpoints

#### Subjects — `/api/subjects`
| Metodo | Path | Body | Risposta |
|--------|------|------|----------|
| GET | `/subjects` | — | Lista soggetti ordinati per nome |
| GET | `/subjects/:id` | — | Singolo soggetto |
| POST | `/subjects` | `{ name, type, role?, parentSubjectId?, ... }` | Soggetto creato |
| POST | `/subjects` | `{ _action: 'update', id, ...campi }` | Soggetto aggiornato |
| POST | `/subjects` | `{ _action: 'delete', id }` | `{ deleted: true }` |

#### Containers — `/api/containers`
| Metodo | Path | Body | Risposta |
|--------|------|------|----------|
| GET | `/containers` | — | Lista con saldo calcolato (`initial_balance + SUM(transactions)`) e `subject_name` |
| GET | `/containers/:id` | — | Singolo con subject_name |
| POST | `/containers` | `{ name, type, subjectId, ... }` | Creato |
| POST | `/containers` | `{ _action: 'update', id, ... }` | Aggiornato |
| POST | `/containers` | `{ _action: 'delete', id }` | Eliminato (solo se 0 transazioni) |

#### Counterparties — `/api/counterparties`
| Metodo | Path | Body | Risposta |
|--------|------|------|----------|
| GET | `/counterparties` | — | Lista ordinata per nome |
| POST | `/counterparties` | `{ name, type?, ... }` | Creata |
| POST | `/counterparties` | `{ _action: 'update'/'delete', id, ... }` | Aggiornata/Eliminata |

#### Tags — `/api/tags`
| Metodo | Path | Body | Risposta |
|--------|------|------|----------|
| GET | `/tags` | — | Lista ordinata per type, name |
| POST | `/tags` | `{ name, type, color?, parentId?, ... }` | Creato |
| POST | `/tags` | `{ _action: 'update'/'delete', id, ... }` | Aggiornato/Eliminato |

#### Transactions — `/api/transactions`
| Metodo | Path | Body/Query | Risposta |
|--------|------|------------|----------|
| GET | `/transactions?limit=500&offset=0&containerId=...&type=...&status=...&dateFrom=...&dateTo=...&search=...` | Query params | `{ rows[], total, limit, offset }` — con join a container, counterparty, subject; tag caricati separatamente dalla junction table |
| GET | `/transactions/:id` | — | Transazione con array `tags` |
| POST | `/transactions?action=batch` | `{ transactions: [...] }` | `{ inserted, failed, total, errors? }` — chunk da 50 |
| POST | `/transactions` | `{ date, amount, containerId, type, tagIds?, ... }` | Transazione creata + tag associati |
| POST | `/transactions` | `{ _action: 'transfer', date, amount, fromContainerId, toContainerId, ... }` | `{ transferOut, transferIn }` — coppia collegata via `transfer_linked_id` |
| POST | `/transactions` | `{ _action: 'update', id, tagIds?, ... }` | Aggiornata (sync tag: delete+insert) |
| POST | `/transactions` | `{ _action: 'update-transfer', id, fromContainerId, toContainerId, ... }` | Aggiorna entrambi i lati |
| POST | `/transactions` | `{ _action: 'delete', id }` | Eliminata + eventuale linked eliminata |

#### Recurrences — `/api/recurrences`
| Metodo | Path | Body | Risposta |
|--------|------|------|----------|
| GET | `/recurrences` | — | Lista con container_name, counterparty_name |
| POST | `/recurrences` | `{ description, frequency, type, startDate, ... }` | Creata |
| POST | `/recurrences` | `{ _action: 'update'/'delete', id, ... }` | Aggiornata/Eliminata |

#### Budget — `/api/budget`
| Metodo | Path | Body | Risposta |
|--------|------|------|----------|
| GET | `/budget` | — | Lista periodi con allocazioni (include tag_name, tag_color) |
| GET | `/budget/:periodId` | — | Singolo periodo con allocazioni |
| POST | `/budget` | `{ name, startDate, endDate }` | Periodo creato |
| POST | `/budget/allocations` | `{ periodId, tagId?, allocatedAmount, currency? }` | Allocazione creata |
| POST | `/budget` | `{ _action: 'update'/'delete', id }` | Periodo aggiornato/eliminato |
| POST | `/budget` | `{ _action: 'delete-allocation', id }` | Allocazione eliminata |

#### Stats (Dashboard) — `/api/stats`
| Metodo | Path | Risposta |
|--------|------|----------|
| GET | `/stats` | `{ balances[{currency, total}], monthly{income, expenses, count}, pending{credits, debits}, recentTransactions[ultimi 10], activeContainers }` |

**Calcoli stats:**
- `balances`: SUM(initial_balance + transazioni) per valuta, solo contenitori attivi, escludendo cancelled
- `monthly`: Entrate/uscite del mese corrente
- `pending`: Transazioni con status `'pending'`
- `recentTransactions`: Ultime 10 per data desc

#### Health — `/api/health`
| Metodo | Path | Risposta |
|--------|------|----------|
| GET | `/health` | `{ status, timestamp, env, checks }` |

---

## 8. API Client & React Query Hooks

### 8.1 API Client (`src/lib/api.ts`)

Wrapper fetch con:
- Base path: `/api`
- Gestione automatica JSON
- Unwrap `{ data: T }` dalle risposte
- Metodi: `api.get<T>()`, `api.post<T>()`, `api.put<T>()`, `api.patch<T>()`, `api.delete<T>()`

Resource API specifiche:
- `subjectsApi.list/get/create/update/delete()`
- `containersApi.list/get/create/update/delete()`
- `counterpartiesApi.list/get/create/update/delete()`
- `tagsApi.list/get/create/update/delete()`
- `transactionsApi.list/get/create/batchCreate/update/delete/createTransfer/updateTransfer()`
- `recurrencesApi.list/get/create/update/delete()`
- `budgetApi.listPeriods/getPeriod/createPeriod/updatePeriod/deletePeriod/createAllocation/deleteAllocation()`
- `statsApi.getDashboard()`

### 8.2 React Query Hooks (`src/lib/hooks.ts`)

**Query keys:**
```typescript
queryKeys = {
  subjects: ['subjects'],
  containers: ['containers'],
  counterparties: ['counterparties'],
  tags: ['tags'],
  transactions: (params?) => ['transactions', params],
  recurrences: ['recurrences'],
  budget: ['budget'],
  stats: ['stats'],
}
```

**Hooks per ogni risorsa:**
- `useSubjects()`, `useCreateSubject()`, `useUpdateSubject()`, `useDeleteSubject()`
- `useContainers()`, `useCreateContainer()`, `useUpdateContainer()`, `useToggleContainerPin()` (con update ottimistico), `useDeleteContainer()`
- `useCounterparties()`, `useCreateCounterparty()`
- `useTags()`, `useCreateTag()`, `useUpdateTag()`, `useDeleteTag()`
- `useTransactions(params?)`, `useCreateTransaction()`, `useUpdateTransaction()`, `useDeleteTransaction()`
- `useRecurrences()`, `useCreateRecurrence()`, `useUpdateRecurrence()`, `useDeleteRecurrence()`
- `useBudgetPeriods()`, `useCreateBudgetPeriod()`, `useDeleteBudgetPeriod()`, `useCreateBudgetAllocation()`, `useDeleteBudgetAllocation()`
- `useDashboardStats()`

**Tutte le mutation invalidano le query correlate + stats on success.**

React Query configurato con:
- `staleTime: 5 minuti`
- `retry: 1`

Per la pagina Transactions, `useTransactions` usa `placeholderData: keepPreviousData` per evitare flicker e re-mount durante il cambio filtri.

---

## 9. Pagine dell'Applicazione

### 9.1 Dashboard (`/`)
- Saluto con data corrente in italiano
- 6 stat card: Patrimonio Totale, Entrate Mese, Uscite Mese, Netto Mese, Crediti Pendenti, Debiti Pendenti
- Conti Preferiti: contenitori pinnati o top 10 per saldo
- Per Tipologia: sommario raggruppato per tipo contenitore
- Transazioni Recenti: ultime 8, con link "Vedi tutte"
- Icone per tipo contenitore (Landmark=banca, CreditCard=carta, TrendingUp=trading, Bitcoin=crypto, Smartphone=payment, Banknote=cash, PiggyBank=savings, Ticket=voucher, Wallet=altro)

### 9.2 Transazioni (`/transactions`)
- Barra filtri: ricerca testo (debounced 300ms), date da/a, contenitore, tipo transazione, stato
- **TUTTI i filtri sono debounced a 300ms** (ricerca, date, dropdown) tramite un unico stato `debouncedFilters`
- Summary card: Entrate, Uscite, Netto, Conteggio
- Tabella TanStack Table con sorting e paginazione (25 righe/pagina)
- Colonne: Data, Descrizione, Contenitore, Controparte, Tipo, Stato, Importo
- Azioni per riga: Edit, Delete
- Modal creazione/modifica transazione:
  - Campi: data, tipo, descrizione, importo, valuta, contenitore, controparte, stato, note
  - Modalità trasferimento: seleziona contenitore FROM/TO, crea coppia collegata
  - Condivisione costi: seleziona soggetto e percentuale
  - Gestione tag
- `keepPreviousData` su React Query per evitare unmount/remount durante cambio filtri

### 9.3 Contenitori (`/containers`)
- Header con totale conti e saldo EUR
- Filtri: ricerca nome/provider, filtro soggetto, toggle inattivi
- Raggruppamento: per Tipo o per Soggetto
- Card contenitore: pallino colore, nome, provider, badge stato, stella pin, saldo, valuta, badge multi-currency
- Footer sommario: totale conti e saldi per valuta
- Modal creazione/modifica: nome, tipo, soggetto, provider, valuta, saldo iniziale, multi-currency, attivo, color picker (31 preset), billing day, note
- Toggle pin su dashboard
- Delete solo se 0 transazioni

### 9.4 Soggetti (`/subjects`)
- Header con conteggio attivi e breakdown persone/società
- Vista griglia/lista toggle
- Sezioni separate: Persone Fisiche, Società
- Card: icona, nome, paese (flag 🇮🇹🇬🇧🇷🇴🇺🇸), forma legale, ruolo (badge), conteggio contenitori, soggetto padre, note
- Modal: tipo (persona/società), nome, forma legale, paese, ruolo, soggetto padre, note
- Delete solo se 0 contenitori associati

### 9.5 Budget (`/budget`)
- Selettore periodo con navigazione prev/next
- 3 card: Budget Totale Allocato, Speso Finora (%), Rimanente (%)
- Tabella Budget vs Consuntivo: categoria, allocato, consuntivo, differenza (colorata), barra progresso, icona stato
- Riga totali in fondo
- Modal periodo: nome, data inizio/fine
- Modal allocazione: categoria (da tag), importo allocato

### 9.6 Ricorrenze (`/recurrences`)
- 4 stat card: Ricorrenze Attive, Uscite Mensili, Entrate Mensili, Prossima Scadenza
- Filtri: ricerca, tipo (tutte/uscite/entrate/trasferimenti), toggle "mostra in pausa"
- Lista ricorrenze: icona direzione, descrizione + badge (stimato, 50/50, in pausa), contenitore+controparte, frequenza, tag, prossima data, importo + impatto mensile
- Azioni: Pausa/Play, Edit, Delete
- Sommario impatto mensile in fondo
- Modal: tipo, descrizione, importo, valuta, contenitore, controparte, frequenza, giorno mese/settimana, solo giorni lavorativi, date inizio/fine, giorni preavviso, tag

### 9.7 Pendenze (`/pendenze`)
- 4 card: Crediti Pendenti, Debiti Pendenti, Netto Pendente, Piani Rateali Attivi
- Sezione Crediti: lista crediti da incassare, ordinati per scadenza, indicatori urgenza (scaduto=rosso pulsante, urgente=ambra <7gg), pulsante "Incassa"
- Sezione Debiti: stessa struttura, pulsante "Paga"
- Sezione Piani Rateali: descrizione, controparte, importo totale, barra progresso pagato/rimanente, prossima rata
- Modal: descrizione, controparte, importo, scadenza, contenitore, note

### 9.8 Proiezioni (`/projections`)
- 4 card: Saldo Attuale, Saldo Previsto (3 mesi), Minimo Previsto, Massimo Previsto
- Placeholder grafico flusso di cassa
- Banner info metodologia
- Tabella timeline: data, descrizione, importo, saldo running
- Basato su ricorrenze + pendenze + piani rateali

### 9.9 Importa Dati (`/import`)
**Wizard a 4 step:**

**Step 1 — Carica File:**
- Drag & drop CSV o click per selezionare
- Selezione contenitore destinazione (dropdown raggruppato per soggetto)

**Step 2 — Profilo & Mappatura:**
- Colonne rilevate dal CSV (badge)
- Auto-rilevamento profilo (messaggio verde se trovato, ambra se no)
- Lista profili preset selezionabili (radio button):
  - Intesa Sanpaolo (colonna unica)
  - Intesa Sanpaolo (Accrediti/Addebiti) — colonne separate entrate/uscite
  - Revolut
  - American Express (CSV) — importo invertito
  - PayPal
  - Binance
  - Interactive Brokers
  - Satispay
  - Generico (;) e Generico (,)
  - Personalizzato
- Se "Personalizzato": form con delimitatore, formato data, separatore decimale/migliaia, righe da saltare, importo invertito, **colonne separate Entrate/Uscite** (toggle)
- Sezione Mappatura Colonne:
  - **Modalità singola**: Data*, Descrizione*, Importo*, Valuta, Data Valuta, ID Esterno, Note
  - **Modalità split** (quando toggle attivo): Data*, Descrizione*, Accrediti (Entrate)*, Addebiti (Uscite)*, Valuta, Data Valuta, ID Esterno, Note
  - Ogni campo è un dropdown con le colonne del CSV
  - Campi obbligatori evidenziati con bordo rosso se vuoti

**Step 3 — Anteprima:**
- 4 card sommario: Totale righe, Pronte, Duplicati, Errori
- Tabella preview: #riga, Stato (OK/DUP/ERR badge), Data, Descrizione, Importo, Valuta, Errore
- Righe colorate: verde=pronta, ambra=duplicata, rosso=errore
- Pulsante "Importa N transazioni"

**Step 4 — Risultato:**
- Icona successo/fallimento
- Sommario: importate, duplicati saltati, errori
- Dettaglio errori se presenti
- Azioni: "Importa un altro file" o "Vai alle Transazioni"

### 9.10 Statistiche (`/statistics`)
- Filtri: range date (default ultimi 6 mesi), contenitore, scope
- Equity Line (placeholder grafico)
- Breakdown per categoria: nome, importo, percentuale, colore
- Trend mensile: tabella mese/entrate/uscite/netto + placeholder grafico
- Burning Rate: spesa media giornaliera, giorni autonomia, tasso risparmio %

### 9.11 Impostazioni (`/settings`)
- **Gestione Tag**: lista con filtri per tipo, edit/delete, modal creazione (nome, tipo, colore, tag padre)
- **Profili Importazione**: tabella profili salvati, azioni edit/delete
- **Database**: info connessione (read-only), test connessione
- **Export Dati**: export transazioni/contenitori/budget in CSV/JSON, backup completo JSON

---

## 10. Motore Importazione CSV (`src/lib/csvEngine.ts`)

### 10.1 Pipeline

```
File CSV
  → parseCSVFile() [PapaParse]
  → detectDelimiter() [auto]
  → detectProfile() [match colonne vs preset]
  → processCSVImport() [per ogni riga:]
      → parseDate() [normalizza a YYYY-MM-DD]
      → parseAmount() [gestisce separatori IT/EN, inversione]
      → generateRowHash() [hash DJB2 per dedup]
      → valida (data, importo, descrizione)
      → controlla duplicati vs existingHashes
  → ImportPreview { parsedRows, readyCount, duplicateCount, errorCount }
  → convertToTransactions() [mappa a schema DB]
  → transactionsApi.batchCreate() [insert a chunk di 50]
```

### 10.2 Profili Preset

| Profilo | Delimitatore | Data | Decimale | Colonne Amount | Note |
|---------|-------------|------|----------|---------------|------|
| Intesa Sanpaolo (colonna unica) | `;` | DD/MM/YYYY | `,` | `Importo` | |
| Intesa Sanpaolo (Accrediti/Addebiti) | `;` | DD/MM/YYYY | `,` | `Accrediti` + `Addebiti` | separateAmountColumns=true |
| Revolut | `,` | YYYY-MM-DD | `.` | `Amount` | currency da colonna |
| American Express | `,` | MM/DD/YYYY | `,` | `Importo` | amountInverted=true |
| PayPal | `,` | DD/MM/YYYY | `,` | `Lordo` | dedup su Codice transazione |
| Binance | `,` | YYYY-MM-DD | `.` | `Change` | crypto |
| Interactive Brokers | `,` | YYYY-MM-DD | `.` | `Amount` | |
| Satispay | `;` | DD/MM/YYYY | `,` | `Importo` | |
| Generico (;) / Generico (,) | `;`/`,` | DD/MM/YYYY | `,`/`.` | — | mapping manuale |

### 10.3 Auto-rilevamento profilo
`detectProfile(columns)`: per ogni preset, verifica che TUTTE le colonne mappate (incluse `incomeColumn`/`expenseColumn`) siano presenti nel CSV (case-insensitive). Restituisce il primo match.

### 10.4 Gestione colonne separate
Quando `separateAmountColumns=true`:
- Legge `incomeColumn` (accrediti) e `expenseColumn` (addebiti)
- Se c'è un valore positivo in income → amount = +valore
- Se c'è un valore positivo in expense → amount = -valore (negato)
- Altrimenti fallback su qualsiasi valore trovato

### 10.5 Conversione a Transazioni
`convertToTransactions()`:
- Filtra solo righe con status `'ready'`
- Rileva trasferimenti da pattern descrizione (es. "ADDEBITO IN C/C SALVO BUON FINE")
- Assegna tipo: `income`/`expense` oppure `transfer_in`/`transfer_out`
- Amount a 4 decimali

---

## 11. Utility & Helper (`src/lib/utils.ts`)

### Formattazione
- `formatCurrency(amount, currency?)` → `"1.500,50 €"` (formato italiano)
- `formatAmount(amount)` → `"1.500,50"`
- `formatDate(date, fmt?)` → `"01/01/2024"` (locale IT)
- `formatDateShort(date)` → `"01 Gen 2024"`
- `formatMonth(date)` → `"Gennaio 2024"`

### Classificazione transazioni
- `isInflow(type)` → true per income, transfer_in, loan_in, repayment_in
- `isOutflow(type)` → true per expense, transfer_out, capital_injection, loan_out, repayment_out
- `isTransfer(type)` → transfer_in o transfer_out
- `transactionTypeLabel(type)` → etichetta italiana
- `transactionTypeColor(type)` → colore Tailwind
- `transactionTypeIcon(type)` → nome icona Lucide

### Container helper
- `containerTypeLabel(type)` → etichetta italiana
- `containerTypeIcon(type)` → nome icona Lucide

### Transform (`src/lib/transforms.ts`)
- `snakeToCamel<T>(obj)` → conversione ricorsiva snake_case → camelCase
- `camelToSnake(obj)` → conversione camelCase → snake_case

---

## 12. Costanti (`src/lib/constants.ts`)

### Valute supportate
`EUR, USD, GBP, CHF, RON, BTC, ETH, USDT, USDC`

### Categorie predefinite (40+)
Affitto, Bollette, Trasporti, Spesa Alimentare, Salute, Tasse, IVA, Stipendio, Abbonamenti, Ristoranti, Shopping, Viaggi, Assicurazioni, Manutenzione, Educazione, Sport, Intrattenimento, Regali, Donazioni, Investimenti, Trading, Crypto, Interessi, Dividendi, Commissioni, Bolli, Multe, Consulenze, Marketing, Hosting, Software, Hardware, Telefonia, Internet, Energia, Acqua, Gas, Condominio, Mutuo, Prestito, Carta di Credito, Bancomat, ecc.

### Scope predefiniti
Personale AV, Familiare, Kairos SRLS, VS/Opzionetika, Shuffle SSRL, LTD UK, Romania

---

## 13. Regole di Business Chiave

1. **Saldo contenitore**: `initial_balance + SUM(transazioni.amount)` escludendo `status='cancelled'`
2. **Trasferimenti**: sempre creati in coppia (transfer_out + transfer_in), collegati bidirezionalmente via `transfer_linked_id`. Eliminare uno elimina anche l'altro.
3. **Deduplicazione import**: hash DJB2 su colonne specificate per profilo. Righe con hash già presente vengono marcate `'duplicate'`
4. **Condivisione costi**: `shared_with_subject_id` + `share_percentage` sulla transazione
5. **Eliminazione a cascata**: eliminare un contenitore è bloccato se ha transazioni. Junction table (transaction_tags, recurrence_tags) cascade delete.
6. **Batch import**: inserimento a chunk di 50 transazioni per evitare timeout
7. **Importi**: sempre `decimal(15,4)`, negativi = uscite, positivi = entrate
8. **Date**: formato ISO `YYYY-MM-DD` nel DB, formattazione `DD/MM/YYYY` nell'UI (locale italiana)
9. **Filtri debounced**: tutti i filtri nella pagina Transazioni sono debounced a 300ms prima di scatenare la chiamata API

---

## 14. PWA

- `manifest.json`: nome "EN€RGY", short "eNergy", display standalone
- Tema e background: `#09090b` (zinc-950)
- Icone: 192x192 e 512x512 PNG
- Lingua HTML: `it`

---

## 15. Deploy

- **Hosting**: Vercel
- **API**: Vercel Serverless Functions (directory `/api/`)
- **Database**: PostgreSQL su Neon (serverless)
- **Variabili ambiente**: `DATABASE_URL` o `SUPABASE_URL` + `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
- **Build**: `tsc -b && vite build`
- **Output**: `dist/` (SPA statica)

---

*Fine del PRD. Questo documento contiene tutte le specifiche necessarie per ricostruire l'applicazione EN€RGY da zero.*
