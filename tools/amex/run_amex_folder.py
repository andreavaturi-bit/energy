"""
Esegue il parsing/import di TUTTI gli estratti Amex (*statement.pdf) di una
cartella annata-per-annata.

Default: dry-run (solo verifica + quadratura, nessuna scrittura).
Con --import: inserisce ogni estratto via API batch.

Uso:
    python run_amex_folder.py "<cartella radice>" --container <uuid> [--import] [--year 2019]
"""
import sys, os, re, glob, argparse, json

from parse_amex import parse_pdf
from import_amex import build_payload, post

EXCLUDE_DIRS = {'_info_carta', '_dashboard_report'}


def find_statements(root, year=None):
    out = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        if year and os.path.basename(dirpath) != str(year):
            # consenti comunque la radice di walk
            if os.path.basename(dirpath) not in [str(year)]:
                pass
        for fn in filenames:
            if fn.lower().endswith('statement.pdf'):
                if year and f"-{year}" not in fn and not dirpath.endswith(str(year)):
                    continue
                out.append(os.path.join(dirpath, fn))
    return sorted(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('root')
    ap.add_argument('--container', required=True)
    ap.add_argument('--import', dest='do_import', action='store_true')
    ap.add_argument('--year')
    args = ap.parse_args()

    files = find_statements(args.root, args.year)
    print(f"Trovati {len(files)} estratti\n")

    tot_ok = tot_mismatch = tot_err = tot_inserted = tot_skipped = 0
    all_warnings = []
    problems = []

    for path in files:
        fn = os.path.basename(path)
        try:
            parsed = parse_pdf(path)
            rows, warnings = build_payload(parsed, args.container, fn)
            charges = round(sum(-float(r['amount']) for r in rows if float(r['amount']) < 0), 2)
            credits = round(sum(float(r['amount']) for r in rows if float(r['amount']) > 0), 2)
            exp_add = parsed['meta'].get('addebiti_registrati')
            exp_acc = parsed['meta'].get('accrediti_registrati')
            ch_ok = exp_add is not None and abs(charges - exp_add) < 0.01
            cr_ok = exp_acc is not None and abs(credits - exp_acc) < 0.01
            hashes_ok = len(set(r['externalHash'] for r in rows)) == len(rows)
            status = 'OK' if (ch_ok and cr_ok and hashes_ok) else 'MISMATCH'
            flag = '' if status == 'OK' else '  <<<'
            print(f"{fn[:34]:34} n={len(rows):>3}  spese={charges:>9.2f}/{exp_add}  acc={credits:>8.2f}/{exp_acc}  {status}{flag}")
            for w in warnings:
                all_warnings.append(f"{fn}: {w}")
            if status == 'OK':
                tot_ok += 1
            else:
                tot_mismatch += 1
                problems.append(fn)

            if args.do_import and status == 'OK':
                resp = post('/transactions?action=batch', {
                    'transactions': rows, 'containerId': args.container, 'filename': fn,
                })
                d = resp.get('data', {})
                tot_inserted += d.get('inserted', 0)
                tot_skipped += d.get('skippedDuplicates', 0)
            elif args.do_import:
                print(f"   -> SALTATO import (mismatch): {fn}")
        except Exception as e:
            tot_err += 1
            problems.append(fn)
            print(f"{fn[:34]:34} ERRORE: {e}")

    print(f"\n=== RIEPILOGO ===")
    print(f"OK: {tot_ok} | mismatch: {tot_mismatch} | errori: {tot_err}")
    if args.do_import:
        print(f"Inseriti: {tot_inserted} | duplicati saltati: {tot_skipped}")
    if all_warnings:
        print(f"\nAccrediti non-settlement da rivedere ({len(all_warnings)}):")
        for w in all_warnings[:40]:
            print('  ', w)
    if problems:
        print(f"\nFile con problemi: {problems}")


if __name__ == '__main__':
    main()
