import { openM } from '../../components/modal.js';
import { openView, xcode, xicon, xrow } from '../../components/views.js';
import { S } from '../../core/state.js';
import { attr, h } from '../../lib/html.js';
import { xi } from '../../lib/xicons.js';
import { loadContent, products, spark } from '../../services/content.js';
import { sparkLocal } from '../../services/spark-db.js';
import { machines } from '../fleet/fleet-data.js';
import { buildIndex, search } from './search-index.js';

// Ricerca unica (lente in alto): errori, S/N, segnalazioni, prodotti, guide, componenti, trasferte, clienti.

const $ = (id) => document.getElementById(id);
let index = null;
const ICON = { machine: ['fleet', 'sp'], issue: ['alert', 're'], product: ['box', ''], guide: ['book', ''], trip: ['plane', ''], client: ['user', ''] };
const TRY = ['E011', 'L007', 'Poitiers', 'EDEN', 'laser', 'altezza di carico'];

function rebuild() {
  const sk = spark();
  index = buildIndex({
    errors: sk.errors, machines: [...machines().values()], products: products().list, sensors: sk.sensors, comps: sk.comps,
    trips: S.trs, clients: S.clients, issues: sparkLocal().issues,
  });
}

function paint() {
  const q = $('srchQ').value;
  const box = $('srchRes');
  if (!q.trim()) {
    box.innerHTML = `<div class="lbl" style="margin:6px 2px">Prova</div><div class="x-chips">${TRY.map((x) => `<button type="button" class="x-pill" data-action="srchFill" data-args="${attr(x)}">${h(x)}</button>`).join('')}</div>
      <div class="x-note" style="margin-top:12px">${xi('info')}<span>Cerca insieme in errori, parco, segnalazioni, prodotti e guide, componenti, trasferte e clienti.</span></div>`;
    return;
  }
  if (!index) rebuild();
  const groups = search(index, q);
  box.innerHTML = groups.length ? groups.map((g) => `<div class="xsec"><span class="lbl">${h(g.label)}</span></div><div class="ucard x-list">${g.items.map((it) => {
    const lead = it.kind === 'error' ? xcode(it.key, spark().errors.find((e) => e.code === it.key)?.cat || '') : it.kind === 'comp' ? xcode(it.key) : xicon(xi(ICON[it.kind][0]), ICON[it.kind][1]);
    return xrow(`data-action="srchGo" data-args="${attr(it.kind)}|${attr(it.key)}"`, lead, h(it.kind === 'error' ? it.sub : it.title), h(it.kind === 'error' ? '' : it.sub), '', { wrap: it.kind === 'error' });
  }).join('')}</div>`).join('') : '<div class="x-empty">Nessun risultato.</div>';
}

export function openSearch(q = '') {
  index = null;
  openM('srch');
  const inp = $('srchQ');
  inp.value = typeof q === 'string' ? q : '';
  paint();
  setTimeout(() => inp.focus(), 50);
  loadContent().then(() => { index = null; paint(); });
}

export function closeSearch() { history.back(); }
export function srchFill(q) { $('srchQ').value = String(q); paint(); }

/** Apre il risultato: la ricerca si chiude e al suo posto (stessa voce di cronologia) si apre la pagina. */
export async function srchGo(kind, ...rest) {
  $('srch').classList.remove('on');
  const key = rest.join('|'); // la chiave di una guida contiene già una "|"
  if (kind === 'trip') { (await import('../trips/detail.js')).openTrDet(key); return; }
  if (kind === 'client') { (await import('../clients/clients.js')).openClient(key); return; }
  const route = { error: 'error', machine: 'machine', issue: 'issue', guide: 'guide', comp: 'comp' }[kind];
  if (kind === 'product') openView(key === 'spark' ? 'spark' : 'product', key, { replace: true });
  else if (route) openView(route, key, { replace: true });
}

export function initSearch() {
  $('srchQ').addEventListener('input', paint);
  document.addEventListener('wm:content', () => { index = null; });
  document.addEventListener('wm:data-changed', () => { index = null; });
}
