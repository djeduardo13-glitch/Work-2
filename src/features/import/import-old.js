import { toast } from '../../components/toast.js';
import { GH_TOKEN_RE, sanitizeData } from '../../core/schema.js';
import { S } from '../../core/state.js';
import { applyData, OLD_STORAGE_KEY, save } from '../../core/storage.js';
import { OLD_DB, savePhoto } from '../../lib/photos.js';
import { openExisting } from '../../services/spark-db.js';

// Import una tantum dalla vecchia Work Manager (stesso sito → stesso spazio del browser).
// Copia ore, eventi, trasferte (con spese e interventi), clienti, lavoro, cassaforte cifrata e foto/carte d'imbarco.
// NON copia il Gist ID: questa app sincronizza su un Gist suo, così la vecchia app resta intatta.

function oldRaw() {
  try { return JSON.parse(localStorage.getItem(OLD_STORAGE_KEY) || 'null'); } catch { return null; }
}

/** C'è qualcosa da importare e non l'hai ancora fatto? */
export function canImportOld() {
  if (S.imported) return false;
  const raw = oldRaw();
  return !!(raw && ((raw.trs || []).length || Object.keys(raw.dd || {}).length || (raw.evs || []).length));
}

async function copyPhotos() {
  const db = await openExisting(OLD_DB);
  if (!db) return 0;
  try {
    if (!db.objectStoreNames.contains('photos')) return 0;
    const rows = await new Promise((resolve) => {
      const out = [];
      const req = db.transaction('photos', 'readonly').objectStore('photos').openCursor();
      req.onsuccess = () => {
        const c = req.result;
        if (c) { out.push([c.key, c.value]); c.continue(); } else resolve(out);
      };
      req.onerror = () => resolve(out);
    });
    for (const [k, v] of rows) await savePhoto(k, v);
    return rows.length;
  } finally {
    db.close();
  }
}

export async function importOld() {
  const raw = oldRaw();
  if (!raw) { toast('Nessun dato di Work Manager su questo dispositivo', true); return; }
  const d = sanitizeData(raw);
  const n = { trs: (d.trs || []).length, dd: Object.keys(d.dd || {}).length, evs: (d.evs || []).length };
  const hasLocal = S.trs.length || Object.keys(S.dd).length;
  const msg = `Importare da Work Manager ${n.trs} trasferte, ${n.dd} giorni e ${n.evs} eventi?`
    + (hasLocal ? '\n\nI dati già presenti in Work Manager 2 verranno sostituiti.' : '')
    + '\n\nLa vecchia app non viene toccata.';
  if (!confirm(msg)) return;
  S.vault = null;
  S.legacyCreds = [];
  applyData(d);
  if (!S.gistToken && typeof raw.gistToken === 'string' && GH_TOKEN_RE.test(raw.gistToken)) S.gistToken = raw.gistToken;
  S.gistId = ''; // Gist nuovo e separato: si crea al primo "Sincronizza"
  S.imported = new Date().toISOString();
  let photos = 0;
  try { photos = await copyPhotos(); } catch { /* le foto restano nella vecchia app */ }
  save({ sync: false });
  toast(`Importato${photos ? ` (anche ${photos} foto)` : ''}: ricarico l'app`);
  setTimeout(() => location.reload(), 900);
}
