// Guide di Supporto Tecnico: traduzioni e piccole utilità. Funzioni pure (tests/guide-data.test.js).

export const LANGS = ['it', 'en', 'fr', 'es'];

/** Unisce i testi tradotti sopra i dati italiani (stessa struttura, per posizione), come Supporto Tecnico. */
export function merge(base, tr) {
  if (tr === undefined || tr === null) return base;
  if (Array.isArray(base)) return base.map((v, i) => merge(v, Array.isArray(tr) ? tr[i] : undefined));
  if (base && typeof base === 'object') {
    const out = {};
    for (const k of Object.keys(base)) {
      if (k === 'pulsanti' || k === 'pulsantiera') out[k] = base[k];
      else if (k === 'immagini' && Array.isArray(tr[k])) out[k] = tr[k];
      else out[k] = merge(base[k], tr[k]);
    }
    return out;
  }
  return typeof tr === typeof base ? tr : base;
}

/** Prodotto nella lingua scelta. _missing = traduzione assente (si legge in italiano). */
export function localize(p, tr, lang) {
  if (!p || lang === 'it') return p;
  const t = tr && tr[p.id] && tr[p.id][lang];
  if (!t) return { ...p, _missing: true };
  const out = merge(p, t);
  out._keys = t.nomiTasti || {};
  out.sezioni = (out.sezioni || []).map((s, i) => (t.sezioni && t.sezioni[i] ? s : { ...s, _missing: true }));
  return out;
}

export const keyName = (p, k) => (p && p._keys && p._keys[k]) || k;

/** Riga riassuntiva di una sezione per l'elenco. */
export function sectionInfo(s) {
  const n = (a) => (a || []).length;
  if (s.tipo === 'istruzione') return `${n(s.passi)} ${n(s.passi) === 1 ? 'passo' : 'passi'}`;
  if (s.tipo === 'schema') return `${n(s.fogli)} fogli`;
  if (s.tipo === 'documenti') return `${n(s.file)} documenti`;
  if (s.tipo === 'ricambi') return `${n(s.ricambi)} codici`;
  if (s.tipo === 'avvisi') return `${n(s.avvisi)} avvisi`;
  return '';
}

/** Fase e nota di fase valide per ogni passo (si trascinano finché non ne arriva una nuova). */
export function stepPhases(passi) {
  let fase = '', nota = '';
  return (passi || []).map((ps) => {
    if (ps.fase) { fase = ps.fase; nota = ps.notaFase || ''; } else if (ps.notaFase) nota = ps.notaFase;
    return { fase, nota, start: !!ps.fase };
  });
}

/** Condizioni con lo stato della barella ("con"/"senza") sempre per prime. */
export function sortedConditions(s) {
  const c = s.condizioni || [];
  const stretcher = (x) => x.tipo === 'con' || x.tipo === 'senza';
  return c.filter(stretcher).concat(c.filter((x) => !stretcher(x)));
}

/** Posizioni delle targhette sulla foto della pulsantiera (come in Supporto Tecnico, senza sovrapposizioni). */
export function keypadTags(pl, keys, nameOf = (k) => k) {
  if (!pl || !pl.pulsanti) return [];
  const W = pl.larghezza, r = pl.raggio || 30;
  const byPos = {};
  for (const k of keys || []) {
    const pos = pl.pulsanti[k];
    if (!pos) continue;
    const id = pos.join(',');
    (byPos[id] = byPos[id] || { pos, names: [] }).names.push(nameOf(k));
  }
  const top = Math.min(...Object.values(pl.pulsanti).map((q) => q[1]));
  const fs = Math.max(15, W * 0.032);
  const bh = Math.round(fs * 1.6);
  const tags = Object.values(byPos).map(({ pos: [x, y], names }) => {
    const text = names.join('·');
    const above = y === top;
    const bw = text.length <= 1 ? bh - 2 : fs + text.length * fs * 0.62;
    return { x, y, r, text, above, bw, bh, fs, cx: x, by: above ? y - r - bh - 6 : y + r + 6 };
  });
  const gap = 6, m = 2;
  for (const row of [tags.filter((q) => q.above), tags.filter((q) => !q.above)]) {
    row.sort((a, b) => a.x - b.x);
    for (let k = 0; k < 30; k++) {
      let moved = false;
      for (let i = 1; i < row.length; i++) {
        const a = row[i - 1], b = row[i];
        const ov = a.cx + a.bw / 2 + gap - (b.cx - b.bw / 2);
        if (ov > 0.5) { a.cx -= ov / 2; b.cx += ov / 2; moved = true; }
      }
      for (const q of row) {
        const c = Math.min(Math.max(q.cx, m + q.bw / 2), W - m - q.bw / 2);
        if (c !== q.cx) { q.cx = c; moved = true; }
      }
      if (!moved) break;
    }
  }
  return tags;
}
