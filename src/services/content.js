import { APP_CONFIG } from '../config/app.config.js';

// Contenuti presi dalle altre app pubblicate sullo stesso sito (stessa origine):
// - guide prodotto di Supporto Tecnico (prodotti/elenco.js + prodotti/<cartella>/dati.js e traduzioni)
// - dati dello Spark Doc Hub (js/data.js, js/fleet.js) letti tramite public/bridge/spark-bridge.js
// Sono file JavaScript "classici": si caricano con <script src>, consentito dalla CSP (script-src 'self').
// Il service worker li tiene in cache, quindi dopo la prima apertura funzionano anche offline.

const LANGS = ['en', 'fr', 'es'];
const TIMEOUT_MS = 15000;

const state = {
  products: null, // { list: [...], tr: { id: { en: {...} } }, ok }
  spark: null, // { ...window.__SPARK__, ok }
  loading: null,
};

function loadScript(src) {
  return new Promise((resolve) => {
    const s = document.createElement('script');
    let done = false;
    const end = (ok) => { if (!done) { done = true; clearTimeout(timer); resolve(ok); } };
    const timer = setTimeout(() => end(false), TIMEOUT_MS);
    s.src = src;
    s.async = false;
    s.onload = () => end(true);
    s.onerror = () => end(false); // file mancante (es. lingua non tradotta): va bene
    document.head.appendChild(s);
  });
}

/** Percorso assoluto di una risorsa di Supporto Tecnico. */
export const stUrl = (path) => APP_CONFIG.sources.supporto + path;
/** Percorso assoluto di una risorsa dello Spark Doc Hub. */
export const sparkUrl = (path) => APP_CONFIG.sources.spark + path;

async function loadProducts() {
  const list = [];
  const tr = {};
  let folder = null;
  // le stesse funzioni che i file dati.js e <lingua>.js chiamano in Supporto Tecnico
  window.registraProdotto = (p) => { if (p && p.id) list.push({ ...p, _dir: folder || p.id }); };
  window.registraTraduzione = (id, lng, data) => { (tr[id] = tr[id] || {})[lng] = data; };
  const ok = await loadScript(stUrl('prodotti/elenco.js'));
  const folders = Array.isArray(window.ELENCO_PRODOTTI) ? window.ELENCO_PRODOTTI.slice() : [];
  for (const f of folders) {
    folder = f;
    await loadScript(stUrl(`prodotti/${f}/dati.js`));
    await Promise.all(LANGS.map((l) => loadScript(stUrl(`prodotti/${f}/${l}.js`))));
  }
  folder = null;
  return { list, tr, ok: ok && list.length > 0 };
}

async function loadSpark() {
  const a = await loadScript(sparkUrl('js/data.js'));
  const b = await loadScript(sparkUrl('js/fleet.js'));
  await loadScript(`${import.meta.env.BASE_URL}bridge/spark-bridge.js`);
  const S = window.__SPARK__ || {};
  return {
    fw: S.FW_VERSIONS || [],
    errors: S.ERRORS || [],
    errComp: S.ERROR_COMPONENTS || {},
    comps: S.COMPONENTS || [],
    sensors: S.SENSOR_DETAILS || {},
    procs: S.PROCEDURES || [],
    params: S.PARAMETERS || [],
    docs: S.DOCUMENTS || {},
    fleet: S.SPARK_FLEET || [],
    ok: a && b && Array.isArray(S.ERRORS),
  };
}

/** Carica tutto una volta sola; chi arriva dopo riceve la stessa promessa. Avvisa con l'evento "wm:content". */
export function loadContent() {
  if (!state.loading) {
    state.loading = Promise.all([
      loadProducts().catch(() => ({ list: [], tr: {}, ok: false })),
      loadSpark().catch(() => ({ ok: false, errors: [], fleet: [], comps: [], procs: [], params: [], sensors: {}, errComp: {}, fw: [], docs: {} })),
    ]).then(([products, spark]) => {
      state.products = products;
      state.spark = spark;
      document.dispatchEvent(new Event('wm:content'));
      return state;
    });
  }
  return state.loading;
}

export const products = () => state.products || { list: [], tr: {}, ok: false };
export const spark = () => state.spark || { ok: false, errors: [], fleet: [], comps: [], procs: [], params: [], sensors: {}, errComp: {}, fw: [], docs: {} };
export const contentReady = () => !!(state.products && state.spark);
