# EN€RGY - Istruzioni per Claude Code

## Regole operative

- Lavora sempre e solo sul branch `main`. Non creare mai branch separati.
- Dopo ogni modifica, committa e pusha direttamente su `main`.
- Vercel deploya automaticamente ad ogni push su `main`.

## Stack tecnico

- **Frontend**: React 19, TypeScript strict, Vite, Tailwind CSS v4
- **State**: TanStack Query v5 (useQuery/useMutation)
- **Backend**: Vercel Serverless Functions (`api/[...path].ts`, unico catch-all handler che delega a moduli sotto `api/_lib/handlers/`)
- **Database**: Supabase (Postgres), accessed via `@supabase/supabase-js`
- **Deploy**: Vercel, progetto `energy`, URL produzione `moneyenergy-claude.vercel.app`
- **Repo**: `https://github.com/andreavaturi-bit/energy`

## Pattern architetturali consolidati (non cambiarli mai)

### API handler (`api/[...path].ts` + `api/_lib/`)

- `api/[...path].ts` e' l'unica serverless function esposta: fa solo routing e delega agli handler in `api/_lib/handlers/`.
- Ogni risorsa ha il suo file: `subjects.ts`, `containers.ts`, `transactions.ts`, ecc.
- I file sotto `api/_lib/` non vengono contati come serverless function da Vercel (prefisso `_`).
- Per risorse con CRUD standard usa la factory in `api/_lib/crud-factory.ts`:
  - `createCrudHandler({ table, fields, requiredOnCreate, ... })` genera GET/POST/PUT/DELETE standard.
  - La mappa `fields` dichiara `{ camelCase: { column: 'snake_case', default?: ... } }` per ogni campo.
  - Hook disponibili: `beforeDelete`, `afterCreate`, `transformRow`, `listPostProcess`.
- Per risorse con azioni custom (es. `auto-tag`, `pay-installment`) usa `composeHandler(baseCrud, customDispatcher)` che intercetta le azioni prima del fallback CRUD.
- Update e delete usano POST con `_action` nel body (es. `{ _action: 'update', id, ...campi }`).
- Risposte successo: `{ data: T }`. Errori: `{ error, message }`.
- Helper di risposta in `api/_lib/supabase.ts`: `ok`, `created`, `badRequest`, `notFound`, `serverError`, `setCors`.
- DB usa `snake_case`, frontend usa `camelCase` (conversione via `snakeToCamel` da `src/lib/transforms.ts`).

### Frontend hooks (`src/lib/hooks.ts`)

- Tutti i dati vengono da hooks TanStack Query.
- Ogni mutation in `onSuccess` chiama `qc.invalidateQueries({ queryKey: ... })`.
- Le API sono in `src/lib/api.ts` come oggetti con metodi `list/get/create/update/delete`.

### Aggiungere una nuova risorsa

1. Crea `api/_lib/handlers/<nome>.ts` usando `createCrudHandler` (o scrivi handler custom se la logica non e' CRUD puro).
2. Importa e registra il case nel router di `api/[...path].ts`.
3. Aggiungi API object in `src/lib/api.ts`.
4. Aggiungi hooks in `src/lib/hooks.ts`.
5. Aggiungi interfaccia TypeScript in `src/types/index.ts`.
6. Aggiorna la pagina frontend.

## Design system (non modificare mai)

- Tema: **dark-only**, sfondo `zinc-950` (#09090b)
- Colore primario: **energy-500** (`#22c55e`, verde)
- Scala neutri: zinc-950/900/800/700/600/500/400/300/200/100
- Font corpo: Inter. Font monospace (importi, valute): JetBrains Mono
- Bordi: `rounded-xl` per card, `rounded-lg` per input/button
- Ombre: solo sul Modal (`shadow-2xl`), tutto il resto flat
- Input style: `border-zinc-700 bg-zinc-800 text-zinc-200 focus:border-energy-500`
- Button primario: `bg-energy-500 text-zinc-950 hover:bg-energy-400`
- Colori semantici: entrate `#22c55e`, uscite `#ef4444`, trasferimenti `#3b82f6`, pending `#f59e0b`

## Regole UI

- Tutti i testi UI sono in **italiano**.
- Non usare mai em dash (`—`): usare trattino `-` o ristrutturare la frase.
- Breakpoint mobile/desktop: `lg:` (1024px).
- Loading state: spinner `Loader2` da lucide-react con `animate-spin`.
- Empty state: componente `EmptyState` in `src/components/ui/EmptyState.tsx`.
- Bottoni disabilitati durante operazioni async (`isPending`).
- Conferma prima di ogni delete: `window.confirm('...')`.

## Struttura pagine esistenti

| Pagina | Route | Stato |
|--------|-------|-------|
| Dashboard | `/` | Collegata al DB |
| Transazioni | `/transactions` | Collegata al DB |
| Contenitori | `/containers` | Collegata al DB |
| Soggetti | `/subjects` | Collegata al DB |
| Tag | `/tags` | Collegata al DB, vista Miller columns |
| Budget | `/budget` | Collegata al DB |
| Ricorrenze | `/recurrences` | Collegata al DB |
| Pendenze | `/pendenze` | Collegata al DB |
| Proiezioni | `/projections` | Parziale (saldo reale, proiezioni stub) |
| Import | `/import` | Collegata al DB |
| Statistiche | `/statistics` | Collegata al DB |
| Regole Smart | `/smart-rules` | Collegata al DB |
| Impostazioni | `/settings` | Collegata al DB |

## Database (Supabase / PostgreSQL)

Tabelle principali: `subjects`, `containers`, `counterparties`, `tags`, `transaction_tags`,
`transactions`, `recurrences`, `recurrence_tags`, `installment_plans`, `installments`,
`budget_periods`, `budget_allocations`, `import_profiles`, `import_batches`, `smart_rules`

Colonne importanti su `transactions`:
- `beneficiary_subject_id` (FK -> subjects): per chi e' questa spesa
- `split_parent_id` (FK -> transactions): per transazioni splittate
- `status`: `'completed' | 'pending' | 'projected' | 'cancelled' | 'split'`
- Le parent con `status = 'split'` vanno escluse da tutti i calcoli di saldo e statistiche

## Verifica finale

Dopo ogni sessione di lavoro, esegui sempre:
```bash
tsc -b
```
e assicurati che non ci siano errori TypeScript prima di committare.
