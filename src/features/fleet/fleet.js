import { closeM, openM } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { openView, registerView, xicon, xrow, xsec } from '../../components/views.js';
import { S } from '../../core/state.js';
import { fd, fds } from '../../lib/dates.js';
import { attr, h } from '../../lib/html.js';
import { xi } from '../../lib/xicons.js';
import { contentReady, sparkUrl } from '../../services/content.js';
import { getSparkFile, sparkLocal } from '../../services/spark-db.js';
import { openAddIvFor } from '../interventions/sheet.js';
import { catalog } from '../interventions/core.js';
import { productName } from '../products/products.js';
import { hasOpen, lastMaintenance, machineList, OPEN_ESITI, productsInFleet } from './machines.js';
import { machines } from './fleet-data.js';

// Sezione "Parco": una scheda per ogni numero di serie, con la storia completa.

const ui = { filter: 'all', q: '' };
const fdate = (d) => (d ? `${fds(d)} ${d.slice(0, 4)}` : '');
const cap = (s) => String(s || '').replace(/(^|\s)\S/g, (c) => c.toUpperCase());

function listRows(M) {
  const list = machineList(M, ui);
  if (!list.length) return '<div class="x-empty">Nessuna macchina.</div>';
  return list.map((m) => {
    const open = hasOpen(m);
    const ivs = m.events.filter((e) => e.kind === 'iv').length;
    const right = open ? '<span class="x-chip re sm">Aperto</span>' : ivs ? `<span class="x-chip grey sm">${ivs} interv.</span>` : '';
    const sub = [m.variant || m.pn, m.country].filter(Boolean).join(' · ');
    return xrow(`data-action="openMachine" data-args="${attr(m.key)}"`, xicon(xi('fleet'), m.p === 'spark' ? 'sp' : ''), `<span class="mono">${h(m.ser)}</span>${m.client ? ' · ' + h(m.client) : ''}`, h(sub), right);
  }).join('');
}

export function renderParco() {
  const el = document.getElementById('kBody');
  if (!el) return;
  const M = machines();
  const prods = productsInFleet(M);
  const opens = [...M.values()].filter((m) => !m.sub && hasOpen(m)).length;
  const issuesOpen = sparkLocal().issues.filter((i) => i.status !== 'chiusa').length;
  const filters = [['all', 'Tutte'], ['open', `Aperte${opens ? ' · ' + opens : ''}`], ['iv', 'Con interventi'], ...prods.map((p) => ['p:' + p.p, `${p.pn} · ${p.n}`])];
  el.innerHTML = `<div class="stack x-stack">
    <div class="ucard x-list">
      ${xrow('data-action="openIssues"', xicon(xi('alert'), issuesOpen ? 're' : 'ok'), 'Segnalazioni Spark', issuesOpen ? `${issuesOpen} aperte` : 'Nessuna aperta')}
    </div>
    <label class="x-sfield">${xi('search')}<input id="parcoQ" type="search" value="${attr(ui.q)}" placeholder="S/N, cliente, prodotto, paese" aria-label="Cerca nel parco" autocomplete="off"></label>
  </div>
  <div class="x-filters" style="margin-top:10px">${filters.map(([k, n]) => `<button type="button" class="${ui.filter === k ? 'on' : ''}" data-action="parcoFilter" data-args="${attr(k)}">${h(n)}</button>`).join('')}</div>
  <div class="stack x-stack" style="padding-top:10px">
    ${!contentReady() ? '<div class="x-loading">Caricamento dati Spark…</div>' : ''}
    <div class="ucard x-list" id="parcoList">${listRows(M)}</div>
    <div class="x-note">${xi('info')}<span>Ci sono gli SPARK-UC dello Spark Doc Hub con i loro supporti, più ogni macchina a cui hai fatto un intervento con numero di serie.</span></div>
  </div>`;
  const inp = el.querySelector('#parcoQ');
  inp.addEventListener('input', () => { ui.q = inp.value; el.querySelector('#parcoList').innerHTML = listRows(machines()); });
}

export function parcoFilter(k) { ui.filter = String(k); renderParco(); }

export function openMachine(key) { openView('machine', key); }

/** Dal riquadro Spark: elenco degli SPARK-UC. */
export function openSparkFleet() { openView('fleetspark'); }

registerView('fleetspark', () => {
  const M = machines();
  const list = machineList(M, { filter: 'p:spark' });
  return {
    title: 'Parco SPARK-UC', sub: `${list.length} macchine`,
    html: `<div class="stack x-stack"><div class="ucard x-list">${list.map((m) => xrow(`data-action="openMachine" data-args="${attr(m.key)}"`, xicon(xi('fleet'), 'sp'), `<span class="mono">${h(m.ser)}</span>${m.client ? ' · ' + h(m.client) : ''}`, h([m.country, kidsLabel(M, m)].filter(Boolean).join(' · ')), hasOpen(m) ? '<span class="x-chip re sm">Aperto</span>' : '')).join('') || '<div class="x-empty">Nessuna macchina.</div>'}</div></div>`,
  };
});

const kidsLabel = (M, m) => m.children.map((k) => M.get(k)).filter((k) => k && !k.sub).map((k) => k.variant || k.pn).join(', ');

const EV = {
  iv: (e) => ({ cls: OPEN_ESITI.includes(e.esito) ? 'warn' : 'wm', icon: 'plane', t: `${e.tipo || 'Intervento'} · ${e.city}`, s: [e.err && 'Errore ' + e.err, e.note, e.esito].filter(Boolean).join(' · '), act: `data-action="openTrDet" data-args="${attr(e.tid)}"` }),
  issue: (e) => ({ cls: e.open ? 're' : 'ok', icon: 'alert', t: `Segnalazione${e.open ? ' aperta' : ' chiusa'}`, s: [e.title, e.errs.join(', ')].filter(Boolean).join(' · '), act: `data-action="openIssue" data-args="${attr(e.id)}"` }),
  file: (e) => ({ cls: 'warn', icon: /manutenzione/i.test(e.fileKind + e.name) ? 'wrench' : 'file', t: /manutenzione/i.test(e.fileKind + e.name) ? 'Manutenzione' : 'File', s: e.name, act: `data-action="openMachineFile" data-args="${attr(e.id)}"` }),
  collaudo: (e, m) => ({ cls: 'sp', icon: 'check', t: 'Scheda di collaudo', s: `${e.n} parametri registrati`, act: `data-action="openMachineParams" data-args="${attr(m.key)}"` }),
};

registerView('machine', (key) => {
  const M = machines();
  const m = M.get(key);
  if (!m) return { title: 'Macchina', html: '<div class="x-empty">Macchina non trovata.</div>' };
  const parent = m.parent ? M.get(m.parent) : null;
  const kids = m.children.map((k) => M.get(k)).filter(Boolean);
  const open = hasOpen(m);
  const lm = lastMaintenance(m, fd(new Date()));
  const ivN = m.events.filter((e) => e.kind === 'iv').length;
  const hist = m.events.map((e) => {
    const x = EV[e.kind](e, m);
    return `<button type="button" class="x-tli" ${x.act}><span class="x-dot2 ${x.cls}">${xi(x.icon)}</span><span class="xr-m"><b>${h(x.t)}</b><span class="wrap">${h(x.s)}</span></span><span class="x-dt">${e.d ? fdate(e.d) : 'collaudo'}</span></button>`;
  }).join('');
  const f = m.spark;
  const conf = [
    f?.fs && ['SPARK-FS', f.fs, null],
    ...kids.map((k) => [k.variant || k.pn, k.ser, k]),
    ...((f?.barellini) || []).map((b) => [`Barellino ${b.tipo}`, b.sn, null]),
  ].filter(Boolean);
  const confRows = conf.map(([n, sn, k]) => (k
    ? xrow(`data-action="openMachine" data-args="${attr(k.key)}"`, xicon(xi('box')), h(n), `S/N <span class="mono">${h(sn)}</span>`)
    : `<div class="xr static">${xicon(xi('box'), 'sp')}<span class="xr-m"><b>${h(n)}</b><span>S/N <span class="mono">${h(sn)}</span></span></span></div>`)).join('');
  const files = sparkLocal().files.filter((x) => String(x.sn) === String(m.ser));
  const guide = productName(m.p) !== m.p || catalog(S.prods, { all: true }).some((c) => c.items.some((i) => i.id === m.p));
  const html = `<div class="stack x-stack">
    <div class="ucard x-mhero">
      <div class="x-row-sb"><div><div class="lbl">${h(m.pn)}</div><div class="x-sn">${h(m.ser)}</div></div>${open ? '<span class="x-chip re">Cose aperte</span>' : '<span class="x-chip ok">Tutto ok</span>'}</div>
      ${m.client || m.country ? `<div><div class="x-cl">${h(m.client || '—')}</div><div class="x-small">${h(m.country || '')}</div></div>` : ''}
      <div class="x-stats"><div><small>FW</small><b>${h(m.fw || '—')}</b></div><div><small>Ultima man.</small><b>${lm ? h(fdate(lm)) : '—'}</b></div><div><small>Interventi</small><b>${ivN}</b></div></div>
      ${parent ? `<button type="button" class="x-pill" data-action="openMachine" data-args="${attr(parent.key)}">Montato sotto ${h(parent.pn)} ${h(parent.ser)}</button>` : ''}
    </div>
    <div class="x-btnrow">
      <button type="button" class="x-btn blue" data-action="machineAddIv" data-args="${attr(m.key)}">${xi('wrench')}Intervento</button>
      ${m.p === 'spark' ? `<a class="x-btn" href="${attr(sparkUrl('manutenzione-form.html?sn=' + encodeURIComponent(m.ser)))}" target="_blank" rel="noopener">${xi('file')}Modulo manut.</a>` : guide ? `<button type="button" class="x-btn" data-action="openProduct" data-args="${attr(m.p)}">${xi('book')}Guide</button>` : ''}
    </div>
    ${xsec('Storia')}
    <div class="ucard x-pad">${hist || '<div class="x-empty" style="padding:6px">Ancora niente.</div>'}</div>
    ${confRows ? xsec('Configurazione', '<span class="x-small">da scheda collaudo</span>') + `<div class="ucard x-list">${confRows}</div>` : ''}
    ${files.length ? xsec(`Cartella S/N · ${files.length}`) + `<div class="ucard x-list">${files.map((x) => xrow(`data-action="openMachineFile" data-args="${attr(x.id)}"`, xicon(xi(/manutenzione/i.test(x.kind + x.filename) ? 'wrench' : 'file'), 'warn'), h(x.filename), h([x.kind, fdate(String(x.addedAt || '').slice(0, 10))].filter(Boolean).join(' · ')))).join('')}</div>` : ''}
    ${m.p === 'spark' && m.spark ? `<div class="ucard x-list">${xrow('data-action="openSpark"', xicon(xi('zap'), 'sp'), 'Hub Spark', 'Errori, componenti, parametri, procedure')}${guide ? xrow(`data-action="openProduct" data-args="spark"`, xicon(xi('book')), 'Guide Spark', 'Zero macchina, altezza di carico') : ''}</div>` : ''}
  </div>`;
  return { title: `${m.pn} ${m.ser}`, sub: m.client || '', html };
});

registerView('mparams', (key) => {
  const m = machines().get(key);
  const p = m?.spark?.parametri || {};
  const rows = Object.entries(p);
  return { title: 'Parametri di collaudo', sub: m ? `${m.pn} ${m.ser}` : '', html: `<div class="stack x-stack"><div class="ucard x-tablewrap"><table class="x-table kv">${rows.map(([k, v]) => `<tr><td>${h(k)}</td><td class="mono">${h(v)}</td></tr>`).join('') || '<tr><td>Nessun parametro</td></tr>'}</table></div></div>` };
});

export function openMachineParams(key) { openView('mparams', key); }

/** Apre un file della cartella S/N dello Spark Hub. */
export async function openMachineFile(id) {
  const rec = await getSparkFile(id);
  if (!rec || !rec.blob) { toast('File non trovato su questo dispositivo', true); return; }
  const url = URL.createObjectURL(rec.blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/** Intervento su questa macchina: si sceglie la trasferta (in corso, prossime o recenti). */
export function machineAddIv(key) {
  const m = machines().get(key);
  if (!m) return;
  const today = fd(new Date());
  const trips = S.trs.filter((t) => !t.arc || t.d2 >= today).slice().sort((a, b) => Math.abs(new Date(a.d1) - new Date(today)) - Math.abs(new Date(b.d1) - new Date(today))).slice(0, 8);
  document.getElementById('mdTitle').textContent = `Intervento su ${m.pn} ${m.ser}`;
  document.getElementById('mdContent').innerHTML = trips.length
    ? `<div class="x-small" style="margin-bottom:8px">In quale trasferta?</div><div class="ucard x-list">${trips.map((t) => xrow(`data-action="machineIvTrip" data-args="${attr(t.id)}|${attr(key)}"`, xicon(xi('plane')), h(cap(t.ci)) + ', ' + h(cap(t.pa)), `${fds(t.d1)} – ${fds(t.d2)} ${t.d1.slice(0, 4)}`, t.d1 <= today && t.d2 >= today ? '<span class="x-chip ok sm">In corso</span>' : '')).join('')}</div>`
    : '<div class="x-empty">Nessuna trasferta: crea prima la trasferta, poi aggiungi l\'intervento.</div>';
  openM('mdm');
}

export function machineIvTrip(tid, key) {
  const m = machines().get(key);
  closeM('mdm');
  if (!m) return;
  const cat = catalog(S.prods, { all: true }).find((c) => c.items.some((i) => i.id === m.p));
  openAddIvFor(tid, { p: m.p, pn: cat?.items.find((i) => i.id === m.p)?.name || m.pn, cat: cat?.k || '', ser: m.ser, yr: m.yr || '' });
}

