// Ricerca unica: un indice semplice di tutto quello che l'app conosce. Funzioni pure (tests/search.test.js).
// Voce: { kind, key, title, sub, text } — text = testo in minuscolo su cui si cerca.

const low = (...parts) => parts.filter(Boolean).join(' ').toLowerCase();
const cap = (s) => String(s || '').replace(/(^|\s)\S/g, (c) => c.toUpperCase());

export const GROUPS = [
  ['error', 'Errori Spark'],
  ['machine', 'Parco'],
  ['issue', 'Segnalazioni'],
  ['product', 'Prodotti'],
  ['guide', 'Guide'],
  ['comp', 'Componenti Spark'],
  ['trip', 'Trasferte'],
  ['client', 'Clienti'],
];

export function buildIndex({ errors = [], machines = [], products = [], sensors = {}, comps = [], trips = [], clients = [], issues = [] } = {}) {
  const out = [];
  for (const e of errors) out.push({ kind: 'error', key: e.code, title: e.code, sub: e.text, code: e.code.toLowerCase(), text: low(e.code, e.text, e.catLabel) });
  for (const m of machines) {
    if (m.sub) continue;
    out.push({ kind: 'machine', key: m.key, title: `${m.ser}${m.client ? ' · ' + m.client : ''}`, sub: [m.pn, m.country, m.variant].filter(Boolean).join(' · '), code: String(m.ser).toLowerCase().replace(/\s+/g, ''), text: low(m.ser, String(m.ser).replace(/\s+/g, ''), m.client, m.pn, m.country, m.variant) });
  }
  for (const i of issues) out.push({ kind: 'issue', key: i.id, title: i.title || 'Segnalazione', sub: [(i.errors || []).join(', '), (i.sns || []).map((s) => 'S/N ' + s).join(' · ')].filter(Boolean).join(' · '), text: low(i.title, i.description, ...(i.errors || []), ...(i.sns || []), ...(i.components || [])) });
  for (const p of products) {
    out.push({ kind: 'product', key: p.id, title: p.nome, sub: p.categoria || '', text: low(p.nome, p.id, p.categoria) });
    (p.sezioni || []).forEach((s, i) => out.push({ kind: 'guide', key: `${p.id}|${i}`, title: s.titolo, sub: p.nome, text: low(s.titolo, s.sottotitolo, p.nome) }));
  }
  for (const c of comps) {
    const d = sensors[c.id] || {};
    out.push({ kind: 'comp', key: c.id, title: c.id, sub: [String(d.tipo || c.categoria).trim(), d.dove].filter(Boolean).join(' · '), code: c.id.toLowerCase(), text: low(c.id, c.categoria, d.tipo, d.modello, d.codice, d.intro) });
  }
  for (const t of trips) {
    const cl = (t.clients || []).map((c) => c.name).filter(Boolean).join(', ') || t.cl || '';
    const ivs = (t.iv || []).flatMap((iv) => [iv.pn, iv.ser, iv.err]);
    out.push({ kind: 'trip', key: t.id, title: `${cap(t.ci)}, ${cap(t.pa)}`, sub: [t.d1, cl, t.scopo].filter(Boolean).join(' · '), text: low(t.ci, t.pa, cl, t.scopo, t.d1, ...ivs) });
  }
  for (const c of clients) out.push({ kind: 'client', key: c.id, title: c.name || 'Cliente', sub: c.addr || '', text: low(c.name, c.addr, ...(c.contacts || []).map((x) => x.name)) });
  return out;
}

/** Cerca: tutte le parole devono esserci. Codici uguali o che iniziano con la ricerca vengono prima. */
export function search(index, q, perGroup = 6) {
  const query = String(q || '').trim().toLowerCase();
  if (!query) return [];
  const words = query.split(/\s+/);
  const compact = query.replace(/\s+/g, '');
  const scored = [];
  for (const it of index) {
    if (!words.every((w) => it.text.includes(w))) continue;
    let score = 1;
    if (it.code === compact) score = 4;
    else if (it.code && it.code.startsWith(compact)) score = 3;
    else if (it.title.toLowerCase().startsWith(query)) score = 2;
    scored.push({ it, score });
  }
  return GROUPS.map(([kind, label]) => {
    const items = scored.filter((x) => x.it.kind === kind).sort((a, b) => b.score - a.score).slice(0, perGroup).map((x) => x.it);
    return { kind, label, items };
  }).filter((g) => g.items.length)
    .sort((a, b) => Math.max(...b.items.map((i) => (i.code === compact ? 1 : 0))) - Math.max(...a.items.map((i) => (i.code === compact ? 1 : 0))));
}
