// Parco macchine: una scheda per ogni numero di serie, costruita unendo
// - l'anagrafica SPARK-UC dello Spark Doc Hub (fleet.js): cliente, paese, FW, FS, supporto, barellini, power pack, B-charger
// - gli interventi delle trasferte con numero di serie (t.iv[].ser)
// - le segnalazioni dello Spark Hub (issue.sns) e i file delle cartelle S/N
// Funzioni pure, testate in tests/machines.test.js.

/** Id prodotto dal nome, come nel catalogo interventi ("EDEN BS8" → "eden-bs8"). */
export const pid = (name) => String(name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Numero di serie normalizzato per i confronti (maiuscolo, senza spazi). */
export const normSer = (s) => String(s || '').toUpperCase().replace(/\s+/g, '');

/** Chiave della macchina: prodotto + numero di serie. */
export const mkey = (p, ser) => `${pid(p)}:${normSer(ser)}`;

/** Prodotto dei supporti indicati nella scheda di collaudo Spark ("EDEN-BS8 070" → EDEN BS8). */
export function supportProduct(tipo) {
  const t = String(tipo || '').toUpperCase();
  if (/EDEN[-\s]?BS8/.test(t)) return { id: 'eden-bs8', name: 'EDEN BS8' };
  if (/EDEN0?4/.test(t)) return { id: 'eden04-xp', name: 'EDEN04-XP' };
  if (/OPTIMUS[-\s]?XP/.test(t)) return { id: 'optimus-xp', name: 'OPTIMUS-XP' };
  if (/SIDESLIDE/.test(t)) return { id: 'sideslide', name: 'Sideslide' };
  if (/R-?3L/.test(t)) return { id: 'r-3l-xp', name: 'R-3L XP' };
  return { id: pid(tipo) || 'supporto', name: String(tipo || 'Supporto') };
}

const tripClient = (t) => (t.clients || []).map((c) => c.name).filter(Boolean)[0] || t.cl || '';
const cap = (s) => String(s || '').replace(/(^|\s)\S/g, (c) => c.toUpperCase());

/**
 * Tutte le macchine.
 * @param {{trs?: any[], fleet?: any[], issues?: any[], files?: any[]}} src
 * @returns {Map<string, Machine>}
 * Machine = { key, p, pn, ser, client, country, fw, spark?: fleetRecord, parent?: key, children: key[],
 *             sub: boolean (power pack / B-charger: solo nella scheda Spark), events: Event[] }
 */
export function buildMachines({ trs = [], fleet = [], issues = [], files = [] } = {}) {
  const M = new Map();
  const get = (p, pn, ser, extra = {}) => {
    const key = mkey(p, ser);
    if (!M.has(key)) M.set(key, { key, p: pid(p), pn, ser: String(ser).trim(), client: '', country: '', fw: '', children: [], sub: false, events: [], ...extra });
    return M.get(key);
  };

  for (const f of fleet) {
    if (!f || !f.sn) continue;
    const m = get('spark', 'SPARK-UC', f.sn, { spark: f });
    m.spark = f;
    m.client = f.cliente || m.client;
    m.country = f.paese || m.country;
    m.fw = String(f.fw || '').split(' ')[0];
    if (f.parametri && Object.keys(f.parametri).length) m.events.push({ d: '', kind: 'collaudo', n: Object.keys(f.parametri).length });
    const kids = [];
    if (f.supporto && f.supporto.sn) {
      const sp = supportProduct(f.supporto.tipo);
      kids.push(get(sp.id, sp.name, f.supporto.sn, { variant: f.supporto.tipo }));
    }
    if (f.powerPack) kids.push(get('power-pack', 'POWER-PACK', f.powerPack, { sub: true }));
    if (f.bCharger) kids.push(get('b-charger', 'B-CHARGER', f.bCharger, { sub: true }));
    for (const k of kids) {
      k.parent = m.key;
      k.client = k.client || m.client;
      k.country = k.country || m.country;
      if (!m.children.includes(k.key)) m.children.push(k.key);
    }
  }

  for (const t of trs) {
    for (const iv of t.iv || []) {
      if (!normSer(iv.ser)) continue;
      const m = get(iv.p || iv.pn, iv.pn || iv.p, iv.ser);
      m.sub = false; // un intervento la rende una macchina "vera" anche se è un power pack
      if (!m.client) m.client = tripClient(t);
      if (!m.country) m.country = cap(t.pa);
      if (iv.yr && !m.yr) m.yr = iv.yr;
      m.events.push({ d: t.d1, kind: 'iv', tid: t.id, iid: iv.id, tipo: iv.tipo || '', esito: iv.esito || '', err: iv.err || '', note: iv.note || '', city: cap(t.ci) });
    }
  }

  for (const i of issues) {
    for (const sn of i.sns || []) {
      const m = M.get(mkey('spark', sn));
      if (m) m.events.push({ d: String(i.createdAt || i.updatedAt || '').slice(0, 10), kind: 'issue', id: i.id, open: i.status !== 'chiusa', title: i.title || '', errs: i.errors || [] });
    }
  }

  for (const f of files) {
    const m = M.get(mkey('spark', f.sn));
    if (m) m.events.push({ d: String(f.addedAt || '').slice(0, 10), kind: 'file', id: f.id, name: f.filename || 'File', fileKind: f.kind || '' });
  }

  for (const m of M.values()) m.events.sort(byDateDesc);
  return M;
}

/** Eventi dal più recente; il collaudo (senza data) va in fondo. */
function byDateDesc(a, b) {
  if (!a.d && b.d) return 1;
  if (a.d && !b.d) return -1;
  return b.d.localeCompare(a.d);
}

/** Macchine da mostrare nell'elenco del Parco (non i power pack/B-charger senza interventi), ordinate. */
export function machineList(M, { filter = 'all', q = '' } = {}) {
  const query = normSer(q).toLowerCase();
  const text = String(q || '').toLowerCase().trim();
  return [...M.values()]
    .filter((m) => !m.sub)
    .filter((m) => filter === 'all'
      || (filter === 'open' && hasOpen(m))
      || (filter === 'iv' && m.events.some((e) => e.kind === 'iv'))
      || (filter === 'p:' + m.p))
    .filter((m) => !text || normSer(m.ser).toLowerCase().includes(query) || m.client.toLowerCase().includes(text) || m.pn.toLowerCase().includes(text) || m.country.toLowerCase().includes(text))
    .sort((a, b) => lastDate(b).localeCompare(lastDate(a)) || a.client.localeCompare(b.client) || a.ser.localeCompare(b.ser));
}

export const lastDate = (m) => (m.events.find((e) => e.d) || {}).d || '';

/** Cose ancora aperte sulla macchina: segnalazioni aperte o interventi non risolti. */
export function hasOpen(m) {
  return m.events.some((e) => (e.kind === 'issue' && e.open) || (e.kind === 'iv' && OPEN_ESITI.includes(e.esito)));
}

export const OPEN_ESITI = ['Provvisorio', 'Serve ritorno', 'Ricambi da spedire'];

/** Ultima manutenzione fatta (fino a oggi): intervento di manutenzione o PDF di manutenzione nella cartella S/N. */
export function lastMaintenance(m, today = '9999-12-31') {
  const e = m.events.find((x) => x.d && x.d <= today && ((x.kind === 'iv' && /manutenzione/i.test(x.tipo)) || (x.kind === 'file' && /manutenzione/i.test(`${x.fileKind} ${x.name}`))));
  return e ? e.d : '';
}

/** Prodotti presenti nel parco, per i filtri: [{ p, pn, n }]. */
export function productsInFleet(M) {
  const out = new Map();
  for (const m of M.values()) {
    if (m.sub) continue;
    const x = out.get(m.p) || { p: m.p, pn: m.pn, n: 0 };
    x.n++;
    out.set(m.p, x);
  }
  return [...out.values()].sort((a, b) => b.n - a.n);
}
