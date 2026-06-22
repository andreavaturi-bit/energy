"""
Import movimenti Satispay (XLSX annuali) in EN€RGY. Solo EUR.

Colonne: Data, Nome, Descrizione, Importo, Tipo, Stato, Disponibilita,
Buoni Pasto, Disponibilita dopo la transazione, ID.

Dedup tramite ID univoco Satispay: external_hash = sha256("satispay|<id>").

Tipi (emoji-prefixed):
  Dalla Banca           -> transfer_in (ricarica da banca)
  a un Negozio/Persona, PagoPA -> expense
  da una Persona, Cashback, Rimborso -> income
  altri: per segno

Uso:
    python import_satispay.py "<cartella>" --container <uuid> [--import]
"""
import sys, os, glob, re, hashlib, argparse
import openpyxl
sys.path.insert(0, os.path.dirname(__file__))
from common import submit_batch, normalize_desc


def satispay_hash(tid):
    return hashlib.sha256(f"satispay|{tid}".encode('utf-8')).hexdigest()


def strip_emoji(s):
    return re.sub(r'[^\w\s/.,&-]', '', s or '', flags=re.UNICODE).strip()


def classify(tipo, amount):
    t = (tipo or '').lower()
    if 'banca' in t:
        return 'transfer_in' if amount >= 0 else 'transfer_out'
    if amount < 0:
        return 'expense'
    return 'income'


def parse_file(path):
    wb = openpyxl.load_workbook(path, read_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    hdr = [str(c).strip() if c else '' for c in rows[0]]
    idx = {c: i for i, c in enumerate(hdr)}
    i_id = next(i for c, i in idx.items() if c.startswith('ID'))
    out = []
    for r in rows[1:]:
        if not r or r[idx['Data']] is None:
            continue
        stato = str(r[idx['Stato']] or '')
        if 'Annullato' in stato or 'Rifiutato' in stato:
            continue
        dt = r[idx['Data']]
        date = dt.strftime('%Y-%m-%d') if hasattr(dt, 'strftime') else str(dt)[:10]
        amount = round(float(r[idx['Importo']] or 0), 2)
        tipo = str(r[idx['Tipo']] or '')
        nome = str(r[idx['Nome']] or '').strip()
        descr = str(r[idx['Descrizione']] or '').strip()
        desc = normalize_desc(' - '.join(x for x in [strip_emoji(tipo), nome, descr] if x and x != 'None'))
        tid = str(r[i_id] or '').strip()
        out.append({
            'date': date, 'description': desc or 'Satispay', 'amount': amount,
            'currency': 'EUR', 'type': classify(tipo, amount),
            'beneficiary': 'Andrea Vaturi', 'source': 'csv_import',
            'external_id': tid or None,
            **({'externalHash': satispay_hash(tid)} if tid else {}),
        })
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('path')
    ap.add_argument('--container', required=True)
    ap.add_argument('--import', dest='do_import', action='store_true')
    args = ap.parse_args()
    files = sorted(glob.glob(os.path.join(args.path, '*.xlsx'))) if os.path.isdir(args.path) else [args.path]
    for f in files:
        print(os.path.basename(f))
        rows = parse_file(f)
        submit_batch(rows, args.container, os.path.basename(f), dry_run=not args.do_import)


if __name__ == '__main__':
    main()
