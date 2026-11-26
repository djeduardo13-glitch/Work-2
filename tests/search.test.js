import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildIndex, search } from '../src/features/search/search-index.js';

const idx = buildIndex({
  errors: [{ code: 'E011', text: 'Comunicazione CAN bus persa con ECU Motore Sinistro.', catLabel: 'Errore di sistema' }, { code: 'E010', text: 'Comunicazione CAN bus persa con ECU Motore Destro.' }],
  machines: [{ key: 'spark:58424', ser: '58424', client: 'Reims', pn: 'SPARK-UC', country: 'Francia' }, { key: 'power-pack:1', ser: '1', client: 'Reims', pn: 'POWER-PACK', sub: true }],
  products: [{ id: 'eden-bs8', nome: 'Eden - BS8', categoria: 'Eden', sezioni: [{ titolo: 'Altezza di molleggio' }] }],
  comps: [{ id: 'L_2', categoria: 'laser' }], sensors: { L_2: { tipo: 'Laser sensore striscia' } },
  trips: [{ id: 't1', ci: 'reims', pa: 'francia', d1: '2026-12-02', clients: [{ name: 'Reims' }], iv: [{ pn: 'Spark', ser: '58424', err: 'L007' }] }],
  clients: [{ id: 'c1', name: 'Ourson Bleu' }],
  issues: [{ id: 'i1', title: 'CAN perso', errors: ['E011'], sns: ['56808'] }],
});

test('codice esatto prima degli altri', () => {
  const r = search(idx, 'e011');
  assert.equal(r[0].kind, 'error');
  assert.equal(r[0].items[0].key, 'E011');
  assert.ok(r.some((g) => g.kind === 'issue'), 'anche la segnalazione con quel codice');
});

test('tutte le parole devono esserci', () => {
  const r = search(idx, 'motore destro');
  assert.deepEqual(r.flatMap((g) => g.items.map((i) => i.key)), ['E010']);
});

test('S/N, guide, componenti, trasferte e clienti', () => {
  const kinds = (q) => search(idx, q).map((g) => g.kind);
  assert.ok(kinds('58424').includes('machine'));
  assert.ok(kinds('58424').includes('trip'), 'trasferta con intervento su quel S/N');
  assert.ok(kinds('molleggio').includes('guide'));
  assert.ok(kinds('laser').includes('comp'));
  assert.ok(kinds('ourson').includes('client'));
  assert.ok(!search(idx, 'power-pack').some((g) => g.kind === 'machine'), 'power pack senza interventi non elencati');
  assert.deepEqual(search(idx, '  '), []);
});
