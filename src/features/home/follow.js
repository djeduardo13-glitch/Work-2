import { xicon, xrow } from '../../components/views.js';
import { S } from '../../core/state.js';
import { fds } from '../../lib/dates.js';
import { attr, h } from '../../lib/html.js';
import { xi } from '../../lib/xicons.js';
import { sparkLocal } from '../../services/spark-db.js';
import { mkey, normSer, OPEN_ESITI } from '../fleet/machines.js';
import { canImportOld } from '../import/import-old.js';

// Card "Da seguire" in Home: quello che è rimasto aperto, da tutte le parti dell'app.

export function followItems(trs, issues) {
  const items = [];
  const open = issues.filter((i) => i.status !== 'chiusa');
  if (open.length) items.push({ kind: 'issues', n: open.length, sub: open.slice(0, 3).map((i) => [(i.errors || [])[0], (i.sns || [])[0] && 'S/N ' + i.sns[0]].filter(Boolean).join(' · ') || i.title).join(' · ') });
  for (const t of trs) {
    for (const iv of t.iv || []) {
      if (OPEN_ESITI.includes(iv.esito)) items.push({ kind: 'iv', t, iv });
    }
  }
  return items;
}

export function renderFollow() {
  const box = document.getElementById('followBox');
  if (!box) return;
  const items = followItems(S.trs, sparkLocal().issues);
  const rows = [];
  if (canImportOld()) rows.push(xrow('data-action="importOld"', xicon(xi('layers'), 'ok'), 'Porta qui i dati di Work Manager', 'Ore, trasferte, clienti, cassaforte e foto: una volta sola'));
  for (const it of items) {
    if (it.kind === 'issues') rows.push(xrow('data-action="openIssues"', xicon(xi('alert'), 're'), 'Segnalazioni Spark aperte', h(it.sub), `<span class="x-badge">${it.n}</span>`));
    if (it.kind === 'iv') {
      const { t, iv } = it;
      const act = normSer(iv.ser) ? `data-action="openMachine" data-args="${attr(mkey(iv.p || iv.pn, iv.ser))}"` : `data-action="openTrDet" data-args="${attr(t.id)}"`;
      rows.push(xrow(act, xicon(xi('wrench'), 'warn'), `${h(iv.pn || iv.p)}${iv.ser ? ' <span class="mono">' + h(iv.ser) + '</span>' : ''} · ${h(iv.esito)}`, h([t.ci && cap(t.ci), fds(t.d1), iv.note].filter(Boolean).join(' · '))));
    }
  }
  box.innerHTML = rows.length ? `<section class="ucard x-list x-follow" aria-label="Da seguire"><div class="x-follow-h"><span class="lbl">Da seguire</span></div>${rows.slice(0, 6).join('')}</section>` : '';
}

const cap = (s) => String(s || '').replace(/(^|\s)\S/g, (c) => c.toUpperCase());
