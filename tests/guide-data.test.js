import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keypadTags, localize, merge, sectionInfo, sortedConditions, stepPhases } from '../src/features/products/guide-data.js';

const p = { id: 'x', nome: 'Prodotto', pulsantiera: { larghezza: 444, altezza: 213, raggio: 31, pulsanti: { A: [78, 75], B: [148, 75], C: [148, 138] } },
  sezioni: [{ titolo: 'Uno', tipo: 'istruzione', passi: [{ testo: 'Premi', pulsanti: ['A', 'B'] }] }, { titolo: 'Due', tipo: 'avvisi', avvisi: [] }] };

test('traduzione: testi sostituiti, pulsantiera e tasti restano italiani', () => {
  const tr = { x: { en: { nome: 'Product', nomiTasti: { A: 'Up' }, sezioni: [{ titolo: 'One', passi: [{ testo: 'Press', pulsanti: ['Z'] }] }] } } };
  const en = localize(p, tr, 'en');
  assert.equal(en.nome, 'Product');
  assert.equal(en.sezioni[0].titolo, 'One');
  assert.deepEqual(en.sezioni[0].passi[0].pulsanti, ['A', 'B']);
  assert.equal(en.sezioni[1]._missing, true, 'sezione non tradotta segnalata');
  assert.equal(localize(p, tr, 'fr')._missing, true);
  assert.equal(localize(p, tr, 'it'), p);
  assert.equal(merge('a', 3), 'a', 'tipo diverso: resta l\'originale');
});

test('riassunti, condizioni e fasi', () => {
  assert.equal(sectionInfo(p.sezioni[0]), '1 passo');
  assert.deepEqual(sortedConditions({ condizioni: [{ tipo: 'info', testo: 'i' }, { tipo: 'senza', testo: 's' }] }).map((c) => c.tipo), ['senza', 'info']);
  assert.deepEqual(stepPhases([{ fase: 'A' }, {}, { fase: 'B', notaFase: 'n' }]).map((x) => [x.fase, x.start]), [['A', true], ['A', false], ['B', true]]);
});

test('targhette della pulsantiera: sopra per la prima fila, sotto per le altre, dentro la foto', () => {
  const t = keypadTags(p.pulsantiera, ['A', 'B', 'C']);
  assert.equal(t.length, 3);
  assert.ok(t.filter((x) => x.above).length === 2);
  for (const x of t) assert.ok(x.cx - x.bw / 2 >= 0 && x.cx + x.bw / 2 <= 444);
  const [a, b] = t.filter((x) => x.above).sort((m, n) => m.cx - n.cx);
  assert.ok(a.cx + a.bw / 2 <= b.cx - b.bw / 2 + 0.6, 'targhette vicine non si sovrappongono');
});
