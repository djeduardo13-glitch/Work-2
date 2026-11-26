// Interventi delle trasferte: catalogo prodotti e macchine già viste dal cliente.
// Funzioni pure, nessun accesso al DOM (testate in tests/interventions.test.js).
//
// Intervento (in t.iv): { id, p, pn, cat, ser, yr, tipo, esito, err, note }
// Serve a tenere la storia di ogni macchina nel Parco (prodotto + numero di serie).
// Niente costi né statistiche: l'analisi dei costi si fa fuori dall'app (decisione di ottobre 2026).

import { PRODUCT_CATS, PRODUCTS } from '../../config/products.js';

/** Id stabile di un prodotto dal nome ("EDEN BS8" → "eden-bs8"). */
export const productId = (name) => String(name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * Catalogo completo: prodotti del modulo + aggiunti a mano, meno quelli nascosti.
 * prods = { add: [{id, n, c}], hid: [id] }. Con all:true include anche i nascosti (segnati hidden).
 */
export function catalog(prods = {}, { all = false } = {}) {
  const hid = new Set(prods.hid || []);
  return PRODUCT_CATS.map((c) => {
    const base = (PRODUCTS[c.k] || []).map((n) => ({ id: productId(n), name: n, custom: false }));
    const extra = (prods.add || []).filter((p) => p.c === c.k && p.n).map((p) => ({ id: p.id, name: p.n, custom: true }));
    const items = [...base, ...extra].map((p) => ({ ...p, hidden: hid.has(p.id) })).filter((p) => all || !p.hidden);
    return { ...c, items };
  });
}

export const catInfo = (k) => PRODUCT_CATS.find((c) => c.k === k) || null;

const tripCids = (t) => new Set((t.clients || []).map((c) => c.cid).filter(Boolean));
const tripNames = (t) => new Set([...(t.clients || []).map((c) => c.name), t.cl].map((n) => String(n || '').trim().toLowerCase()).filter(Boolean));

/** Macchine già viste dallo stesso cliente in trasferte precedenti (più recenti prima, senza doppioni). */
export function clientHistory(trs, t, max = 4) {
  const cids = tripCids(t), names = tripNames(t);
  if (!cids.size && !names.size) return [];
  const seen = new Set(), out = [];
  const prev = (trs || []).filter((x) => x.id !== t.id && x.d1 <= t.d1 && (x.iv || []).length)
    .filter((x) => [...tripCids(x)].some((c) => cids.has(c)) || [...tripNames(x)].some((n) => names.has(n)))
    .sort((a, b) => b.d1.localeCompare(a.d1));
  for (const x of prev) {
    for (const iv of x.iv) {
      const k = `${iv.p}|${String(iv.ser || '').trim().toLowerCase()}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ p: iv.p, pn: iv.pn, cat: iv.cat, ser: iv.ser || '', yr: iv.yr || '' });
      if (out.length >= max) return out;
    }
  }
  return out;
}
