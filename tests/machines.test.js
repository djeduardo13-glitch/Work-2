import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMachines, hasOpen, lastMaintenance, machineList, mkey, normSer, supportProduct } from '../src/features/fleet/machines.js';

const fleet = [
  { sn: '58424', cliente: 'Reims', paese: 'Francia', fw: '7.9', fs: '58425', supporto: { tipo: 'EDEN-BS8 070', sn: '55284' }, barellini: [], powerPack: '55344', bCharger: '56953', parametri: { a: '1', b: '2' } },
  { sn: '22 25999', cliente: 'Ourson Bleu', paese: 'Francia', supporto: { tipo: 'EDEN04-SPARK', sn: '22 24796' } },
];
const trs = [
  { id: 't1', d1: '2026-10-14', d2: '2026-10-16', ci: 'lille', pa: 'francia', clients: [{ name: 'Ourson Bleu' }], iv: [
    { id: 'a', p: 'spark', pn: 'Spark', ser: '2225999', tipo: 'Guasto', esito: 'Serve ritorno' },
    { id: 'b', p: 'eden-bs8', pn: 'EDEN BS8', ser: '55284', tipo: 'Manutenzione programmata', esito: 'Risolto' },
    { id: 'c', p: 'ge-3', pn: 'GE-3', ser: 'X1', tipo: 'Guasto', esito: 'Risolto' },
    { id: 'd', p: 'ge-3', pn: 'GE-3', tipo: 'Guasto' },
  ] },
];
const issues = [{ id: 'i1', status: 'aperta', sns: ['58424'], errors: ['L007'], title: 'x', createdAt: '2026-11-12T09:00:00Z' }];
const files = [{ id: 1, sn: '58424', filename: 'manutenzione_58424.pdf', kind: 'manutenzione', addedAt: '2025-12-03T10:00:00Z' }];

test('numero di serie: confronto senza spazi e maiuscole', () => {
  assert.equal(normSer(' 22 25999 '), '2225999');
  assert.equal(mkey('Spark', '22 25999'), mkey('spark', '2225999'));
});

test('supporti dalla scheda di collaudo', () => {
  assert.equal(supportProduct('EDEN-BS8 070').id, 'eden-bs8');
  assert.equal(supportProduct('OPTIMUS-XP 067').id, 'optimus-xp');
  assert.equal(supportProduct('SIDESLIDE-SPARK').id, 'sideslide');
  assert.equal(supportProduct('EDEN04-SPARK').id, 'eden04-xp');
});

test('parco: anagrafica Spark + supporti + interventi + segnalazioni + file', () => {
  const M = buildMachines({ trs, fleet, issues, files });
  const s = M.get('spark:58424');
  assert.equal(s.client, 'Reims');
  assert.deepEqual(s.children.sort(), ['b-charger:56953', 'eden-bs8:55284', 'power-pack:55344'].sort());
  assert.equal(M.get('power-pack:55344').sub, true, 'power pack solo dentro la scheda Spark');
  const eden = M.get('eden-bs8:55284');
  assert.equal(eden.parent, 'spark:58424');
  assert.equal(eden.client, 'Reims', 'il supporto prende il cliente dello Spark');
  assert.equal(eden.events.filter((e) => e.kind === 'iv').length, 1);
  assert.ok(M.get('spark:2225999').events.some((e) => e.kind === 'iv'), 'S/N con spazio riconosciuto');
  assert.ok(M.has('ge-3:X1'), 'macchina nuova da un intervento');
  assert.equal([...M.keys()].filter((k) => k.startsWith('ge-3')).length, 1, 'senza S/N niente macchina');
  assert.deepEqual(s.events.map((e) => e.kind), ['issue', 'file', 'collaudo'], 'più recente prima, collaudo in fondo');
});

test('cose aperte, ultima manutenzione, elenco e filtri', () => {
  const M = buildMachines({ trs, fleet, issues, files });
  assert.equal(hasOpen(M.get('spark:58424')), true);
  assert.equal(hasOpen(M.get('spark:2225999')), true);
  assert.equal(hasOpen(M.get('ge-3:X1')), false);
  assert.equal(lastMaintenance(M.get('spark:58424'), '2026-11-26'), '2025-12-03');
  assert.equal(lastMaintenance(M.get('spark:58424'), '2025-01-01'), '', 'le manutenzioni future non contano');
  const all = machineList(M);
  assert.ok(!all.some((m) => m.sub));
  assert.deepEqual(machineList(M, { filter: 'open' }).map((m) => m.key).sort(), ['spark:2225999', 'spark:58424']);
  assert.deepEqual(machineList(M, { q: 'reims' }).map((m) => m.key).sort(), ['eden-bs8:55284', 'spark:58424']);
  assert.deepEqual(machineList(M, { q: '22 25' }).map((m) => m.key), ['spark:2225999']);
});
