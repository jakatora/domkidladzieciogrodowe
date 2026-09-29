/* Rob Drew – „Czy zestaw zmieści się w ogrodzie?” (rozszerzenie kreatora /dobierz-domek).
   Tylko wymiary potwierdzone w treści strony:
   - każdy model: domek z tarasem 180 × 180 cm,
   - zjeżdżalnia 3 m: Komfort, XXL, XL, Premium (Standard – długość niepodana),
   - XL: dodatkowy taras 180 × 140 cm,
   - Premium: cały zestaw zajmuje 5 × 7 m.
   Pełnych gabarytów pozostałych zestawów ani wymaganej wolnej przestrzeni wokół
   huśtawki i przed zjeżdżalnią nie znamy – narzędzie nigdy nie potwierdza „mieści się”. */
(function () {
  'use strict';
  var root = document.getElementById('wymiary');
  if (!root) return;

  var MODELE = {
    standard: { name: 'Standard', znane: ['domek z tarasem 1,8 × 1,8 m', 'zjeżdżalnia, belka z huśtawką i bocianim gniazdem, ścianka wspinaczkowa'] },
    komfort: { name: 'Komfort', znane: ['domek z tarasem 1,8 × 1,8 m', 'zjeżdżalnia 3 m', 'wolnostojąca rama wspinaczkowa z siatką linową'] },
    xxl: { name: 'XXL', znane: ['domek z tarasem 1,8 × 1,8 m', 'zjeżdżalnia 3 m', 'belka z dwiema huśtawkami, ścianka i drabinka'] },
    xl: { name: 'XL', znane: ['domek z tarasem 1,8 × 1,8 m', 'dodatkowy taras 1,8 × 1,4 m', 'zjeżdżalnia 3 m'] },
    premium: { name: 'Premium', zestaw: [7, 5], znane: ['cały zestaw zajmuje 5 × 7 m', 'zjeżdżalnia 3 m'] }
  };
  var DOMEK = 1.8;
  var WA = 'https://wa.me/48575325407?text=';

  var form = root.querySelector('form');
  var out = root.querySelector('[data-wymiary-wynik]');
  var err = document.getElementById('wymiary-blad');
  var inL = form.elements.dlugosc, inW = form.elements.szerokosc, sel = form.elements.model;

  function num(v) {
    v = String(v || '').trim().replace(',', '.').replace(/\s*m$/i, '');
    if (!/^\d+(\.\d+)?$/.test(v)) return NaN;
    return parseFloat(v);
  }
  function fmt(n) { return String(Math.round(n * 100) / 100).replace('.', ','); }
  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    for (var k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  function svgEl(tag, attrs, text) {
    var e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (var k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  function emit(detail) {
    document.dispatchEvent(new CustomEvent('rd:pomiar', { detail: detail }));
  }

  function ocena(L, W, key) {
    var m = MODELE[key], dl = Math.max(L, W), kr = Math.min(L, W);
    if (m.zestaw) {
      var zd = Math.max(m.zestaw[0], m.zestaw[1]), zk = Math.min(m.zestaw[0], m.zestaw[1]);
      if (dl < zd || kr < zk) return { stan: 'nie_miesci', tytul: 'Zestaw się nie zmieści',
        tekst: 'Model ' + m.name + ' zajmuje 5 × 7 m, a podane miejsce to ' + fmt(L) + ' × ' + fmt(W) + ' m. Zapytaj o mniejszy model – pomożemy wybrać.' };
      return { stan: 'do_potwierdzenia', tytul: 'Sam zestaw mieści się w podanym prostokącie – potwierdźmy resztę',
        tekst: 'Wymiar 5 × 7 m dotyczy samego zestawu. Nie liczymy online wolnego miejsca wokół huśtawki i przed zjeżdżalnią ani nachylenia terenu – wyślij zdjęcie ogrodu, a sprawdzimy to przed zamówieniem.' };
    }
    if (kr < DOMEK) return { stan: 'nie_miesci', tytul: 'Za mało miejsca nawet na sam domek',
      tekst: 'Domek z tarasem ma 1,8 × 1,8 m, a krótszy bok miejsca to ' + fmt(kr) + ' m. Cały zestaw potrzebuje więcej miejsca niż sam domek.' };
    return { stan: 'brak_danych', tytul: 'Sprawdzimy to razem – pełnych wymiarów tego zestawu nie podajemy online',
      tekst: 'Sam domek z tarasem (1,8 × 1,8 m) mieści się w podanym miejscu, ale do tego dochodzą pozostałe elementy zestawu. Wyślij wymiary i zdjęcie ogrodu – odpowiemy, czy zestaw się zmieści.' };
  }

  function rzut(L, W, key, stan) {
    var m = MODELE[key];
    var fw, fh, lab;
    if (m.zestaw) {
      // ustaw dłuższy bok zestawu wzdłuż dłuższego boku ogrodu
      var along = L >= W;
      fw = along ? 7 : 5; fh = along ? 5 : 7; lab = 'zestaw ' + m.name + ' 5 × 7 m';
    } else { fw = DOMEK; fh = DOMEK; lab = 'domek z tarasem 1,8 × 1,8 m'; }
    var pad = 1.4, totW = Math.max(L, fw) + pad * 2, totH = Math.max(W, fh) + pad * 2;
    var s = 520 / Math.max(totW, totH * 1.35), vw = totW * s, vh = totH * s;
    var svg = svgEl('svg', { viewBox: '0 0 ' + vw.toFixed(1) + ' ' + vh.toFixed(1), class: 'rd-rzut__svg', role: 'img',
      'aria-label': 'Rzut z góry w skali: miejsce ' + fmt(L) + ' × ' + fmt(W) + ' m i ' + lab + '.' });
    var ox = pad * s, oy = pad * s;
    var g = svgEl('g', { class: 'rd-rzut__siatka' });
    for (var x = 0; x <= Math.floor(L); x++) g.appendChild(svgEl('line', { x1: ox + x * s, y1: oy, x2: ox + x * s, y2: oy + W * s }));
    for (var y = 0; y <= Math.floor(W); y++) g.appendChild(svgEl('line', { x1: ox, y1: oy + y * s, x2: ox + L * s, y2: oy + y * s }));
    svg.appendChild(svgEl('rect', { x: ox, y: oy, width: L * s, height: W * s, class: 'rd-rzut__ogrod' }));
    svg.appendChild(g);
    svg.appendChild(svgEl('rect', { x: ox + 0.3 * s, y: oy + 0.3 * s, width: fw * s, height: fh * s,
      class: 'rd-rzut__zestaw rd-rzut__zestaw--' + stan }));
    // etykieta w środku zestawu, a gdy się nie mieści – pod nim
    var wnetrze = fw * s > lab.length * 7.2 + 12;
    svg.appendChild(svgEl('text', { x: ox + 0.3 * s + (wnetrze ? 6 : 0), y: oy + 0.3 * s + (wnetrze ? 16 : fh * s + 16), class: 'rd-rzut__etykieta' }, lab));
    svg.appendChild(svgEl('text', { x: ox + L * s / 2, y: oy - 10, 'text-anchor': 'middle', class: 'rd-rzut__wymiar' }, fmt(L) + ' m'));
    svg.appendChild(svgEl('text', { x: ox - 10, y: oy + W * s / 2, 'text-anchor': 'middle', class: 'rd-rzut__wymiar',
      transform: 'rotate(-90 ' + (ox - 10) + ' ' + (oy + W * s / 2) + ')' }, fmt(W) + ' m'));
    svg.appendChild(svgEl('text', { x: ox, y: vh - 8, class: 'rd-rzut__skala' }, 'kratka = 1 m'));
    return svg;
  }

  function pokaz(e) {
    if (e) e.preventDefault();
    var L = num(inL.value), W = num(inW.value), key = sel.value;
    var bledy = [];
    [[inL, L], [inW, W]].forEach(function (p) {
      var ok = isFinite(p[1]) && p[1] >= 0.5 && p[1] <= 100;
      p[0].setAttribute('aria-invalid', ok ? 'false' : 'true');
      if (!ok) bledy.push(p[0]);
    });
    if (!MODELE[key]) { sel.setAttribute('aria-invalid', 'true'); bledy.push(sel); } else sel.setAttribute('aria-invalid', 'false');
    while (out.firstChild) out.removeChild(out.firstChild);
    if (bledy.length) {
      err.textContent = 'Podaj długość i szerokość w metrach (od 0,5 do 100, np. 6,5) i wybierz model.';
      err.hidden = false; bledy[0].focus();
      emit({ event: 'wymiary_sprawdzenie', wynik: 'blad', model: MODELE[key] ? key : '' });
      return;
    }
    err.hidden = true; err.textContent = '';
    var o = ocena(L, W, key), m = MODELE[key];
    var box = el('div', { class: 'rd-wynik rd-wynik--' + o.stan });
    box.appendChild(el('p', { class: 'rd-wynik__tytul' }, o.tytul));
    box.appendChild(el('p', null, o.tekst));
    var ul = el('ul', { class: 'rd-wynik__znane', 'aria-label': 'Potwierdzone wymiary modelu ' + m.name });
    m.znane.forEach(function (t) { ul.appendChild(el('li', null, t)); });
    box.appendChild(el('p', { class: 'rd-wynik__sub' }, 'Co wiemy o modelu ' + m.name + ':'));
    box.appendChild(ul);
    var fig = el('figure', { class: 'rd-rzut' });
    fig.appendChild(rzut(L, W, key, o.stan));
    fig.appendChild(el('figcaption', null, m.zestaw ? 'Rzut w skali: prostokąt zestawu 5 × 7 m na tle podanego miejsca. Wolnej przestrzeni wokół zestawu nie zaznaczamy.'
      : 'Rzut w skali pokazuje tylko domek z tarasem – położenie zjeżdżalni, belki i pozostałych elementów ustalimy razem.'));
    var msg = 'Dzień dobry, mam w ogrodzie wolne miejsce ok. ' + fmt(L) + ' × ' + fmt(W) + ' m. Interesuje mnie model ' + m.name + '. Czy zestaw się zmieści?';
    var cta = el('div', { class: 'rd-wynik__cta' });
    var wa = el('a', { class: 'v2-btn v2-btn--primary', href: WA + encodeURIComponent(msg), target: '_blank', rel: 'noopener', 'data-pomiar-miejsce': 'wymiary_wynik', 'data-pomiar-model': key }, 'Wyślij wymiary na WhatsApp');
    var tel = el('a', { class: 'v2-btn v2-btn--ghost', href: 'tel:+48575325407', 'data-pomiar-miejsce': 'wymiary_wynik', 'data-pomiar-model': key }, 'Zadzwoń: 575 325 407');
    cta.appendChild(wa); cta.appendChild(tel);
    out.appendChild(box); out.appendChild(fig); out.appendChild(cta);
    emit({ event: 'wymiary_sprawdzenie', wynik: o.stan, model: key });
  }
  form.addEventListener('submit', pokaz);

  // Połączenie z istniejącym kreatorem: pod wynikiem link do sprawdzenia wymiarów najlepszego modelu.
  var dobor = document.getElementById('dobor');
  if (dobor && 'MutationObserver' in window) {
    new MutationObserver(function () {
      var res = dobor.querySelector('.v2-result');
      if (!res || dobor.querySelector('[data-wymiary-link]')) return;
      var a1 = res.querySelector('.v2-card h3 a'), key = '';
      if (a1) { var mm = (a1.getAttribute('href') || '').match(/model-(\w+)/); if (mm && MODELE[mm[1]]) key = mm[1]; }
      var p = el('p', { class: 'rd-dobor-wymiary', 'data-wymiary-link': '' });
      var a = el('a', { class: 'v2-link', href: '#wymiary' }, 'Sprawdź, czy ' + (key ? 'model ' + MODELE[key].name : 'zestaw') + ' zmieści się w Twoim ogrodzie');
      a.addEventListener('click', function () { if (key) sel.value = key; setTimeout(function () { inL.focus(); }, 0); });
      p.appendChild(a);
      res.parentNode.insertBefore(p, res.nextSibling);
    }).observe(dobor, { childList: true, subtree: true });
  }
})();
