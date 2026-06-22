"""
Helper condivisi per gli import dei conti correnti in EN€RGY.

external_hash canonico IDENTICO a src/lib/csvEngine.ts e alla funzione SQL
canonical_tx_hash: SHA-256 di
    date | importo(2 decimali, con segno) | descrizione normalizzata | occorrenza
L'occorrenza e' l'indice (0-based) tra righe identiche stesso (date,amount,desc)
DENTRO il batch importato (per non perdere i twin e restare idempotenti).

submit_batch() invia alla vera API batch (dedup + import_batches + rollback).
"""
import re, hashlib, json, urllib.request

API_BASE = 'https://moneyenergy-claude.vercel.app/api'

SUBJECTS = {
    'Andrea Vaturi': '457d1d89-6388-41dc-83d7-f8960bfecb03',
    'Moglie AV': 'a14c2e4b-ba9a-4449-a154-8d57c84219d7',
    'Kairos SRLS': None,  # da popolare se serve
}


def normalize_desc(d):
    return re.sub(r'\s+', ' ', d or '').strip()


def canonical_hash(date, amount, description, occurrence):
    canon = f"{date}|{amount:.2f}|{normalize_desc(description)}|{occurrence}"
    return hashlib.sha256(canon.encode('utf-8')).hexdigest()


def add_hashes(rows):
    """rows: lista dict con almeno date, amount (float), description.
    Aggiunge externalHash con occorrenza per-batch alle righe che non ne hanno
    gia' uno (es. dedup per id transazione). Ritorna (rows, n_distinct)."""
    occ = {}
    for r in rows:
        if r.get('externalHash'):
            continue
        desc = normalize_desc(r['description'])
        key = f"{r['date']}|{r['amount']:.2f}|{desc}"
        o = occ.get(key, 0)
        occ[key] = o + 1
        r['externalHash'] = canonical_hash(r['date'], r['amount'], desc, o)
    hashes = [r['externalHash'] for r in rows]
    return rows, len(set(hashes))


def post(path, body):
    data = json.dumps(body).encode('utf-8')
    req = urllib.request.Request(API_BASE + path, data=data,
                                 headers={'Content-Type': 'application/json'}, method='POST')
    with urllib.request.urlopen(req, timeout=180) as resp:
        return json.loads(resp.read().decode('utf-8'))


def to_payload(r, container_id):
    """Normalizza una riga interna nel payload dell'API batch."""
    return {
        'date': r['date'],
        'valueDate': r.get('value_date'),
        'description': normalize_desc(r['description']),
        'amount': f"{r['amount']:.2f}",
        'currency': r.get('currency', 'EUR'),
        'containerId': container_id,
        'type': r['type'],
        'status': r.get('status', 'completed'),
        'source': r.get('source', 'csv_import'),
        'beneficiarySubjectId': SUBJECTS.get(r.get('beneficiary')),
        'externalId': r.get('external_id'),
        'externalHash': r['externalHash'],
    }


def submit_batch(rows, container_id, filename, dry_run=False):
    rows, n_distinct = add_hashes(rows)
    charges = sum(-r['amount'] for r in rows if r['amount'] < 0)
    credits = sum(r['amount'] for r in rows if r['amount'] > 0)
    print(f"  righe={len(rows)} hash_distinti={n_distinct}/{len(rows)} uscite={charges:.2f} entrate={credits:.2f}")
    if dry_run or not rows:
        return None
    payload = [to_payload(r, container_id) for r in rows]
    resp = post('/transactions?action=batch',
                {'transactions': payload, 'containerId': container_id, 'filename': filename})
    print('  API:', json.dumps(resp.get('data', resp), ensure_ascii=False))
    return resp
