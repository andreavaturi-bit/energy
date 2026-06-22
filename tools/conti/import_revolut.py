"""
Import estratti Revolut (CSV) in EN€RGY.

Colonne: Tipo, Prodotto, Data di inizio, Data di completamento, Descrizione,
Importo, Costo, Valuta, State, Saldo.

Mappa tipi -> tipo transazione EN€RGY:
  Pagamento     -> expense (negativo) / income (positivo)
  Ricarica      -> transfer_in  (fondi da banca/carta propria, neutro)
  Cambia valuta -> transfer_in/out (movimento interno, neutro)
  Commissione   -> expense
Le righe con Costo>0 generano una spesa-commissione separata, cosi' il
saldo progressivo (colonna Saldo) torna.

Uso:
    python import_revolut.py "<cartella o file>" --container <uuid> [--import]
"""
import sys, os, csv, glob, argparse
sys.path.insert(0, os.path.dirname(__file__))
from common import submit_batch, normalize_desc


def parse_file(path):
    rows = list(csv.reader(open(path, encoding='utf-8-sig')))
    h = rows[0]
    idx = {c: i for i, c in enumerate(h)}
    out = []
    for r in rows[1:]:
        if not any(r):
            continue
        tipo = r[idx['Tipo']]
        amount = float(r[idx['Importo']])
        fee = float(r[idx['Costo']] or 0)
        cur = r[idx['Valuta']] or 'EUR'
        comp = r[idx['Data di completamento']] or r[idx['Data di inizio']]
        date = comp[:10]
        start = (r[idx['Data di inizio']] or comp)[:10]
        desc = normalize_desc(r[idx['Descrizione']])
        state = r[idx['State']]
        if state and state.upper() not in ('COMPLETATO', 'COMPLETED'):
            continue  # salta pending/declined

        if tipo == 'Ricarica':
            ttype = 'transfer_in' if amount >= 0 else 'transfer_out'
        elif tipo == 'Cambia valuta':
            ttype = 'transfer_in' if amount >= 0 else 'transfer_out'
        elif tipo == 'Commissione':
            ttype = 'expense'
        else:  # Pagamento e altri
            ttype = 'expense' if amount < 0 else 'income'

        out.append({
            'date': date, 'value_date': start, 'description': desc,
            'amount': round(amount, 2), 'currency': cur, 'type': ttype,
            'beneficiary': 'Andrea Vaturi', 'source': 'csv_import',
        })
        if abs(fee) > 0.001:
            out.append({
                'date': date, 'value_date': start,
                'description': f'Commissione Revolut - {desc}',
                'amount': round(-abs(fee), 2), 'currency': cur, 'type': 'expense',
                'beneficiary': 'Andrea Vaturi', 'source': 'csv_import',
            })
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('path')
    ap.add_argument('--container', required=True)
    ap.add_argument('--import', dest='do_import', action='store_true')
    args = ap.parse_args()

    if os.path.isdir(args.path):
        files = sorted(glob.glob(os.path.join(args.path, '*account-statement.csv')))
    else:
        files = [args.path]

    for f in files:
        rows = parse_file(f)
        print(os.path.basename(f))
        submit_batch(rows, args.container, os.path.basename(f), dry_run=not args.do_import)


if __name__ == '__main__':
    main()
