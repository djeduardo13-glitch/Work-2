// Lettura (SOLO lettura) dei dati che lo Spark Doc Hub salva nel browser:
// - SparkSegnalazioniDB / issues : segnalazioni (problemi, soluzioni provate, S/N, codici errore)
// - SparkManutenzioneDB / files  : cartelle S/N con i PDF di manutenzione e gli allegati
// Stessa origine (…github.io), quindi stesso spazio di archiviazione: qui si leggono, si modificano nello Spark Hub.
//
// Attenzione: aprire un database che non esiste lo CREEREBBE vuoto, e lo Spark Hub poi non riuscirebbe
// più a creare le sue tabelle. Per questo, se il database non c'è, l'apertura viene annullata.

const ISSUE_DB = 'SparkSegnalazioniDB';
const ISSUE_STORE = 'issues';
const FILE_DB = 'SparkManutenzioneDB';
const FILE_STORE = 'files';

/** Apre un database solo se esiste già; altrimenti null (senza crearlo). */
export function openExisting(name) {
  return new Promise((resolve) => {
    if (!('indexedDB' in window)) { resolve(null); return; }
    let req;
    try { req = indexedDB.open(name); } catch { resolve(null); return; }
    let created = false;
    req.onupgradeneeded = () => {
      created = true; // non esisteva: annulla la creazione
      try { req.transaction.abort(); } catch { /* già annullata */ }
    };
    req.onsuccess = () => {
      const db = req.result;
      if (created) { db.close(); resolve(null); return; }
      resolve(db);
    };
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
  });
}

async function readAll(dbName, store) {
  const db = await openExisting(dbName);
  if (!db) return [];
  try {
    if (!db.objectStoreNames.contains(store)) return [];
    return await new Promise((resolve) => {
      const r = db.transaction(store, 'readonly').objectStore(store).getAll();
      r.onsuccess = () => resolve(r.result || []);
      r.onerror = () => resolve([]);
    });
  } finally {
    db.close();
  }
}

let cache = null;

/** Segnalazioni e file delle cartelle S/N (i file senza il contenuto, solo i dati). */
export async function loadSparkLocal(force = false) {
  if (cache && !force) return cache;
  const [issues, files] = await Promise.all([readAll(ISSUE_DB, ISSUE_STORE), readAll(FILE_DB, FILE_STORE)]);
  cache = {
    issues: issues.filter((i) => i && i.id),
    files: files.filter((f) => f && f.sn).map(({ blob, ...meta }) => ({ ...meta, size: blob?.size || 0 })),
  };
  return cache;
}

export const sparkLocal = () => cache || { issues: [], files: [] };

/** Contenuto di un file della cartella S/N (per aprirlo). */
export async function getSparkFile(id) {
  const db = await openExisting(FILE_DB);
  if (!db) return null;
  try {
    return await new Promise((resolve) => {
      const r = db.transaction(FILE_STORE, 'readonly').objectStore(FILE_STORE).get(Number(id));
      r.onsuccess = () => resolve(r.result || null);
      r.onerror = () => resolve(null);
    });
  } finally {
    db.close();
  }
}
