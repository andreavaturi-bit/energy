# Import estratti Amex (PDF) → EN€RGY

Tooling per importare gli estratti conto American Express in PDF, riconciliati
al centesimo contro i totali di ogni estratto. Pensato per l'import globale
delle carte di credito.

## Requisiti
- Python 3 + `pdfplumber` (`pip install pdfplumber`)

## File
- `parse_amex.py` — parser PDF (gestisce i due formati storici Amex: date
  `DD.MM.YY` dal ~2021-09 e `DD Mon` con anno implicito fino al ~2021-08).
  Estrae data, descrizione, importo, beneficiario; somma e quadra contro
  "Addebiti/Accrediti Registrati" dell'estratto.
- `import_amex.py` — calcola l'`external_hash` canonico (SHA-256, formula
  identica a `src/lib/csvEngine.ts` e alla funzione SQL `canonical_tx_hash`)
  e inserisce via la vera API batch (`?action=batch`): dedup, `import_batches`
  e rollback inclusi. Accrediti (pagamenti, rimborsi, cashback) → `transfer_in`
  neutro; addebiti → `expense`.
- `run_amex_folder.py` — esegue parsing/import su tutti gli `*statement.pdf`
  di una cartella (default dry-run; `--import` per scrivere).

## Uso
```bash
# dry-run: verifica e quadratura, nessuna scrittura
python run_amex_folder.py "<cartella>" --container <uuid>

# import reale
python run_amex_folder.py "<cartella>" --container <uuid> --import

# singolo file
python import_amex.py "<pdf>" --container <uuid> [--dry-run]
```

## Configurazione per-carta (da adattare)
- `--container <uuid>`: il contenitore EN€RGY di destinazione.
- `SUBJECTS` in `import_amex.py`: mappa nome-beneficiario → id soggetto.
  La rilevazione del beneficiario in `parse_amex.py` (`beneficiary_for`)
  riconosce gli intestatari per nome nelle intestazioni di sezione
  ("Nuovi addebiti per SIG..."); adattare per carte con titolari diversi.

## Note operative
- I PDF possono avere DUE formati; il parser li gestisce entrambi. Validare
  sempre in dry-run prima dell'import: ogni riga `OK` significa che la somma
  estratta combacia con i totali dell'estratto.
- Estratti mancanti spezzano la catena dei saldi: lo storico resta corretto
  per gli estratti presenti, ma il saldo assoluto richiede o i PDF mancanti
  o rettifiche-ponte (trasferimenti neutri).
- Il `saldo iniziale` del contenitore va impostato a `-(Saldo Precedente del
  primo estratto)` perche' il saldo finale coincida col debito attuale.

## Esito import Amex Gold "Oro - AV" (2017-2026)
101 estratti, tutti quadrati; 3063 movimenti + 4 rettifiche-ponte per i 10
estratti mancanti (2017-10/11, 2018-02/03/04/06/07/08/09, 2019-04). Saldo
iniziale -65,00; saldo finale -649,62 = debito dell'ultimo estratto.
