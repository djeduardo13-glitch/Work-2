// Interventi: catalogo prodotti e macchine già viste dal cliente.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCTS } from '../src/config/products.js';
import { catalog, clientHistory, productId } from '../src/features/interventions/core.js';

const iv = (id, p, cat, extra = {}) => ({ id, p: productId(p), pn: p, cat, ...extra });
const trip = (id, d1, d2, spese, ivs, extra = {}) => ({ id, d1, d2, ci: 'Lione', pa: 'francia', spese, iv: ivs, ...extra });

const lione = () => trip('t1', '2026-10-14', '2026-10-17', [], [
  iv('a', 'Spark', 'car'),
  iv('b', 'EDEN BS8', 'sup'),
  iv('c', 'R-3L', 'sup'),
]);

test('catalogo: tutti i prodotti del modulo, aggiunti e nascosti', () => {
  const n = Object.values(PRODUCTS).flat().length;
  assert.equal(n, 36);
  assert.equal(catalog().flatMap((c) => c.items).length, 36);
  const prods = { add: [{ id: 'x-new', n: 'X-NEW', c: 'car' }], hid: ['spyke'] };
  const car = catalog(prods).find((c) => c.k === 'car').items.map((p) => p.name);
  assert.ok(car.includes('X-NEW'));
  assert.ok(!car.includes('Spyke'));
  assert.ok(catalog(prods, { all: true }).find((c) => c.k === 'car').items.find((p) => p.name === 'Spyke').hidden);
  assert.equal(productId('EDEN BS8'), 'eden-bs8');
});

test('storico del cliente e trasferte precedenti', () => {
  const cl = { clients: [{ cid: 'c1', name: 'Acme' }] };
  const old = trip('o', '2026-01-01', '2026-01-02', [], [iv('x', 'Spark', 'car', { ser: '123', yr: '2024' }), iv('y', 'Spark', 'car', { ser: '123' })], cl);
  const t = trip('n', '2026-10-01', '2026-10-02', [], [], cl);
  assert.deepEqual(clientHistory([old, t], t), [{ p: 'spark', pn: 'Spark', cat: 'car', ser: '123', yr: '2024' }]);
  assert.deepEqual(clientHistory([old, t], trip('z', '2026-10-01', '2026-10-01', [], [], { clients: [{ cid: 'c2' }] })), []);
});

