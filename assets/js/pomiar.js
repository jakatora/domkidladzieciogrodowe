/* Rob Drew – adapter pomiaru zamiaru kontaktu (bez ciasteczek, bez danych osobowych).
   Zdarzenia: kontakt_telefon_klik, kontakt_whatsapp_klik, kreator_start, kreator_wynik, wymiary_sprawdzenie.
   Parametry: strona (ścieżka bez zapytania), miejsce (część strony), model, wynik. Nigdy: imię, telefon,
   treść formularza ani identyfikator użytkownika. Kliknięcie = zamiar kontaktu, nie wysłana wiadomość.

   ODBIORNIK: Cloudflare Zaraz (zaraz.track → Zaraz Monitoring, API zarazTrackAdaptiveGroups grupuje po trackName
   i urlPath, nie po właściwościach) – dlatego model/miejsce/wynik są zakodowane w nazwie zdarzenia z zamkniętej listy,
   np. „kontakt_whatsapp_klik__karta_modelu__xl”. Skrypt Zaraz (/cdn-cgi/zaraz/i.js) ładujemy ręcznie tylko stąd.
   WYŁĄCZONE (WLACZONY = false): na koncie Zaraz działa wyłącznie z włączonym Monitoringiem, który ustawia ciasteczka
   identyfikujące (cf_zaraz_client, cfz_zaraz-analytics) – to łamie założenie „bez ciasteczek”. Szczegóły w raporcie.
   Poza domeną produkcyjną nic nie jest wysyłane; z ?pomiar-test zdarzenia trafiają tylko do window.__rdPomiarTest. */
(function () {
  'use strict';
  var WLACZONY = false;
  var PROD = /(^|\.)domkidladzieciogrodowe\.pl$/.test(location.hostname);
  var TEST = /[?&]pomiar-test(=|&|$)/.test(location.search);
  if (!TEST && !(PROD && WLACZONY)) return;
  var MODELE = ['standard', 'komfort', 'xxl', 'xl', 'premium'];
  var MIEJSCA = ['pasek_mobilny', 'naglowek', 'stopka', 'hero', 'kreator', 'kreator_wynik', 'karta_modelu', 'kontakt',
    'sekcja_koncowa', 'formularz', 'wymiary_wynik', 'tresc'];
  var WYNIKI = ['nie_miesci', 'do_potwierdzenia', 'brak_danych', 'blad'];
  if (TEST) window.__rdPomiarTest = window.__rdPomiarTest || [];

  var kolejka = [], zaladowany = false;
  function zaraz() {
    if (zaladowany) return; zaladowany = true;
    var s = document.createElement('script');
    s.src = '/cdn-cgi/zaraz/i.js'; s.referrerPolicy = 'origin'; s.async = true;
    s.onload = function () { while (kolejka.length && window.zaraz) window.zaraz.track(kolejka.shift()); };
    document.head.appendChild(s);
  }
  // nazwa zdarzenia tylko z zamkniętych list – nic spoza nich nie trafi do statystyk
  function nazwa(name, props) {
    var czesci = [name];
    if (props.miejsce) czesci.push(MIEJSCA.indexOf(props.miejsce) > -1 ? props.miejsce : 'tresc');
    if (name !== 'kreator_start') czesci.push(MODELE.indexOf(props.model) > -1 ? props.model : 'brak');
    if (props.wynik) czesci.push(WYNIKI.indexOf(props.wynik) > -1 ? props.wynik : 'blad');
    return czesci.join('__');
  }
  function send(name, props) {
    var n = nazwa(name, props);
    if (TEST) { window.__rdPomiarTest.push({ event: name, trackName: n, props: props }); return; }
    if (window.zaraz && typeof window.zaraz.track === 'function') { window.zaraz.track(n); return; }
    kolejka.push(n); zaraz();
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
