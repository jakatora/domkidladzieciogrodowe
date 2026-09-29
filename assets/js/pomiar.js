/* Rob Drew – adapter pomiaru zamiaru kontaktu (bez ciasteczek, bez danych osobowych).
   Zdarzenia: kontakt_telefon_klik, kontakt_whatsapp_klik, kreator_start, kreator_wynik, wymiary_sprawdzenie.
   Parametry: strona (ścieżka bez zapytania), miejsce (część strony), model, wynik. Nigdy: imię, telefon,
   treść formularza ani identyfikator użytkownika. Kliknięcie = zamiar kontaktu, nie wysłana wiadomość.

   ODBIORNIK: domyślnie BRAK – skrypt niczego nie wysyła. Zdarzenia pójdą dopiero, gdy:
   - na stronie działa Cloudflare Zaraz (window.zaraz.track), albo
   - w <head> jest <meta name="rd-pomiar-endpoint" content="https://…"> (POST JSON przez sendBeacon).
   Poza domeną produkcyjną nic nie jest wysyłane; z ?pomiar-test zdarzenia trafiają tylko do window.__rdPomiarTest. */
(function () {
  'use strict';
  var PROD = /(^|\.)domkidladzieciogrodowe\.pl$/.test(location.hostname);
  var TEST = /[?&]pomiar-test(=|&|$)/.test(location.search);
  if (!PROD && !TEST) return;
  var meta = document.querySelector('meta[name="rd-pomiar-endpoint"]');
  var ENDPOINT = meta && /^https:\/\//.test(meta.content) ? meta.content : '';
  var MODELE = ['standard', 'komfort', 'xxl', 'xl', 'premium'];
  if (TEST) window.__rdPomiarTest = window.__rdPomiarTest || [];

  function send(name, props) {
    var data = { strona: location.pathname };
    for (var k in props) if (props[k]) data[k] = String(props[k]).slice(0, 40);
    if (TEST) { window.__rdPomiarTest.push({ event: name, props: data }); return; }
    if (window.zaraz && typeof window.zaraz.track === 'function') { window.zaraz.track(name, data); return; }
    if (ENDPOINT && navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([JSON.stringify({ event: name, props: data })], { type: 'application/json' }));
    }
  }

  function modelZ(t) {
    t = String(t || '').toLowerCase();
    for (var i = 0; i < MODELE.length; i++) if (new RegExp('(^|[^a-z])' + MODELE[i] + '([^a-z]|$)').test(t)) return MODELE[i];
    return '';
  }
  function modelStrony() { var m = location.pathname.match(/model-(standard|komfort|xxl|xl|premium)/); return m ? m[1] : ''; }
  function miejsce(a) {
    var d = a.closest('[data-pomiar-miejsce]');
    if (d) return d.getAttribute('data-pomiar-miejsce');
    var map = [['.mobile-cta-bar', 'pasek_mobilny'], ['.topbar', 'naglowek'], ['.v2-footer', 'stopka'], ['.v2-hero', 'hero'],
      ['#dobor', 'kreator_wynik'], ['.v2-product', 'karta_modelu'], ['.v2-contact', 'kontakt'], ['.v2-final', 'sekcja_koncowa']];
    for (var i = 0; i < map.length; i++) if (a.closest(map[i][0])) return map[i][1];
    var s = a.closest('section[id]');
    return s ? s.id : 'tresc';
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var h = a.getAttribute('href') || '';
    var name = /^tel:/.test(h) ? 'kontakt_telefon_klik' : /(^https?:\/\/)(wa\.me|api\.whatsapp\.com)\//.test(h) ? 'kontakt_whatsapp_klik' : '';
    if (!name) return;
    var d = a.closest('[data-pomiar-model]'), model = (d && d.getAttribute('data-pomiar-model')) || modelStrony();
    if (!model && a.closest('#dobor')) { var top = document.querySelector('#dobor .v2-result .v2-card h3 a'); model = top ? modelZ(top.getAttribute('href')) : ''; }
    send(name, { miejsce: miejsce(a), model: model });
  }, true);

  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (!f.matches || !f.matches('form[data-wa-form]')) return;
    var sel = f.elements.model;
    send('kontakt_whatsapp_klik', { miejsce: 'formularz', model: modelZ(sel && sel.value) || modelStrony() });
  }, true);

  document.addEventListener('rd:pomiar', function (e) {
    var d = e.detail || {};
    if (d.event === 'wymiary_sprawdzenie') send('wymiary_sprawdzenie', { wynik: d.wynik, model: d.model });
  });

  // Istniejący kreator (#dobor): start = pierwsza odpowiedź, wynik = pokazanie rekomendacji (raz na wyświetlenie wyniku).
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
