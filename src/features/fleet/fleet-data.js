import { S } from '../../core/state.js';
import { spark } from '../../services/content.js';
import { sparkLocal } from '../../services/spark-db.js';
import { buildMachines } from './machines.js';

// Parco calcolato al volo dai dati attuali (poche decine di macchine: costa niente).
export function machines() {
  const L = sparkLocal();
  return buildMachines({ trs: S.trs, fleet: spark().fleet, issues: L.issues, files: L.files });
}

export const issueById = (id) => sparkLocal().issues.find((i) => i.id === id) || null;
export const openIssues = () => sparkLocal().issues.filter((i) => i.status !== 'chiusa');
