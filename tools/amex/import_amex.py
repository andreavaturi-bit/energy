"""
Importa un estratto Amex (PDF) in EN€RGY passando dalla vera API batch
(stessa pipeline del wizard: dedup, import_batches, rollback).

Calcola l'external_hash con la formula canonica IDENTICA a csvEngine.ts e
alla funzione SQL canonical_tx_hash: SHA-256 di
    date | importo(2 decimali, con segno) | descrizione normalizzata | occorrenza
L'occorrenza e' l'indice (0-based) tra righe identiche stesso (date,amount,desc)
DENTRO il singolo estratto (per non perdere i twin e restare idempotenti).

Uso:
    python import_amex.py "<pdf>" --container <uuid> [--dry-run]
"""
import sys, re, json, hashlib, argparse, urllib.request

from parse_amex import parse_pdf

API_BASE = 'https://moneyenergy-claude.vercel.app/api'

SUBJECTS = {
    'Andrea Vaturi': '457d1d89-6388-41dc-83d7-f8960bfecb03',
    'Moglie AV': 'a14c2e4b-ba9a-4449-a154-8d57c84219d7',
}

def normalize_desc(d):
    return re.sub(r'\s+', ' ', d or '').strip()


def is_settlement(description):
    """Pagamento mensile della carta (qualunque formato/descrizione):
    'ADDEBITO IN C/C SALVO BUON FINE' (anche con spazi persi) o
    'PAGAMENTO RICEVUTO - GRAZIE'. Va trattato come trasferimento."""
    flat = re.sub(r'\s+', '', (description or '')).upper()
    return 'SALVOBUONFINE' in flat or 'PAGAMENTORICEVUTO' in flat


def canonical_hash(date, amount, description, occurrence):
    canon = f"{date}|{amount:.2f}|{normalize_desc(description)}|{occurrence}"
    return hashlib.sha256(canon.encode('utf-8')).hexdigest()


def tx_type(t):
    # Ogni accredito (pagamento mensile, rimborso, cashback, voucher) e'
    # trattato come trasferimento neutro: corretto nel saldo ma escluso da
    # entrate/uscite. Solo gli addebiti sono spese.
    if t['amount'] > 0:
        return 'transfer_in'
    return 'expense'


def build_payload(parsed, container_id, filename):
    occ_counter = {}
    rows = []
    warnings = []
    for t in parsed['transactions']:
        desc = normalize_desc(t['description'])
        key = f"{t['date']}|{t['amount']:.2f}|{desc}"
        occ = occ_counter.get(key, 0)
        occ_counter[key] = occ + 1
        ttype = tx_type(t)
        if ttype == 'income':
            warnings.append(f"accredito non-settlement (rivedere tipo): {t['date']} {t['amount']} {desc}")
        rows.append({
            'date': t['date'],
            'valueDate': t['value_date'],
            'description': desc,
            'amount': f"{t['amount']:.2f}",
            'currency': 'EUR',
            'containerId': container_id,
            'type': ttype,
            'status': 'completed',
            'source': 'pdf_import',
            'beneficiarySubjectId': SUBJECTS.get(t['beneficiary']),
            'externalHash': canonical_hash(t['date'], t['amount'], desc, occ),
        })
    return rows, warnings


def post(path, body):
    data = json.dumps(body).encode('utf-8')
    req = urllib.request.Request(API_BASE + path, data=data,
                                 headers={'Content-Type': 'application/json'}, method='POST')
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode('utf-8'))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('pdf')
    ap.add_argument('--container', required=True)
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()

    import os
    filename = os.path.basename(args.pdf)
    parsed = parse_pdf(args.pdf)
    rows, warnings = build_payload(parsed, args.container, filename)

    charges = sum(-float(r['amount']) for r in rows if float(r['amount']) < 0)
    credits = sum(float(r['amount']) for r in rows if float(r['amount']) > 0)
    print(f"File: {filename}")
    print(f"Periodo: {parsed['meta'].get('period_from')} - {parsed['meta'].get('period_to')}")
    print(f"Movimenti: {len(rows)} | spese {charges:.2f} (atteso {parsed['meta'].get('addebiti_registrati')}) | accrediti {credits:.2f} (atteso {parsed['meta'].get('accrediti_registrati')})")
    for w in warnings:
        print('  WARN:', w)
    # hash univoci nel file?
    hashes = [r['externalHash'] for r in rows]
    print(f"Hash distinti: {len(set(hashes))}/{len(hashes)}")

    if args.dry_run:
        print('DRY-RUN: nessun inserimento.')
        return

    resp = post('/transactions?action=batch', {
        'transactions': rows,
        'containerId': args.container,
        'filename': filename,
    })
    print('RISPOSTA API:', json.dumps(resp, ensure_ascii=False))


if __name__ == '__main__':
    main()
