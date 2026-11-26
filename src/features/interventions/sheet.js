import { closeM, openM } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { ESITI, TIPI } from '../../config/products.js';
import { S } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { attr, h } from '../../lib/html.js';
import { catalog, clientHistory, productId } from './core.js';

// Foglio "Intervento": su quale macchina (prodotto + numero di serie), cosa e com'è finita.
// Serve alla storia della macchina nel Parco. Niente costi né statistiche.

let cur = { tid: null, iid: null };
let d = {}; // intervento in modifica
let catSel = 'car';

const $ = (id) => document.getElementById(id);
const trip = () => S.trs.find((x) => x.id === cur.tid);
const newId = () => 'iv' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function readInputs() {
  d.ser = $('iv-ser').value.trim().slice(0, 40);
  d.yr = $('iv-yr').value.replace(/\D/g, '').slice(0, 4);
  d.note = $('iv-note').value.slice(0, 2000);
  d.err = $('iv-err').value.trim().toUpperCase().slice(0, 12);
}

function fillInputs() {
  $('iv-ser').value = d.ser || '';
  $('iv-yr').value = d.yr || '';
  $('iv-note').value = d.note || '';
  $('iv-err').value = d.err || '';
}

const chips = (list, field) => list.map((v) => `<button type="button" class="sp-chip${String(d[field] ?? '') === v ? ' sel' : ''}" data-action="ivSet" data-args="${attr(field)}|${attr(v)}">${h(v)}</button>`).join('');

function paint() {
  const t = trip();
  if (!t) return;
  $('ivTitle').textContent = cur.iid ? 'Intervento' : 'Nuovo intervento';
  // macchine già viste da questo cliente (prodotto + numero di serie)
  const hist = clientHistory(S.trs, t);
  $('ivHistSec').hidden = !hist.length;
  $('ivHist').innerHTML = hist.map((x, i) => {
    const on = d.p === x.p && String(d.ser || '') === String(x.ser || '');
    return `<button type="button" class="sp-chip${on ? ' sel' : ''}" data-action="ivPickHist" data-args="${i}">${h(x.pn)}${x.ser ? ` <span class="iv-ser">${h(x.ser)}</span>` : ''}</button>`;
  }).join('');
  const cats = catalog(S.prods);
  $('ivCats').innerHTML = cats.map((c) => `<button type="button" class="iv-cat${catSel === c.k ? ' sel' : ''}" data-action="ivPickCat" data-args="${c.k}">${h(c.short)}</button>`).join('');
  const items = (cats.find((c) => c.k === catSel) || cats[0]).items;
  $('ivProds').innerHTML = items.map((p) => `<button type="button" class="sp-chip${d.p === p.id ? ' sel' : ''}" data-action="ivPickProd" data-args="${attr(p.id)}">${h(p.name)}</button>`).join('')
    + '<button type="button" class="sp-chip sm" data-action="ivNewProd">+ Altro</button>';
  $('ivTipo').innerHTML = chips(TIPI, 'tipo');
  $('ivEsito').innerHTML = chips(ESITI, 'esito');
  $('ivActions').innerHTML = cur.iid
    ? '<button type="button" class="b-danger" data-action="delIv">Elimina</button><button type="button" class="b-main" data-action="saveIv">Salva</button>'
    : '<button type="button" class="b-ghost" data-action="closeM" data-args="ivm">Annulla</button><button type="button" class="b-main" data-action="saveIv">Salva intervento</button>';
}

function open() {
  fillInputs();
  paint();
  openM('ivm');
  document.querySelector('#ivm .modal')?.scrollTo(0, 0);
}

export function openAddIv(tid) {
  const t = S.trs.find((x) => x.id === tid);
  if (!t) return;
  cur = { tid, iid: null };
  d = {};
  const hist = clientHistory(S.trs, t);
  catSel = hist[0]?.cat || catSel;
  open();
}

/** Nuovo intervento già compilato con prodotto e numero di serie (dalla scheda macchina). */
export function openAddIvFor(tid, preset = {}) {
  if (!S.trs.some((x) => x.id === tid)) return;
  cur = { tid, iid: null };
  d = { ...preset };
  if (preset.cat) catSel = preset.cat;
  open();
}

export function openEditIv(tid, iid) {
  const t = S.trs.find((x) => x.id === tid);
  const x = (t?.iv || []).find((i) => i.id === iid);
  if (!x) return;
  cur = { tid, iid };
  d = { ...x };
  catSel = x.cat || catSel;
  open();
}

/** Tipo ed esito: un secondo tocco toglie la scelta. */
export function ivSet(field, val) {
  if (!['tipo', 'esito'].includes(field)) return;
  readInputs();
  d[field] = String(d[field] ?? '') === String(val) ? '' : val;
  paint();
}

export function ivPickCat(k) { readInputs(); catSel = k; paint(); }

export function ivPickProd(id) {
  readInputs();
  const p = catalog(S.prods, { all: true }).flatMap((c) => c.items.map((i) => ({ ...i, cat: c.k }))).find((i) => i.id === id);
  if (!p) return;
  Object.assign(d, { p: p.id, pn: p.name, cat: p.cat });
  paint();
}

export function ivPickHist(i) {
  const x = clientHistory(S.trs, trip())[Number(i)];
  if (!x) return;
  readInputs();
  Object.assign(d, { p: x.p, pn: x.pn, cat: x.cat, ser: x.ser, yr: x.yr });
  catSel = x.cat;
  fillInputs();
  paint();
}

/** Prodotto che non è nel modulo: si aggiunge alla categoria aperta. */
export function ivNewProd() {
  readInputs();
  const n = String(prompt('Nome del nuovo prodotto') || '').trim().slice(0, 40);
  if (!n) return;
  const id = productId(n);
  if (!id) return;
  const all = catalog(S.prods, { all: true }).flatMap((c) => c.items.map((i) => ({ ...i, cat: c.k })));
  const ex = all.find((i) => i.id === id);
  if (ex) {
    S.prods.hid = (S.prods.hid || []).filter((x) => x !== id); // se era nascosto, torna visibile
    catSel = ex.cat;
  } else {
    S.prods.add = [...(S.prods.add || []), { id, n, c: catSel }];
  }
  save();
  ivPickProd(id);
}

export async function saveIv() {
  const t = trip();
  if (!t) return;
  readInputs();
  if (!d.p) { toast('Scegli il prodotto', true); return; }
  const x = { id: cur.iid || newId(), p: d.p, pn: d.pn, cat: d.cat, ser: d.ser || '', yr: d.yr || '', tipo: d.tipo || '', esito: d.esito || '', err: d.err || '', note: d.note || '' };
  for (const k of Object.keys(x)) if (x[k] === '') delete x[k];
  t.iv = t.iv || [];
  const i = t.iv.findIndex((v) => v.id === x.id);
  if (i >= 0) t.iv[i] = { ...t.iv[i], ...x }; else t.iv.push(x);
  save();
  closeM('ivm');
  toast(i >= 0 ? 'Intervento aggiornato' : x.ser ? `Intervento aggiunto anche alla storia di ${x.pn} ${x.ser}` : 'Intervento aggiunto');
  await refresh(t);
}

export async function delIv() {
  const t = trip();
  if (!t || !cur.iid) return;
  if (!confirm('Eliminare questo intervento?')) return;
  t.iv = (t.iv || []).filter((v) => v.id !== cur.iid);
  save();
  closeM('ivm');
  toast('Intervento eliminato');
  await refresh(t);
}

async function refresh(t) {
  document.dispatchEvent(new Event('wm:data-changed'));
  if (S.curTid === t.id && $('tdPg')?.classList.contains('on')) (await import('../trips/detail.js')).renderTrBody(t);
}

/** Pulsanti della card nella pagina trasferta. */
export function ivAdd(tid) { openAddIv(tid); }
export function ivEdit(tid, iid) { openEditIv(tid, iid); }
