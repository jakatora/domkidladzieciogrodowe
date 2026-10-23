/* Rob Drew: dzienne liczniki zamiaru kontaktu bez cookies i identyfikatorów.
   Kliknięcie oznacza zamiar kontaktu, nie wysłaną wiadomość ani pozyskanego klienta.
   ?pomiar-test zapisuje wyłącznie w window.__rdPomiarTest. Preview nie wysyła.
   Brak storage, Zaraz, zewnętrznych skryptów, treści formularza i parametrów URL. */
(function () {
  'use strict';
  var privacy = navigator.globalPrivacyControl === true || navigator.doNotTrack === '1' ||
    navigator.msDoNotTrack === '1' || window.doNotTrack === '1';
  if (privacy) return;
  var PROD = location.protocol === 'https:' &&
    ['domkidladzieciogrodowe.pl', 'www.domkidladzieciogrodowe.pl'].indexOf(location.hostname) > -1;
  var TEST = /[?&]pomiar-test(=|&|$)/.test(location.search);
  if (!TEST && !PROD) return;
  var MODELE = ['standard', 'komfort', 'xxl', 'xl', 'premium'];
  var MIEJSCA = ['pasek_mobilny', 'naglowek', 'stopka', 'hero', 'kreator', 'kreator_wynik',
    'karta_modelu', 'kontakt', 'sekcja_koncowa', 'formularz', 'wymiary_wynik', 'tresc'];
  var WYNIKI = ['nie_miesci', 'do_potwierdzenia', 'brak_danych', 'blad'];
  var ZDARZENIA = ['kontakt_telefon_klik', 'kontakt_whatsapp_klik', 'kreator_start', 'kreator_wynik', 'wymiary_sprawdzenie'];
  // Lista zgodna z sitemap.xml; test sprawdza zgodność z odbiornikiem.
  var STRONY = [
    '/', '/modele', '/jak-wybrac-domek-dla-dziecka', '/model-standard', '/model-komfort', '/model-xxl', '/model-xl', '/model-premium',
    '/realizacje', '/wykonanie', '/kontakt', '/dobierz-domek', '/cennik-domkow-dla-dzieci', '/porownanie-domkow-dla-dzieci',
    '/o-nas', '/polityka-prywatnosci', '/poradnik', '/poradnik/plac-zabaw-do-malego-ogrodu', '/poradnik/plac-zabaw-dla-dwojga-dzieci',
    '/poradnik/gdzie-postawic-plac-zabaw-w-ogrodzie', '/poradnik/jak-dbac-o-drewniany-plac-zabaw', '/poradnik/domek-na-podwyzszeniu-czy-przy-ziemi',
    '/poradnik/bezpieczny-plac-zabaw-w-ogrodzie', '/domek-dla-dzieci-ze-zjezdzalnia', '/plac-zabaw-z-hustawka', '/plac-zabaw-ze-scianka-wspinaczkowa',
    '/plac-zabaw-z-piaskownica', '/gdzie-dzialamy', '/domki-dla-dzieci-rzeszow', '/domki-dla-dzieci-przemysl', '/domki-dla-dzieci-jaroslaw',
    '/domki-dla-dzieci-tarnow', '/domki-dla-dzieci-krakow', '/domki-dla-dzieci-lublin', '/domki-dla-dzieci-kielce', '/domki-dla-dzieci-katowice',
    '/domki-dla-dzieci-warszawa', '/domki-dla-dzieci-lodz', '/domki-dla-dzieci-wroclaw', '/domki-dla-dzieci-poznan', '/domki-dla-dzieci-gdansk',
    '/domki-dla-dzieci-szczecin', '/domki-dla-dzieci-bialystok', '/domki-dla-dzieci-bydgoszcz', '/poradnik/zalety-drewnianego-placu-zabaw',
    '/poradnik/ile-kosztuje-plac-zabaw-do-ogrodu', '/poradnik/plac-zabaw-dla-3-latka-i-starszych-dzieci', '/poradnik/hustawka-czy-bocianie-gniazdo',
    '/poradnik/jak-pomalowac-domek-dla-dzieci', '/poradnik/jak-przygotowac-ogrod-przed-montazem-domku',
    '/poradnik/jak-zmierzyc-miejsce-na-plac-zabaw', '/poradnik/montaz-domku-dla-dzieci-krok-po-kroku'
  ];
  var strona = location.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '').replace(/\/+$/, '') || '/';
  if (STRONY.indexOf(strona) < 0) return;
  if (TEST) window.__rdPomiarTest = window.__rdPomiarTest || [];
  function nazwa(name, props) {
    var parts = [name, props.miejsce];
    if (name !== 'kreator_start') parts.push(props.model);
    if (props.wynik !== 'brak') parts.push(props.wynik);
    return parts.join('__');
  }
  function send(name, props) {
    try {
      if (ZDARZENIA.indexOf(name) < 0) return;
      props = props || {};
      var clean = {
        strona: strona,
        miejsce: MIEJSCA.indexOf(props.miejsce) > -1 ? props.miejsce : 'tresc',
        model: MODELE.indexOf(props.model) > -1 ? props.model : 'brak', wynik: 'brak'
      };
      if (name === 'kreator_start') { clean.miejsce = 'kreator'; clean.model = 'brak'; }
      if (name === 'kreator_wynik') clean.miejsce = 'kreator';
      if (name === 'wymiary_sprawdzenie') {
        clean.miejsce = 'wymiary_wynik';
        clean.wynik = WYNIKI.indexOf(props.wynik) > -1 ? props.wynik : 'blad';
      }
      if (TEST) { window.__rdPomiarTest.push({ event: name, trackName: nazwa(name, clean), props: clean }); return; }
      if (!PROD || typeof window.fetch !== 'function') return;
      var pending = window.fetch('/api/zdarzenia', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: name, strona: clean.strona, miejsce: clean.miejsce, model: clean.model, wynik: clean.wynik }),
        keepalive: true, credentials: 'omit', referrerPolicy: 'no-referrer',
        mode: 'same-origin', cache: 'no-store', redirect: 'error'
      });
      if (pending && typeof pending.catch === 'function') pending.catch(function () {});
    } catch (_) { /* Pomiar nigdy nie blokuje telefonu, WhatsApp ani formularza. */ }
  }
  function modelZ(value) {
    if (typeof value !== 'string') return '';
    value = value.toLowerCase();
    for (var i = 0; i < MODELE.length; i++) if (new RegExp('(^|[^a-z])' + MODELE[i] + '([^a-z]|$)').test(value)) return MODELE[i];
    return '';
  }
  function modelStrony() { var m = strona.match(/^\/model-(standard|komfort|xxl|xl|premium)$/); return m ? m[1] : ''; }
  function miejsce(a) {
    var marked = a.closest('[data-pomiar-miejsce]');
    if (marked) return marked.getAttribute('data-pomiar-miejsce');
    var map = [['.mobile-cta-bar', 'pasek_mobilny'], ['.topbar', 'naglowek'], ['.v2-footer', 'stopka'],
      ['.at-hero', 'hero'], ['.v2-hero', 'hero'], ['#dobor', 'kreator_wynik'], ['.at-product', 'karta_modelu'],
      ['.v2-product', 'karta_modelu'], ['.at-contact', 'kontakt'], ['.v2-contact', 'kontakt'], ['.v2-final', 'sekcja_koncowa']];
    for (var i = 0; i < map.length; i++) if (a.closest(map[i][0])) return map[i][1];
    return 'tresc';
  }
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var h = a.getAttribute('href') || '';
    var name = /^tel:/i.test(h) ? 'kontakt_telefon_klik' : /^https?:\/\/(wa\.me|api\.whatsapp\.com)\//i.test(h) ? 'kontakt_whatsapp_klik' : '';
    if (!name) return;
    var marked = a.closest('[data-pomiar-model]');
    var model = (marked && marked.getAttribute('data-pomiar-model')) || modelStrony();
    if (!model) {
      var card = a.closest('.at-product');
      var link = card && (card.matches('a[href]') ? card : card.querySelector('a[href^="/model-"]'));
      model = link ? modelZ(link.getAttribute('href')) : '';
    }
    if (!model && a.closest('#dobor')) { var top = document.querySelector('#dobor .v2-result .v2-card h3 a'); model = top ? modelZ(top.getAttribute('href')) : ''; }
    send(name, { miejsce: miejsce(a), model: model });
  }, true);
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (!f.matches || !f.matches('form[data-wa-form]')) return;
    var selection = f.elements.model;
    send('kontakt_whatsapp_klik', { miejsce: 'formularz', model: modelZ(selection && selection.value) || modelStrony() });
  }, true);
  document.addEventListener('rd:pomiar', function (e) {
    var detail = e.detail || {};
    if (ZDARZENIA.indexOf(detail.event) > -1) send(detail.event, detail);
  });
  var dobor = document.getElementById('dobor');
  if (dobor) {
    var started = false, shown = null;
    dobor.addEventListener('click', function (e) {
      if (!started && e.target.closest && e.target.closest('.v2-opt')) { started = true; send('kreator_start', { miejsce: 'kreator' }); }
    }, true);
    if ('MutationObserver' in window) new MutationObserver(function () {
      var res = dobor.querySelector('.v2-result');
      if (res && res !== shown) {
        shown = res;
        var a = res.querySelector('.v2-card h3 a');
        send('kreator_wynik', { miejsce: 'kreator', model: a ? modelZ(a.getAttribute('href')) : '' });
      } else if (!res && shown) { shown = null; started = false; }
    }).observe(dobor, { childList: true, subtree: true });
  }
})();
