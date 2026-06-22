"""
Import estratti PayPal (CSV) in EN€RGY.

Gestisce i due layout PayPal (18 col "EstrattoConto/Movimenti" e 41 col
"TUTTE le transazioni") mappando le colonne per NOME. PayPal e' un conto
pass-through: ogni pagamento e' finanziato subito (saldo ~0). Valore = storico.

Dedup tramite Codice transazione (id univoco PayPal): external_hash =
sha256("paypal|<codice>"), robusto contro le forti sovrapposizioni tra file.

Tipi:
  pagamenti (negativi)                         -> expense
  bonifico/versamento/conversione (positivi)   -> transfer_in (finanziamento)
  conversione/storno negativi                  -> transfer_out
  altri accrediti (denaro ricevuto)            -> income

Uso:
    python import_paypal.py "<cartella>" --container <uuid> [--import]
"""
import sys, os, csv, io, glob, re, hashlib, argparse
sys.path.insert(0, os.path.dirname(__file__))
from common import submit_batch, normalize_desc

FUNDING = ('bonifico bancario sul conto', 'versamento generico con carta',
           'conversione di valuta generica', 'storno generico')


def parse_amount_it(s):
    s = (s or '').strip().replace('.', '').replace(',', '.')
    return float(s) if s not in ('', '-') else 0.0


def parse_date_it(s):
    # D/M/YYYY o DD/MM/YYYY
    m = re.match(r'(\d{1,2})/(\d{1,2})/(\d{4})', (s or '').strip())
    if not m:
        return None
    d, mo, y = m.groups()
    return f"{y}-{int(mo):02d}-{int(d):02d}"


def load(path):
    data = open(path, encoding='utf-8-sig').read()
    rows = list(csv.reader(io.StringIO(data)))
    header = [c.strip() for c in rows[0]]
    idx = {c: i for i, c in enumerate(header)}
    return rows[1:], idx


def col(idx, *names):
    for n in names:
        if n in idx:
            return idx[n]
    return None


def paypal_hash(codice):
    return hashlib.sha256(f"paypal|{codice}".encode('utf-8')).hexdigest()


def classify(desc, amount):
    dl = desc.lower()
    if any(k in dl for k in FUNDING):
        return 'transfer_in' if amount >= 0 else 'transfer_out'
    if amount < 0:
        return 'expense'
    return 'income'


def parse_file(path):
    data, idx = load(path)
    i_date = col(idx, 'Data')
    i_desc = col(idx, 'Descrizione', 'Tipo')
    i_cur = col(idx, 'Valuta')
    i_net = col(idx, 'Netto')
    i_cod = col(idx, 'Codice transazione')
    i_stato = col(idx, 'Stato')
    out = []
    for row in data:
        if not any(row):
            continue
        if i_stato is not None and row[i_stato].strip().lower() in ('annullata', 'rifiutata', 'in sospeso', 'negato'):
            continue
        date = parse_date_it(row[i_date])
        if not date:
            continue
        amount = round(parse_amount_it(row[i_net]), 2)
        desc = normalize_desc(row[i_desc])
        cur = (row[i_cur] or 'EUR').strip().upper()
        cod = row[i_cod].strip() if i_cod is not None else ''
        r = {
            'date': date, 'description': desc, 'amount': amount, 'currency': cur,
            'type': classify(desc, amount), 'beneficiary': 'Andrea Vaturi',
            'source': 'csv_import', 'external_id': cod or None,
        }
        if cod:
            r['externalHash'] = paypal_hash(cod)  # dedup per id univoco
        out.append(r)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('path')
    ap.add_argument('--container', required=True)
    ap.add_argument('--import', dest='do_import', action='store_true')
    args = ap.parse_args()
    files = sorted(glob.glob(os.path.join(args.path, '*.csv'))) if os.path.isdir(args.path) else [args.path]
    for f in files:
        # I file "TUTTE le transazioni" sono una vista diversa (attivita', senza
        # le voci-specchio di finanziamento): non vanno mescolati con gli
        # EstrattoConto/Movimenti. Gestiti a parte.
        if 'TUTTE' in os.path.basename(f).upper():
            print(os.path.basename(f), '-> SALTATO (vista attivita, gestire a parte)')
            continue
        print(os.path.basename(f))
        rows = parse_file(f)
        submit_batch(rows, args.container, os.path.basename(f), dry_run=not args.do_import)


if __name__ == '__main__':
    main()
