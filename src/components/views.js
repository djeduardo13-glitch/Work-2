import { h } from '../lib/html.js';

// Pagine "a pila" per le sezioni nuove (prodotti, Spark, parco, segnalazioni):
// un unico contenitore #vPg; ogni apertura aggiunge un livello, "indietro" ne toglie uno.
// Ogni pagina è una funzione registrata con registerView(nome, (arg) => ({ title, sub, html, after })).

const routes = Object.create(null);
const stack = [];
const $ = (id) => document.getElementById(id);

export function registerView(name, fn) { routes[name] = fn; }

function paint(keepScroll = false) {
  const top = stack[stack.length - 1];
  if (!top) return;
  const fn = routes[top.name];
  const v = fn ? fn(top.arg) : { title: 'Pagina', html: '<div class="empty-note" style="padding:32px 16px">Pagina non trovata.</div>' };
  const body = $('vBody');
  const y = keepScroll ? body.scrollTop : 0;
  $('vTitle').textContent = v.title || '';
  $('vSub').textContent = v.sub || '';
  $('vSub').hidden = !v.sub;
  $('vActs').innerHTML = v.actions || '';
  body.innerHTML = v.html || '';
  body.scrollTop = y;
  if (typeof v.after === 'function') v.after(body);
}

/** Apre una pagina sopra quelle già aperte. */
export function openView(name, arg = '', { replace = false } = {}) {
  stack.push({ name, arg: String(arg ?? '') });
  paint();
  $('vPg').classList.add('on');
  if (replace) history.replaceState({ type: 'view' }, '');
  else history.pushState({ type: 'view' }, '');
}

/** Pulsante "indietro" della pagina: passa dalla cronologia, così il tasto indietro di Android fa lo stesso. */
export function viewBack() { history.back(); }

/** Chiamata dal gestore popstate: toglie un livello. */
export function popView() {
  stack.pop();
  if (stack.length) paint();
  else $('vPg').classList.remove('on');
}

/** Ridisegna la pagina in cima (dopo un cambio di dati), mantenendo la posizione. */
export function refreshView() {
  if (stack.length && $('vPg')?.classList.contains('on')) paint(true);
}

export const viewOpen = () => stack.length > 0 && $('vPg')?.classList.contains('on');

// ── Livelli: l'ultima pagina aperta sta sempre sopra ────────────────────────
// Le pagine (.poppage) hanno lo stesso z-index; qui ognuna riceve un valore crescente quando si apre,
// così una trasferta aperta da una macchina (o viceversa) compare davanti.
let z = 150;
export function initLayers() {
  const obs = new MutationObserver((list) => {
    for (const m of list) {
      const el = m.target;
      if (el.classList.contains('on') && !m.oldValue?.split(/\s+/).includes('on')) el.style.zIndex = String(++z);
    }
  });
  document.querySelectorAll('.poppage').forEach((el) => obs.observe(el, { attributes: true, attributeFilter: ['class'], attributeOldValue: true }));
}

/** La pagina aperta più in alto (o null). */
export function topPoppage() {
  const open = [...document.querySelectorAll('.poppage.on')];
  return open.sort((a, b) => (Number(a.style.zIndex) || 150) - (Number(b.style.zIndex) || 150)).pop() || null;
}

// ── Pezzi di markup comuni alle sezioni nuove ───────────────────────────────
const CHEV = '<svg class="xr-chev" viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>';

/** Riga di elenco cliccabile. attrs = attributi data-action/data-args già pronti. */
export function xrow(attrs, lead, title, sub = '', right = '', { wrap = false, chev = true } = {}) {
  return `<button type="button" class="xr" ${attrs}>${lead}<span class="xr-m"><b>${title}</b>${sub ? `<span class="${wrap ? 'wrap' : ''}">${sub}</span>` : ''}</span>${right}${chev ? CHEV : ''}</button>`;
}

export const xicon = (svg, cls = '') => `<span class="xi ${cls}">${svg}</span>`;
export const xcode = (code, cls = '') => `<span class="xcode ${h(cls)}">${h(code)}</span>`;
export const xsec = (label, right = '') => `<div class="xsec"><span class="lbl">${label}</span>${right}</div>`;
