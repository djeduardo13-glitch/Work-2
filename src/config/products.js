// Catalogo prodotti STEM (modulo "Prodotti" R02 2025/09/08) e voci degli interventi.
// I prodotti aggiunti a mano stanno nei dati (S.prods), non qui.

export const CATALOG_REV = 'R02 2025/09/08';

/** Categorie nell'ordine del modulo. `short` per i pulsanti, `col` per i grafici. */
export const PRODUCT_CATS = [
  { k: 'ge', name: 'Gradino elettrico', short: 'Gr. elettrico', col: '#1e3a5f' },
  { k: 'gm', name: 'Gradino meccanico', short: 'Gr. meccanico', col: '#6f8fb5' },
  { k: 'med', name: 'Medical', short: 'Medical', col: '#1d6b47' },
  { k: 'car', name: 'Caricamento assistito', short: 'Caricamento', col: '#c98a1e' },
  { k: 'sup', name: 'Supporti', short: 'Supporti', col: '#5b3a12' },
  { k: 'mar', name: 'Marine', short: 'Marine', col: '#8fb8d0' },
];

export const PRODUCTS = {
  ge: ['GE-3', 'GE-3-K', 'GE-2015', 'GE-2017', 'GE-480'],
  gm: ['GP-3', 'GX-3', 'GX-2015', 'GR-1400'],
  med: ['Billy-CAB', 'Sally-CAB', 'O3Z-Tech', 'E-Bike'],
  car: ['SHERPA', 'SHERPA Slim', 'POWER-PACK', 'B-CHARGER', 'R-CONTROL', 'Spark', 'Spyke'],
  sup: ['EDEN', 'EDEN BS8', 'R-3L', 'R-3L XP', 'MEC-EL', 'Compact-EL', 'OPTIMUS-PESP', 'OPTIMUS-XP', 'OPTIMUS', 'Sideslide', 'Easyslide', 'TR', 'MEC', 'MODU'],
  mar: ['STEM Wave', 'MAST 25'],
};

/** Tipo di intervento ed esito (un esito diverso da "Risolto" finisce in "Da seguire"). */
export const TIPI = ['Installazione / collaudo', 'Guasto', 'Manutenzione programmata', 'Formazione cliente', 'Aggiornamento / retrofit'];

export const ESITI = ['Risolto', 'Provvisorio', 'Serve ritorno', 'Ricambi da spedire'];
