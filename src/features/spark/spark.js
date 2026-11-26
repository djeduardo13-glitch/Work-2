import { openView, refreshView, registerView, xcode, xicon, xrow, xsec } from '../../components/views.js';
import { S } from '../../core/state.js';
import { fds } from '../../lib/dates.js';
import { attr, h } from '../../lib/html.js';
import { xi } from '../../lib/xicons.js';
import { products, spark, sparkUrl, stUrl } from '../../services/content.js';
import { sparkLocal } from '../../services/spark-db.js';
import { mkey } from '../fleet/machines.js';
import { guideRows } from '../products/products.js';

// Spark dentro l'app: errori, componenti, parametri, procedure e segnalazioni dello Spark Doc Hub.
// Le parti più complesse (simulatore, sequenze, modulo manutenzione, taratura) si aprono nell'hub originale.

const ui = { errQ: '', errF: 'all', compF: 'all', paramQ: '' };
const plain = (s) => String(s || '').replace(/<[^>]*>/g, '');
const errBy = (c) => spark().errors.find((e) => e.code === c);
const fdate = (iso) => (iso ? fds(String(iso).slice(0, 10)) + ' ' + String(iso).slice(0, 4) : '');

export const ISSUE_STATUS = { aperta: 'Aperta', analisi: 'In analisi', soluzione: 'Soluzione proposta', verificata: 'Verificata', chiusa: 'Chiusa' };
const OUTCOME = { daprovare: ['Da provare', 'warn'], funziona: ['Funziona', 'ok'], parziale: ['Parziale', 'warn'], nonfunziona: ['Non funziona', 're'] };
const SEVERITY = { bloccante: 'Bloccante', alta: 'Alta', media: 'Media', bassa: 'Bassa' };

const hubLink = (path, label, sub, icon = 'ext') => `<a class="xr" href="${attr(sparkUrl(path))}" target="_blank" rel="noopener">${xicon(xi(icon))}<span class="xr-m"><b>${h(label)}</b>${sub ? `<span>${h(sub)}</span>` : ''}</span>${xi('ext')}</a>`;
const statusChip = (i) => (i.status === 'chiusa' ? '<span class="x-chip ok">Chiusa</span>' : `<span class="x-chip re">${h(ISSUE_STATUS[i.status] || 'Aperta')}</span>`);

export function openSpark() { openView('spark'); }
export function openErrors() { openView('errors'); }
export function openError(code) { openView('error', code); }
export function openComps() { openView('comps'); }
export function openComp(id) { openView('comp', id); }
export function openProcs() { openView('procs'); }
export function openProc(id) { openView('proc', id); }
export function openParams() { openView('params'); }
export function openParam(i) { openView('param', i); }
export function openIssues() { openView('issues'); }
export function openIssue(id) { openView('issue', id); }
export function errFilter(k) { ui.errF = String(k); refreshView(); }
export function compFilter(k) { ui.compF = String(k); refreshView(); }

// ── Hub ─────────────────────────────────────────────────────────────────────
registerView('spark', () => {
  const sk = spark();
  const sp = products().list.find((p) => p.id === 'spark');
  const open = sparkLocal().issues.filter((i) => i.status !== 'chiusa').length;
  const tile = (act, img, title, sub) => `<button type="button" class="x-tile" ${act}><img src="${attr(sparkUrl('assets/icons/' + img))}" alt=""><b>${title}</b><small>${sub}</small></button>`;
  const html = `<div class="stack x-stack">
    ${!sk.ok ? `<div class="x-note warn">${xi('info')}<span>Dati dello Spark Doc Hub non raggiungibili. Servono la connessione la prima volta.</span></div>` : ''}
    <div class="x-shero"><div class="tx"><b>SPARK</b><span>SPARK-UC · SPARK-FS · STR-000</span>${sk.fw.length ? `<span class="x-fw">${sk.fw.map((f) => h(f.label)).join(' · ')}</span>` : ''}</div>${sp && sp.copertina ? `<img src="${attr(stUrl(`prodotti/${sp._dir}/${sp.copertina}`))}" alt="">` : ''}</div>
    <div class="x-tiles">
      ${tile('data-action="openErrors"', 'faults.png', 'Errori', `${sk.errors.length} codici`)}
      ${tile('data-action="openComps"', 'rostro.png', 'Componenti', `${sk.comps.length}`)}
      ${tile('data-action="openParams"', 'params.png', 'Parametri', `${sk.params.length}`)}
      ${tile('data-action="openProcs"', 'calibration.png', 'Procedure', `${sk.procs.length}`)}
      ${tile('data-action="openIssues"', 'faults.png', 'Segnalazioni', open ? `${open} aperte` : 'nessuna aperta')}
      ${tile('data-action="openSparkFleet"', 'workpanel.png', 'Parco', `${sk.fleet.length} macchine`)}
    </div>
    ${sp ? xsec('Guide rapide', '<span class="x-tag st">Supporto Tecnico</span>') + `<div class="ucard x-list">${guideRows(sp)}</div>` : ''}
    ${xsec('Nello Spark Doc Hub', '<span class="x-small">si apre a parte</span>')}
    <div class="ucard x-list">
      ${hubLink('index.html', 'Simulatore, sequenze, documenti, versioni FW', 'L\'hub completo')}
      ${hubLink('manutenzione-form.html', 'Modulo manutenzione', 'Si precompila dal S/N e salva il PDF nella cartella', 'wrench')}
      ${hubLink('taratura-peso.html', 'Taratura peso (calcolatore)', 'GAIN e OFFSET', 'sliders')}
    </div>
  </div>`;
  return { title: 'Spark', sub: 'Hub tecnico', html };
});

// ── Errori ──────────────────────────────────────────────────────────────────
function errorMatches(e) {
  const q = ui.errQ.trim().toLowerCase();
  return (ui.errF === 'all' || e.cat === ui.errF) && (!q || e.code.toLowerCase().includes(q) || e.text.toLowerCase().includes(q));
}
const seenCodes = () => {
  const s = new Set();
  for (const i of sparkLocal().issues) for (const c of i.errors || []) s.add(c);
  for (const t of S.trs) for (const iv of t.iv || []) if (iv.err) s.add(iv.err);
  return s;
};
function errRows() {
  const seen = seenCodes();
  const list = spark().errors.filter(errorMatches);
  return list.length ? list.map((e) => xrow(`data-action="openError" data-args="${attr(e.code)}"`, xcode(e.code, e.cat), `<span class="x-clamp">${h(e.text)}</span>`, h(e.catLabel || ''), seen.has(e.code) ? '<span class="x-chip re sm">visto</span>' : '')).join('') : '<div class="x-empty">Nessun errore trovato.</div>';
}

registerView('errors', () => {
  const cats = [];
  for (const e of spark().errors) if (!cats.some((c) => c[0] === e.cat)) cats.push([e.cat, `${e.cat} · ${e.catLabel}`]);
  return {
    title: 'Errori', sub: 'Spark',
    html: `<div class="x-search"><label class="x-sfield">${xi('search')}<input id="errQ" type="search" value="${attr(ui.errQ)}" placeholder="Codice o parola (es. CAN, R1, pressione)" aria-label="Cerca errore" autocomplete="off"></label></div>
      <div class="x-filters">${[['all', 'Tutti'], ...cats].map(([k, n]) => `<button type="button" class="${ui.errF === k ? 'on' : ''}" data-action="errFilter" data-args="${attr(k)}">${h(n)}</button>`).join('')}</div>
      <div class="stack x-stack" style="padding-top:10px"><div class="ucard x-list" id="errList">${errRows()}</div></div>`,
    after: (root) => {
      const inp = root.querySelector('#errQ');
      inp.addEventListener('input', () => { ui.errQ = inp.value; root.querySelector('#errList').innerHTML = errRows(); });
    },
  };
});

registerView('error', (code) => {
  const e = errBy(code);
  if (!e) return { title: code, html: '<div class="x-empty">Codice non presente nei dati Spark.</div>' };
  const sk = spark();
  const comps = sk.errComp[code] || [];
  const issues = sparkLocal().issues.filter((i) => (i.errors || []).includes(code));
  const ivs = [];
  for (const t of S.trs) for (const iv of t.iv || []) if (iv.err === code) ivs.push({ t, iv });
  const seen = issues.map((i) => xrow(`data-action="openIssue" data-args="${attr(i.id)}"`, xicon(xi('alert'), i.status === 'chiusa' ? 'ok' : 're'), h(i.title || 'Segnalazione'), h((i.sns || []).map((s) => 'S/N ' + s).join(' · ')), statusChip(i)))
    .concat(ivs.map(({ t, iv }) => xrow(`data-action="openTrDet" data-args="${attr(t.id)}"`, xicon(xi('plane')), `Trasferta ${h(cap(t.ci))}`, h([fds(t.d1), iv.ser && 'S/N ' + iv.ser, iv.esito].filter(Boolean).join(' · ')))));
  return {
    title: `Errore ${code}`, sub: e.catLabel || '',
    html: `<div class="stack x-stack">
      <div class="ucard x-pad x-col">${xcode(code, e.cat + ' big')}<div class="x-lead">${h(e.text)}</div></div>
      ${xsec('Componenti coinvolti')}
      <div class="ucard x-list">${comps.length ? comps.map((k) => { const d = sk.sensors[k] || {}; return xrow(`data-action="openComp" data-args="${attr(k)}"`, xcode(k), h(plain(d.tipo) || 'Componente'), h(d.dove || d.modello || '')); }).join('') : '<div class="x-empty">Nessun componente indicato.</div>'}</div>
      ${xsec('Dove l\'hai già visto')}
      <div class="ucard x-list">${seen.join('') || '<div class="x-empty">Mai registrato in segnalazioni o interventi.</div>'}</div>
    </div>`,
  };
});

// ── Componenti ──────────────────────────────────────────────────────────────
registerView('comps', () => {
  const sk = spark();
  const cats = [...new Set(sk.comps.map((c) => c.categoria))];
  const list = sk.comps.filter((c) => ui.compF === 'all' || c.categoria === ui.compF);
  return {
    title: 'Componenti', sub: 'Spark',
    html: `<div class="x-filters">${[['all', 'Tutti'], ...cats.map((c) => [c, c[0].toUpperCase() + c.slice(1)])].map(([k, n]) => `<button type="button" class="${ui.compF === k ? 'on' : ''}" data-action="compFilter" data-args="${attr(k)}">${h(n)}</button>`).join('')}</div>
      <div class="stack x-stack" style="padding-top:10px"><div class="ucard x-list">${list.map((c) => { const d = sk.sensors[c.id] || {}; return xrow(`data-action="openComp" data-args="${attr(c.id)}"`, xcode(c.id), h(plain(d.tipo) || c.categoria), h(d.intro || d.dove || d.modello || '')); }).join('')}</div></div>`,
  };
});

registerView('comp', (id) => {
  const sk = spark();
  const d = sk.sensors[id] || {};
  const errs = Object.entries(sk.errComp).filter(([, v]) => (v || []).includes(id)).map(([c]) => c);
  const issues = sparkLocal().issues.filter((i) => (i.components || []).includes(id));
  const kv = [['Tipo', plain(d.tipo)], ['Modello', d.modello], ['Codice', d.codice || d.codiceScheda], ['Cavo', d.cavo], ['Cablato', d.cablato], ['Dove', d.dove]].filter(([, v]) => v);
  const pins = (d.collegamenti || []).map((c) => `<div class="x-pins"><div class="x-small"><b>${h(c.connettore || '')}</b> · ${h(c.cavo || '')}</div><table class="x-table">${(c.pin || []).map((p) => `<tr>${p.filter((_, i) => i < 4).map((x) => `<td>${h(x)}</td>`).join('')}</tr>`).join('')}</table></div>`).join('');
  return {
    title: id, sub: plain(d.tipo) || 'Componente',
    html: `<div class="stack x-stack">
      ${d.intro ? `<div class="ucard x-pad x-lead">${h(d.intro)}</div>` : ''}
      ${(d.bullets || []).length ? `<div class="ucard x-pad"><ul class="x-ul">${d.bullets.map((b) => `<li>${h(plain(b))}</li>`).join('')}</ul></div>` : ''}
      ${kv.length ? `<div class="ucard x-pad"><dl class="x-kv">${kv.map(([a, b]) => `<dt>${a}</dt><dd>${h(b)}</dd>`).join('')}</dl></div>` : ''}
      ${pins ? xsec('Collegamenti') + `<div class="ucard x-pad x-col">${pins}</div>` : ''}
      ${(d.allegati || []).length ? xsec('Documenti') + `<div class="ucard x-list">${d.allegati.map((a) => `<a class="xr" href="${attr(sparkUrl(a.url))}" target="_blank" rel="noopener">${xicon(xi('file'))}<span class="xr-m"><b>${h(a.title)}</b><span>PDF</span></span>${xi('ext')}</a>`).join('')}</div>` : ''}
      ${xsec('Errori collegati')}
      <div class="ucard x-list">${errs.length ? errs.map((c) => { const e = errBy(c); return e ? xrow(`data-action="openError" data-args="${attr(c)}"`, xcode(c, e.cat), `<span class="x-clamp">${h(e.text)}</span>`, h(e.catLabel)) : ''; }).join('') : '<div class="x-empty">Nessun errore collegato.</div>'}</div>
      ${issues.length ? xsec('Segnalazioni') + `<div class="ucard x-list">${issues.map((i) => xrow(`data-action="openIssue" data-args="${attr(i.id)}"`, xicon(xi('alert'), i.status === 'chiusa' ? 'ok' : 're'), h(i.title), h((i.sns || []).join(' · ')), statusChip(i))).join('')}</div>` : ''}
    </div>`,
  };
});

// ── Parametri ───────────────────────────────────────────────────────────────
registerView('params', () => {
  const list = spark().params;
  return {
    title: 'Parametri', sub: 'Spark',
    html: `<div class="stack x-stack"><div class="ucard x-list">${list.map((p, i) => xrow(`data-action="openParam" data-args="${i}"`, xicon(xi('sliders')), h(p.name), h([p.default && `default ${p.default}${p.unit ? ' ' + p.unit : ''}`, p.min && p.max && `${p.min}–${p.max}`].filter(Boolean).join(' · ')))).join('') || '<div class="x-empty">Nessun parametro.</div>'}</div></div>`,
  };
});

registerView('param', (i) => {
  const p = spark().params[Number(i)];
  if (!p) return { title: 'Parametro', html: '<div class="x-empty">Non trovato.</div>' };
  const blocks = (p.desc || []).map((b) => {
    if (b.t === 'ul') return `<ul class="x-ul">${(b.items || []).map((x) => `<li>${h(plain(x))}</li>`).join('')}</ul>`;
    if (b.t === 'formula') return `<pre class="x-formula">${(b.lines || []).map(h).join('\n')}</pre>`;
    if (b.t === 'img') return `<button type="button" class="x-photo" data-action="zoomImg" data-args="${attr(sparkUrl(b.src))}"><img src="${attr(sparkUrl(b.src))}" alt="" loading="lazy">${b.caption ? `<span>${h(b.caption)}</span>` : ''}</button>`;
    return `<p>${h(plain(b.h))}</p>`;
  }).join('');
  const kv = [['Default', p.default], ['Minimo', p.min], ['Massimo', p.max], ['Risoluzione', p.res], ['Unità', p.unit]].filter(([, v]) => v !== undefined && v !== null && v !== '');
  return { title: p.name, sub: 'Parametro Spark', html: `<div class="stack x-stack"><div class="ucard x-pad"><dl class="x-kv">${kv.map(([a, b]) => `<dt>${a}</dt><dd class="mono">${h(b)}</dd>`).join('')}</dl></div><div class="ucard x-pad x-prose">${blocks}</div></div>` };
});

// ── Procedure ───────────────────────────────────────────────────────────────
registerView('procs', () => ({
  title: 'Procedure', sub: 'Spark',
  html: `<div class="stack x-stack"><div class="ucard x-list">${spark().procs.map((p) => xrow(`data-action="openProc" data-args="${attr(p.id)}"`, xicon(xi('sliders'), 'sp'), h(p.title), h(p.intro || ''), '', { wrap: true })).join('') || '<div class="x-empty">Nessuna procedura.</div>'}</div></div>`,
}));

registerView('proc', (id) => {
  const p = spark().procs.find((x) => x.id === id);
  if (!p) return { title: 'Procedura', html: '<div class="x-empty">Non trovata.</div>' };
  const calc = p.calc === 'gainOffset' ? `<div class="ucard x-list">${hubLink('taratura-peso.html', 'Apri il calcolatore', 'Inserisci pesi e pressioni: OFFSET e GAIN già calcolati', 'sliders')}</div>` : '';
  return {
    title: p.title, sub: 'Procedura Spark',
    html: `<div class="stack x-stack">${p.intro ? `<div class="x-small">${h(p.intro)}</div>` : ''}${calc}
      <div class="ucard">${(p.steps || []).map((s, i) => `<div class="x-step"><span class="x-num">${i + 1}</span><div class="x-step-b"><div class="x-step-t"><b>${h(s.title)}</b></div>${s.detail ? `<div class="x-small">${h(plain(s.detail))}</div>` : ''}${(s.fields || []).length ? `<div class="x-keys">${s.fields.map((f) => `<kbd class="light">${h(f.label)}${f.unit ? ' · ' + h(f.unit) : ''}</kbd>`).join('')}</div>` : ''}</div></div>`).join('')}</div>
      ${p.source ? `<div class="x-small">Fonte: ${h(p.source)}</div>` : ''}</div>`,
  };
});

// ── Segnalazioni (lette dallo Spark Hub) ────────────────────────────────────
export function issuesListHtml() {
  const all = sparkLocal().issues.slice().sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
  const row = (i) => xrow(`data-action="openIssue" data-args="${attr(i.id)}"`, xcode((i.errors || [])[0] || '#' + (i.num || ''), errBy((i.errors || [])[0])?.cat || ''), h(i.title || 'Segnalazione'), h([(i.sns || []).map((s) => 'S/N ' + s).join(' · '), fdate(i.updatedAt || i.createdAt)].filter(Boolean).join(' · ')), statusChip(i));
  const open = all.filter((i) => i.status !== 'chiusa');
  const closed = all.filter((i) => i.status === 'chiusa');
  return `${xsec(`Aperte · ${open.length}`)}<div class="ucard x-list">${open.map(row).join('') || '<div class="x-empty">Nessuna segnalazione aperta.</div>'}</div>
    ${closed.length ? xsec(`Chiuse · ${closed.length}`) + `<div class="ucard x-list">${closed.map(row).join('')}</div>` : ''}
    <div class="x-note">${xi('info')}<span>Le segnalazioni si scrivono nello Spark Doc Hub, su questo dispositivo: qui si vedono collegate a macchine, errori e trasferte.</span></div>
    <div class="ucard x-list">${hubLink('index.html', 'Nuova segnalazione o modifica', 'Apri lo Spark Doc Hub', 'alert')}</div>`;
}

registerView('issues', () => ({ title: 'Segnalazioni', sub: 'Spark', html: `<div class="stack x-stack">${issuesListHtml()}</div>` }));

registerView('issue', (id) => {
  const i = sparkLocal().issues.find((x) => x.id === id);
  if (!i) return { title: 'Segnalazione', html: '<div class="x-empty">Segnalazione non trovata su questo dispositivo.</div>' };
  const sols = (i.solutions || []).map((s) => {
    const [lbl, cls] = OUTCOME[s.outcome] || ['—', 'warn'];
    return `<div class="x-tli"><span class="x-dot2 ${cls}">${xi(cls === 'ok' ? 'check' : cls === 're' ? 'x' : 'clock')}</span><span class="xr-m"><b>${h(s.text)}</b><span>${h(lbl)}${s.date ? ' · ' + fdate(s.date) : ''}</span></span></div>`;
  }).join('');
  const machinesRows = (i.sns || []).map((sn) => xrow(`data-action="openMachine" data-args="${attr(mkey('spark', sn))}"`, xicon(xi('fleet'), 'sp'), `SPARK-UC <span class="mono">${h(sn)}</span>`, h(spark().fleet.find((f) => String(f.sn) === String(sn))?.cliente || ''))).join('');
  return {
    title: i.title || 'Segnalazione', sub: `#${i.num || ''} · ${ISSUE_STATUS[i.status] || ''}`,
    html: `<div class="stack x-stack">
      <div class="ucard x-pad x-col">
        <div class="x-chips">${statusChip(i)}${i.severity ? `<span class="x-chip ${i.severity === 'bloccante' || i.severity === 'alta' ? 're' : 'grey'}">${h(SEVERITY[i.severity] || i.severity)}</span>` : ''}${i.fw ? `<span class="x-chip grey">FW ${h(i.fw)}</span>` : ''}</div>
        ${i.description ? `<div class="x-lead">${h(i.description).replace(/\n/g, '<br>')}</div>` : ''}
        <div class="x-chips">${(i.errors || []).map((c) => `<button type="button" class="x-pill" data-action="openError" data-args="${attr(c)}">${h(c)}</button>`).join('')}${(i.components || []).map((c) => `<button type="button" class="x-pill grey" data-action="openComp" data-args="${attr(c)}">${h(c)}</button>`).join('')}</div>
        <div class="x-small">Creata ${fdate(i.createdAt)}${i.updatedAt ? ' · aggiornata ' + fdate(i.updatedAt) : ''}</div>
      </div>
      ${xsec(`Soluzioni provate · ${(i.solutions || []).length}`)}
      <div class="ucard x-pad">${sols || '<div class="x-empty" style="padding:6px">Ancora nessuna soluzione.</div>'}</div>
      ${machinesRows ? xsec('Macchine') + `<div class="ucard x-list">${machinesRows}</div>` : ''}
      <div class="ucard x-list">${hubLink('index.html', 'Modifica nello Spark Doc Hub', 'Aggiungi soluzioni, cambia lo stato')}</div>
    </div>`,
  };
});

function cap(s) { return String(s || '').replace(/(^|\s)\S/g, (c) => c.toUpperCase()); }
