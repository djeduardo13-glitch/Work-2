import { openM } from '../../components/modal.js';
import { openView, refreshView, registerView, xicon, xrow, xsec } from '../../components/views.js';
import { S } from '../../core/state.js';
import { attr, h } from '../../lib/html.js';
import { xi } from '../../lib/xicons.js';
import { contentReady, products, spark, stUrl } from '../../services/content.js';
import { catalog } from '../interventions/core.js';
import { machines } from '../fleet/fleet-data.js';
import { keyName, keypadTags, LANGS, localize, sectionInfo, sortedConditions, stepPhases } from './guide-data.js';

// Sezione "Prodotti": guide di Supporto Tecnico + catalogo prodotti degli interventi.

const LANG_KEY = 'wmx-lang';
let lang = (() => { try { const l = localStorage.getItem(LANG_KEY); return LANGS.includes(l) ? l : 'it'; } catch { return 'it'; } })();
let tab = 'g';

const stProd = (id) => products().list.find((p) => p.id === id) || null;
const loc = (p) => localize(p, products().tr, lang);
const base = (p) => stUrl(`prodotti/${p._dir}/`);
const cover = (p) => (p.copertina || p.pulsantiera?.immagine ? base(p) + (p.copertina || p.pulsantiera.immagine) : '');
const br = (s) => h(s).replace(/\n/g, '<br>');

/** Prodotto del catalogo interventi (anche senza guida). */
function catalogItem(id) {
  for (const c of catalog(S.prods, { all: true })) {
    const p = c.items.find((i) => i.id === id);
    if (p) return { ...p, cat: c };
  }
  return null;
}

/** Nome leggibile di un prodotto qualsiasi. */
export const productName = (id) => stProd(id)?.nome || catalogItem(id)?.name || id;

// ── Schermata principale ───────────────────────────────────────────────────
export function renderProdotti() {
  const el = document.getElementById('rBody');
  if (!el) return;
  if (!contentReady()) { el.innerHTML = '<div class="x-loading">Caricamento delle guide…</div>'; return; }
  const P = products();
  const list = P.list.filter((p) => p.id !== 'spark').sort((a, b) => a.nome.localeCompare(b.nome));
  const sp = stProd('spark');
  const sk = spark();
  const withGuide = new Set(P.list.map((p) => p.id));
  const others = catalog(S.prods).map((c) => ({ ...c, items: c.items.filter((i) => !withGuide.has(i.id)) })).filter((c) => c.items.length);
  const warn = !P.ok ? `<div class="x-note warn">${xi('info')}<span>Guide di Supporto Tecnico non raggiungibili. Serve la connessione la prima volta; poi restano disponibili anche offline.</span></div>` : '';
  el.innerHTML = `<div class="stack x-stack">
    ${warn}
    ${sp || sk.ok ? `<button type="button" class="x-pcard wide" data-action="openSpark">
      <span class="im">${sp && cover(sp) ? `<img src="${attr(cover(sp))}" alt="" loading="lazy">` : ''}</span>
      <span class="tx"><span class="x-tag sp">Hub completo</span><b>Spark</b><span>Errori, componenti, parametri, procedure${sk.fleet.length ? `, ${sk.fleet.length} macchine` : ''}</span></span>
    </button>` : ''}
    ${list.length ? xsec('Guide di regolazione') + `<div class="x-pgrid">${list.map((p) => `<button type="button" class="x-pcard" data-action="openProduct" data-args="${attr(p.id)}">
      <span class="im">${cover(p) ? `<img src="${attr(cover(p))}" alt="" loading="lazy">` : xi('box')}</span>
      <span class="tx"><b>${h(p.nome)}</b><span>${(p.sezioni || []).length} guide · ${h(p.categoria || '')}</span></span></button>`).join('')}</div>` : ''}
    ${others.length ? xsec('Altri prodotti') + `<div class="ucard x-pad"><div class="x-small">Senza guida: servono per gli interventi e il Parco.</div>${others.map((c) => `<div class="x-catn">${h(c.name)}</div><div class="x-minis">${c.items.map((i) => `<button type="button" class="x-mini" data-action="openProduct" data-args="${attr(i.id)}">${h(i.name)}</button>`).join('')}</div>`).join('')}</div>` : ''}
  </div>`;
}

export function openProduct(id) { tab = 'g'; openView('product', id); }
export function openGuide(id, si) { openView('guide', `${id}|${si}`); }
export function prodTab(t) { tab = t === 'm' ? 'm' : 'g'; refreshView(); }
export function setGuideLang(l) {
  if (!LANGS.includes(l)) return;
  lang = l;
  try { localStorage.setItem(LANG_KEY, l); } catch { /* niente */ }
  refreshView();
}

/** Apre un'immagine a schermo intero (visore delle foto). */
export function zoomImg(src) {
  const img = document.getElementById('phvImg');
  img.src = src;
  img.alt = '';
  openM('phv');
}

const langBar = () => `<div class="x-langs" role="group" aria-label="Lingua della guida">${LANGS.map((l) => `<button type="button" class="${lang === l ? 'on' : ''}" data-action="setGuideLang" data-args="${l}">${l.toUpperCase()}</button>`).join('')}</div>`;

const ICON_BY_TYPE = { istruzione: 'book', schema: 'layers', avvisi: 'alert', collegamento: 'link', ricambi: 'wrench', documenti: 'file' };

/** Elenco delle guide di un prodotto (righe). */
export function guideRows(p0) {
  const p = loc(p0);
  return (p.sezioni || []).map((s, i) => {
    const info = sectionInfo(s);
    const go = s.tipo === 'collegamento' && s.vai ? `data-action="openGuideLink" data-args="${attr(s.vai)}"` : `data-action="openGuide" data-args="${attr(p.id)}|${i}"`;
    const sub = [s.sottotitolo, s._missing ? 'solo in italiano' : ''].filter(Boolean).join(' · ');
    return xrow(go, xicon(xi(ICON_BY_TYPE[s.tipo] || 'file')), h(s.titolo) + (s.etichetta ? ` <span class="x-etq">${h(s.etichetta)}</span>` : ''), h(sub), info ? `<span class="x-info">${h(info)}</span>` : '', { wrap: true });
  }).join('');
}

/** Collegamento a una guida di un altro prodotto ("sherpa-slim/s2"). */
export function openGuideLink(vai) {
  const [id, s] = String(vai).split('/');
  const n = parseInt(String(s || '').replace(/\D/g, ''), 10);
  if (stProd(id) && n) openGuide(id, n - 1);
  else if (stProd(id)) openProduct(id);
}

registerView('product', (id) => {
  const p0 = stProd(id);
  const ci = catalogItem(id);
  const M = [...machines().values()].filter((m) => m.p === id && !m.sub);
  const mrows = M.length
    ? M.map((m) => xrow(`data-action="openMachine" data-args="${attr(m.key)}"`, xicon(xi('fleet'), 'sp'), `<span class="mono">${h(m.ser)}</span>${m.client ? ' · ' + h(m.client) : ''}`, h([m.variant, m.country, m.parent ? 'sotto ' + m.parent.split(':')[1] : ''].filter(Boolean).join(' · ')))).join('')
    : '<div class="x-empty">Nessuna macchina con numero di serie per questo prodotto.<br>Compare qui al primo intervento con S/N.</div>';
  if (!p0) {
    const name = ci?.name || id;
    return { title: name, sub: ci?.cat?.name || '', html: `<div class="stack x-stack">${xsec(`Macchine · ${M.length}`)}<div class="ucard x-list">${mrows}</div><div class="x-note">${xi('info')}<span>Per questo prodotto non c'è ancora una guida in Supporto Tecnico.</span></div></div>` };
  }
  const p = loc(p0);
  const img = cover(p0);
  const html = `<div class="stack x-stack">
    ${img ? `<button type="button" class="x-pimg" data-action="zoomImg" data-args="${attr(img)}"><img src="${attr(img)}" alt="${attr(p.nome)}"></button>` : ''}
    ${p.descrizione ? `<div class="x-small">${h(p.descrizione)}</div>` : ''}
    <div class="x-row-sb"><span class="lbl">Lingua guida</span>${langBar()}</div>
    ${p._missing ? '<div class="x-note warn"><span>Traduzione non ancora disponibile: testo in italiano.</span></div>' : ''}
  </div>
  <div class="x-tabs"><button type="button" class="${tab === 'g' ? 'on' : ''}" data-action="prodTab" data-args="g">Guide (${(p.sezioni || []).length})</button><button type="button" class="${tab === 'm' ? 'on' : ''}" data-action="prodTab" data-args="m">Macchine (${M.length})</button></div>
  <div class="stack x-stack" style="padding-top:12px">
    <div class="ucard x-list">${tab === 'g' ? guideRows(p0) || '<div class="x-empty">Nessuna guida.</div>' : mrows}</div>
    ${p.aggiornato || p.fonte ? `<div class="x-small">${[p.aggiornato && 'Aggiornato ' + h(p.aggiornato), p.fonte && h(p.fonte)].filter(Boolean).join(' · ')}</div>` : ''}
  </div>`;
  return { title: p.titoloPagina || p.nome, sub: p.categoria || '', html };
});

// ── Una guida ──────────────────────────────────────────────────────────────
function keypad(p, keys) {
  const pl = p.pulsantiera;
  if (!pl || !pl.immagine) return '';
  const tags = keypadTags(pl, keys, (k) => keyName(p, k));
  const svg = tags.map((t) => {
    const ly1 = t.above ? t.by + t.bh : t.y + t.r + 2, ly2 = t.above ? t.y - t.r - 2 : t.by;
    const lx1 = t.above ? t.cx : t.x, lx2 = t.above ? t.x : t.cx;
    return `<circle class="halo" cx="${t.x}" cy="${t.y}" r="${t.r + 4}"/><circle class="ring" cx="${t.x}" cy="${t.y}" r="${t.r + 2}"/>`
      + `<line class="wire" x1="${lx1}" y1="${ly1}" x2="${lx2}" y2="${ly2}"/><rect class="plate" x="${t.cx - t.bw / 2}" y="${t.by}" width="${t.bw}" height="${t.bh}" rx="4"/>`
      + `<text class="plate-t" x="${t.cx}" y="${t.by + t.bh / 2 + 1}" style="font-size:${t.fs}px">${h(t.text)}</text>`;
  }).join('');
  return `<figure class="x-keypad" style="aspect-ratio:${pl.larghezza}/${pl.altezza}"><img src="${attr(base(p) + pl.immagine)}" alt="Pulsantiera"><svg viewBox="0 0 ${pl.larghezza} ${pl.altezza}" aria-hidden="true">${svg}</svg></figure>`;
}

const MODE = { insieme2s: 'premi insieme per 2 secondi', finoBeep: 'tieni premuto fino al segnale acustico', insieme: 'premi insieme', oppure: 'uno dei due' };

function stepHtml(p, s, ps, i, ph) {
  const keys = ps.pulsanti || [];
  const photos = [].concat(ps.immagine ? [{ src: ps.immagine, cap: ps.didascalia }] : [], (ps.immagini || []).map((x) => (typeof x === 'string' ? { src: x } : { src: x.src, cap: x.didascalia })));
  const sep = ps.modo === 'oppure' ? '<span class="x-plus">oppure</span>' : '<span class="x-plus">+</span>';
  return `${ph.start ? `<div class="x-phase">${h(ph.fase)}${ph.nota ? `<small>${h(ph.nota)}</small>` : ''}</div>` : ''}
  <div class="x-step${ps.tipoPasso === 'alternativa' ? ' alt' : ''}">
    <span class="x-num">${h(ps.num || i + 1)}</span>
    <div class="x-step-b">
      ${ps.tipoPasso === 'alternativa' ? '<span class="x-tag warn">Per annullare</span>' : ''}
      <div class="x-step-t">${br(ps.testo)}</div>
      ${ps.nota ? `<div class="x-small"><b>Nota:</b> ${br(ps.nota)}</div>` : ''}
      ${keys.length ? `<div class="x-keys">${keys.map((k) => `<kbd>${h(keyName(p, k))}</kbd>`).join(keys.length > 1 ? sep : '')}${MODE[ps.modo] && ps.modo !== 'oppure' ? `<small>${MODE[ps.modo]}</small>` : ''}</div>` : ''}
      ${keys.length ? keypad(p, keys) : ''}
      ${photos.map((f) => `<button type="button" class="x-photo" data-action="zoomImg" data-args="${attr(base(p) + f.src)}"><img src="${attr(base(p) + f.src)}" alt="${attr(f.cap || '')}" loading="lazy">${f.cap ? `<span>${h(f.cap)}</span>` : ''}</button>`).join('')}
      ${ps.esito ? `<div class="x-result">${xi('beep')}<span>${h(ps.esito)}</span></div>` : ''}
    </div>
  </div>`;
}

function sectionBody(p, s) {
  const b = base(p);
  switch (s.tipo) {
    case 'istruzione': {
      const conds = sortedConditions(s).map((c) => `<span class="x-cond ${h(c.tipo || 'info')}">${h(c.testo)}</span>`).join('');
      const ph = stepPhases(s.passi);
      return `${conds ? `<div class="x-conds"><span class="lbl">Prima di iniziare</span>${conds}</div>` : ''}
        <div class="ucard">${(s.passi || []).map((ps, i) => stepHtml(p, s, ps, i, ph[i])).join('')}</div>
        ${s.attenzione ? `<div class="x-attn">${xi('alert')}<span>${br(s.attenzione)}</span></div>` : ''}`;
    }
    case 'avvisi':
      return (s.avvisi || []).map((a) => `<div class="x-attn ${a.tipo === 'importante' ? 'imp' : ''}">${xi(a.tipo === 'importante' ? 'info' : 'alert')}<span>${a.titolo ? `<b>${h(a.titolo)}</b><br>` : ''}${br(a.testo)}</span></div>`).join('');
    case 'schema':
      return `<div class="x-sheets">${(s.fogli || []).map((f) => `<button type="button" class="x-photo" data-action="zoomImg" data-args="${attr(b + f.immagine)}"><img src="${attr(b + f.immagine)}" alt="" loading="lazy"><span><b>${h(f.titolo || '')}</b> ${h(f.descrizione || '')}</span></button>`).join('')}</div>${docsList(b, s.file)}`;
    case 'ricambi':
      return `${s.immagine ? `<button type="button" class="x-photo" data-action="zoomImg" data-args="${attr(b + s.immagine)}"><img src="${attr(b + s.immagine)}" alt="" loading="lazy"></button>` : ''}
        <div class="ucard x-list">${(s.ricambi || []).map((r) => `<div class="xr static"><span class="x-dot" style="background:${attr(r.colore || '#1e3a5f')}"></span><span class="xr-m"><b><span class="mono">${h(r.codice)}</span> · ${h(r.nome)}</b><span class="wrap">${h([r.lato, r.nota, lang !== 'it' && r.etichettaFoto ? `(${r.etichettaFoto})` : ''].filter(Boolean).join(' · '))}</span></span></div>`).join('')}</div>`;
    case 'documenti':
      return docsList(b, s.file);
    case 'tabella': {
      const head = s.intestazioni ? `<tr>${s.intestazioni.map((x) => `<th>${h(x)}</th>`).join('')}</tr>` : '';
      return `<div class="ucard x-tablewrap"><table class="x-table">${head}${(s.righe || []).map((r) => `<tr>${r.map((c, i) => (!s.intestazioni && i === 0 ? `<th>${br(c)}</th>` : `<td>${br(c)}</td>`)).join('')}</tr>`).join('')}</table></div>`;
    }
    case 'lista':
      return `<div class="ucard x-pad"><ul class="x-ul">${(s.voci || []).map((v) => `<li>${br(v)}</li>`).join('')}</ul></div>`;
    default:
      return s.testo ? `<div class="ucard x-pad">${br(s.testo)}</div>` : '<div class="x-empty">Contenuto non disponibile in questa vista.</div>';
  }
}

function docsList(b, files) {
  if (!files || !files.length) return '';
  return `<div class="ucard x-list">${files.map((f) => `<a class="xr" href="${attr(b + f.percorso)}" target="_blank" rel="noopener">${xicon(xi('file'))}<span class="xr-m"><b>${h(f.nome)}</b><span>${h((f.percorso.split('.').pop() || '').toUpperCase())}</span></span>${xi('ext')}</a>`).join('')}</div>`;
}

registerView('guide', (arg) => {
  const [id, si] = arg.split('|');
  const p0 = stProd(id);
  if (!p0) return { title: 'Guida', html: '<div class="x-empty">Guida non disponibile.</div>' };
  const p = loc(p0);
  const s = (p.sezioni || [])[Number(si)];
  if (!s) return { title: p.nome, html: '<div class="x-empty">Guida non trovata.</div>' };
  return {
    title: s.titolo,
    sub: p.nome,
    html: `<div class="stack x-stack">
      ${s.sottotitolo ? `<div class="x-small">${h(s.sottotitolo)}</div>` : ''}
      ${s._missing ? '<div class="x-note warn"><span>Questa guida è solo in italiano.</span></div>' : ''}
      ${sectionBody(p, s)}
      <div class="x-row-sb" style="margin-top:4px"><span class="lbl">Lingua</span>${langBar()}</div>
    </div>`,
  };
});

