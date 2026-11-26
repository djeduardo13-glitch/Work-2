import { S } from '../core/state.js';
import { renderMonth } from '../features/hours/month.js';
import { swPTab } from '../features/profile/profile.js';
import { renderTr } from '../features/trips/list.js';
import { popView, topPoppage } from './views.js';

// Schede in basso: Home · Ore · Trasferte · Prodotti · Parco. Il Profilo si apre dall'avatar in alto.
const SCREENS = { home: 'hscr', ore: 'oscr', trasferte: 'tscr', prodotti: 'rscr', parco: 'kscr', profilo: 'pscr' };
const NAV = { home: 'n-h', ore: 'n-o', trasferte: 'n-t', prodotti: 'n-r', parco: 'n-k' };

function show(tab) {
  Object.values(SCREENS).forEach((id) => document.getElementById(id)?.classList.remove('on'));
  document.getElementById(SCREENS[tab])?.classList.add('on');
  Object.values(NAV).forEach((id) => document.getElementById(id)?.classList.remove('on'));
  if (NAV[tab]) document.getElementById(NAV[tab])?.classList.add('on');
}

export function goTab(tab) {
  if (!SCREENS[tab]) tab = 'home';
  show(tab);
  if (tab === 'home') { import('../features/home/where.js').then((m) => m.chkWhere()); import('../features/home/follow.js').then((m) => m.renderFollow()); }
  if (tab === 'ore') renderMonth();
  if (tab === 'trasferte') renderTr();
  if (tab === 'prodotti') import('../features/products/products.js').then((m) => m.renderProdotti());
  if (tab === 'parco') import('../features/fleet/fleet.js').then((m) => m.renderParco());
  if (tab === 'profilo') { S.workView = { folder: null, tag: null }; swPTab(0); document.querySelector('#pscr .sc')?.scrollTo(0, 0); }
  if (tab !== 'home') history.pushState({ type: 'tab', tab }, '');
}

window.addEventListener('popstate', () => {
  // prima le finestre (modali, ricerca)
  const openModal = document.querySelector('.overlay.on, .modal-wrap.on');
  if (openModal) { openModal.classList.remove('on'); return; }
  // poi la pagina più in alto (l'ultima aperta)
  const openPop = topPoppage();
  if (openPop) {
    if (openPop.id === 'vPg') { popView(); return; }
    openPop.classList.remove('on');
    // chiudendo col tasto indietro: stesso aggiornamento del pulsante "indietro" della pagina
    if (openPop.id === 'tdPg') import('../features/trips/detail.js').then((m) => m.closeTD());
    if (openPop.id === 'nsPg') import('../features/expenses/note-page.js').then((m) => m.closeNotePage());
    return;
  }
  // altrimenti torna alla Home
  show('home');
  import('../features/home/where.js').then((m) => m.chkWhere());
});

/** Tocco sull'icona nuvola: apre le impostazioni di sincronizzazione. */
export function openSyncSettings() {
  goTab('profilo');
  swPTab(2);
}
