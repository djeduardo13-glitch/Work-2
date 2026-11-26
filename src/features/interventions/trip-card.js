import { attr, h } from '../../lib/html.js';
import { catInfo } from './core.js';
import { mkey } from '../fleet/machines.js';

// Card "Interventi" nella pagina trasferta: su quali macchine hai lavorato e com'è finita.
// Ogni intervento con numero di serie entra nella storia della macchina (Parco).

const pill = (cls, txt) => `<span class="iv-pill ${cls}">${h(txt)}</span>`;
const ESITO_CLS = { Risolto: 'ok', Provvisorio: 'warn', 'Serve ritorno': 'warn', 'Ricambi da spedire': 'warn' };

export function ivCardHtml(t) {
  const ivs = t.iv || [];
  const tid = attr(t.id);
  const add = `<button type="button" class="iv-add" data-action="ivAdd" data-args="${tid}">+ Intervento</button>`;
  if (!ivs.length) {
    return `<section class="ucard iv-card" aria-label="Interventi"><div class="iv-h"><span class="tsec-t">Interventi</span>${add}</div>`
      + '<div class="iv-empty">Su quali macchine hai lavorato? Con il numero di serie finiscono nella loro storia, nel Parco.</div></section>';
  }
  const rows = ivs.map((iv) => {
    const c = catInfo(iv.cat);
    const sub = [c?.name && h(c.name), iv.ser && `<span class="nw">S/N ${h(iv.ser)}</span>`, iv.yr && h(iv.yr), iv.err && `<span class="nw">errore ${h(iv.err)}</span>`].filter(Boolean).join(' · ');
    const pills = [iv.tipo && pill('blue', iv.tipo), iv.esito && pill(ESITO_CLS[iv.esito] || 'mute', iv.esito)].filter(Boolean).join('');
    return `<button type="button" class="iv-row" data-action="ivEdit" data-args="${tid}|${attr(iv.id)}">`
      + `<span class="iv-top"><span class="iv-main"><span class="iv-name">${h(iv.pn || iv.p)}</span><span class="iv-sub">${sub}</span></span></span>`
      + `${pills ? `<span class="iv-pills">${pills}</span>` : ''}${iv.note ? `<span class="iv-sub">${h(iv.note)}</span>` : ''}</button>`;
  }).join('');
  const withSn = ivs.filter((iv, i) => String(iv.ser || '').trim() && ivs.findIndex((x) => mkey(x.p || x.pn, x.ser || '') === mkey(iv.p || iv.pn, iv.ser)) === i);
  const machines = withSn.length ? `<div class="iv-sns"><span>Nel Parco:</span>${withSn.map((iv) => `<button type="button" class="x-pill" data-action="openMachine" data-args="${attr(mkey(iv.p || iv.pn, iv.ser))}">${h(iv.pn || iv.p)} ${h(iv.ser)}</button>`).join('')}</div>` : '';
  return `<section class="ucard iv-card" aria-label="Interventi"><div class="iv-h"><span class="tsec-t">Interventi</span>${add}</div>${rows}${machines}</section>`;
}
