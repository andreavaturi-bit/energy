"""
Parser estratti conto American Express (PDF) per EN€RGY.

Gestisce DUE formati storici:
  - NUOVO (da ~2021-09): date "DD.MM.YY"
  - VECCHIO (fino ~2021-08): date "DD Mon" (mese abbreviato IT, anno implicito)

Estrae i movimenti dalla sezione "Operazioni contabilizzate nel periodo"
sfruttando le coordinate delle parole (pdfplumber). NON scrive nel DB.

Uso:
    python parse_amex.py "<path al pdf>"
"""
import sys, re, json
import pdfplumber

DATE_NEW_RE = re.compile(r'^\d{2}\.\d{2}\.\d{2}$')
AMOUNT_RE = re.compile(r'^-?\d{1,3}(?:\.\d{3})*,\d{2}$')
DAY_RE = re.compile(r'^\d{1,2}$')

MESI = {'gen': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'mag': 5, 'giu': 6,
        'lug': 7, 'ago': 8, 'set': 9, 'ott': 10, 'nov': 11, 'dic': 12}
MESI_FULL = {'gennaio': 1, 'febbraio': 2, 'marzo': 3, 'aprile': 4, 'maggio': 5,
             'giugno': 6, 'luglio': 7, 'agosto': 8, 'settembre': 9, 'ottobre': 10,
             'novembre': 11, 'dicembre': 12}

X_DATE2_MAX = 118     # le date (operazione+contabilizzazione) stanno a sinistra
X_DESC_MIN = 118
X_DESC_MAX = 430      # oltre: colonna valuta estera (~445) / importo euro (~505)
X_EUR_MIN = 480

OLD_DATE_IN_LEADING = re.compile(r'(\d{1,2})\s*(' + '|'.join(MESI) + r')', re.IGNORECASE)


def despace(s):
    return re.sub(r'\s+', '', s).lower()


def parse_amount(s):
    return float(s.replace('.', '').replace(',', '.'))


def group_lines(words, tol=3.5):
    lines = []
    for w in sorted(words, key=lambda w: (round(w['top']), w['x0'])):
        placed = False
        for ln in lines:
            if abs(ln['top'] - w['top']) <= tol:
                ln['words'].append(w)
                placed = True
                break
        if not placed:
            lines.append({'top': w['top'], 'words': [w]})
    for ln in lines:
        ln['words'].sort(key=lambda w: w['x0'])
        ln['text'] = ' '.join(w['text'] for w in ln['words'])
    lines.sort(key=lambda ln: ln['top'])
    return lines


def beneficiary_for(header_despaced):
    if 'valeriasina' in header_despaced:
        return 'Moglie AV'
    if 'giacomovaturi' in header_despaced or 'andrea' in header_despaced:
        return 'Andrea Vaturi'
    return None


def infer_year(month, period_from, period_to):
    """Sceglie l'anno (tra quello di inizio e fine periodo) per cui la data
    cade piu' vicina al periodo dell'estratto."""
    if not period_from or not period_to:
        return None
    fy, fm, fd = period_from
    ty, tm, td = period_to
    mid = (fy * 365 + fm * 30 + fd + ty * 365 + tm * 30 + td) / 2
    best, bestd = None, None
    for y in {fy, ty}:
        d = abs((y * 365 + month * 30 + 15) - mid)
        if bestd is None or d < bestd:
            bestd, best = d, y
    return best


def iso_new(token):
    dd, mm, yy = token.split('.')
    return f"20{yy}-{mm}-{dd}"


def iso_old(day, month_abbr, period_from, period_to):
    m = MESI[month_abbr.lower()[:3]]
    y = infer_year(m, period_from, period_to)
    return f"{y:04d}-{m:02d}-{int(day):02d}"


def extract_period(text):
    flat = re.sub(r'\s+', '', text)
    # NUOVO: 09.02.2026-08.03.2026
    m = re.search(r'(\d{2})\.(\d{2})\.(\d{4})-(\d{2})\.(\d{2})\.(\d{4})', flat)
    if m:
        g = list(map(int, m.groups()))
        return (g[2], g[1], g[0]), (g[5], g[4], g[3])
    # VECCHIO: 9Maggio2020-8Giugno2020
    m = re.search(r'(\d{1,2})(' + '|'.join(MESI_FULL) + r')(\d{4})-(\d{1,2})(' + '|'.join(MESI_FULL) + r')(\d{4})', flat, re.IGNORECASE)
    if m:
        return ((int(m.group(3)), MESI_FULL[m.group(2).lower()], int(m.group(1))),
                (int(m.group(6)), MESI_FULL[m.group(5).lower()], int(m.group(4))))
    return None, None


def extract_summary(text):
    flat = re.sub(r'[ \t]+', '', text)
    m = re.search(r'([\d.]+,\d{2})-([\d.]+,\d{2})\+([\d.]+,\d{2})=([\d.]+,\d{2})', flat)
    if m:
        return {
            'saldo_precedente': parse_amount(m.group(1)),
            'accrediti_registrati': parse_amount(m.group(2)),
            'addebiti_registrati': parse_amount(m.group(3)),
            'saldo_attuale': parse_amount(m.group(4)),
        }
    return {}


def parse_row(ln, all_words, period_from, period_to):
    """Ritorna (date_iso, value_date_iso, description, magnitude, is_credit) o None."""
    ws = ln['words']
    first = ws[0]
    date1 = date2 = None

    if DATE_NEW_RE.match(first['text']) and first['x0'] < 60:
        # formato nuovo
        dates = [w for w in ws if DATE_NEW_RE.match(w['text']) and w['x0'] < X_DATE2_MAX]
        if not dates:
            return None
        date1 = iso_new(dates[0]['text'])
        date2 = iso_new(dates[-1]['text']) if len(dates) > 1 else date1
    elif first['x0'] < 48:
        # formato vecchio: la data e' "DD Mon" oppure unita "DDMon" (giorno a
        # cifra singola). Ricostruisco le due date dai token a sinistra.
        leading = ' '.join(w['text'] for w in ws if w['x0'] < X_DATE2_MAX)
        if not OLD_DATE_IN_LEADING.match(leading):
            return None
        matches = OLD_DATE_IN_LEADING.findall(leading)
        date1 = iso_old(matches[0][0], matches[0][1], period_from, period_to)
        date2 = iso_old(matches[1][0], matches[1][1], period_from, period_to) if len(matches) > 1 else date1
    else:
        return None

    eur = [w for w in ws if w['x0'] >= X_EUR_MIN and AMOUNT_RE.match(w['text'])]
    if not eur:
        return None
    magnitude = parse_amount(eur[-1]['text'])

    desc = ' '.join(w['text'] for w in ws
                    if X_DESC_MIN <= w['x0'] < X_DESC_MAX
                    and not AMOUNT_RE.match(w['text']))
    desc = re.sub(r'\s+', ' ', desc).strip()

    is_credit = any(w['text'] == 'CR' and w['x0'] > 450 and 0 <= (w['top'] - ln['top']) <= 16
                    for w in all_words)
    return date1, date2, desc, magnitude, is_credit


def parse_pdf(path):
    txs = []
    with pdfplumber.open(path) as pdf:
        first_text = pdf.pages[0].extract_text() or ''
        period_from, period_to = extract_period(first_text)
        meta = extract_summary(first_text)
        if period_from:
            meta['period_from'] = '%04d-%02d-%02d' % period_from
            meta['period_to'] = '%04d-%02d-%02d' % period_to

        current_benef = 'Andrea Vaturi'
        for page in pdf.pages:
            words = page.extract_words(use_text_flow=False, keep_blank_chars=False)
            for ln in group_lines(words):
                d = despace(ln['text'])
                if 'nuoviaddebitiper' in d or 'totalenuoveoperazioni' in d:
                    b = beneficiary_for(d)
                    if b:
                        current_benef = b
                    continue
                if 'interessialtriaddebiti' in d:
                    current_benef = 'Andrea Vaturi'
                    continue
                if d.startswith('totale'):
                    continue
                row = parse_row(ln, words, period_from, period_to)
                if not row:
                    continue
                date1, date2, desc, magnitude, is_credit = row
                txs.append({
                    'date': date1,
                    'value_date': date2,
                    'description': desc,
                    'amount': round(magnitude if is_credit else -magnitude, 2),
                    'is_credit': is_credit,
                    'beneficiary': current_benef,
                })
    return {'meta': meta, 'transactions': txs}


def main():
    result = parse_pdf(sys.argv[1])
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
