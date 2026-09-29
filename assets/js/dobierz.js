/* Dobierz domek – prosty kreator bez danych osobowych (2026-09-25).
   Rekomendacja wynika wyłącznie z wyposażenia i cen modeli (dane w #dobor-dane). */
(() => {
  const root = document.getElementById('dobor');
  const dataEl = document.getElementById('dobor-dane');
  if (!root || !dataEl) return;
  const M = JSON.parse(dataEl.textContent);
  const WA = 'https://wa.me/48575325407?text=';

  const STEPS = [
    { id: 'dzieci', q: 'Ile dzieci będzie się bawić?', hint: 'Przy dwojgu i więcej dzieciach liczy się liczba huśtawek i miejsce na górze.',
      opts: [['1', '1 dziecko'], ['2', '2 dzieci'], ['3', '3 i więcej']] },
    { id: 'wiek', q: 'W jakim wieku są dzieci?', hint: 'Przekażemy to doradcy razem z wynikiem.',
      opts: [['do3', 'do 3 lat'], ['4-6', '4–6 lat'], ['7-10', '7–10 lat'], ['rozny', 'Różny wiek']] },
    { id: 'miejsce', q: 'Ile miejsca masz w ogrodzie?', hint: 'Wystarczy orientacyjnie. Model Premium zajmuje 5 × 7 m.',
      opts: [['maly', 'Mały ogród', 'mniej niż 5 × 7 m wolnego miejsca'], ['sredni', 'Średni ogród', 'ok. 5 × 7 m'], ['duzy', 'Duży ogród', 'więcej niż 5 × 7 m'], ['nie-wiem', 'Nie wiem', 'pomożemy ocenić po zdjęciu']] },
    { id: 'wazne', q: 'Co jest dla Ciebie najważniejsze?', hint: 'Możesz zaznaczyć kilka odpowiedzi.', multi: true,
      opts: [['hustawki', 'Dwie huśtawki'], ['taras', 'Dużo miejsca na tarasie'], ['wspinaczka', 'Wspinaczka'], ['stol', 'Stół z ławkami pod domkiem'], ['cena', 'Jak najniższa cena']] },
    { id: 'budzet', q: 'Jaki masz budżet?', hint: 'Ceny zawierają montaż.',
      opts: [['4700', 'do 4700 zł'], ['5600', 'do 5600 zł'], ['6300', 'do 6300 zł'], ['nie-wiem', 'Jeszcze nie wiem']] },
  ];
  const LABEL = {};
  STEPS.forEach(s => s.opts.forEach(o => { LABEL[s.id + ':' + o[0]] = o[1]; }));

  const ans = { dzieci: null, wiek: null, miejsce: null, wazne: [], budzet: null };
  const pre = new URLSearchParams(location.search).get('dzieci');
  let step = 0;
  if (pre && ['1', '2', '3'].includes(pre)) { ans.dzieci = pre; step = 1; }

  const intro = root.innerHTML;
  const el = (tag, attrs = {}, text) => {
    const e = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => (k === 'class' ? (e.className = v) : e.setAttribute(k, v)));
    if (text != null) e.textContent = text;
    return e;
  };

  function score() {
    const s = { standard: 0, komfort: 0, xxl: 0, xl: 0, premium: 0 };
    const why = { standard: [], komfort: [], xxl: [], xl: [], premium: [] };
    const add = (k, n, reason) => { s[k] += n; if (reason && !why[k].includes(reason)) why[k].push(reason); };
    if (ans.dzieci === '1') { add('standard', 2); add('komfort', 2); }
    if (ans.dzieci === '2') { add('xxl', 3, 'dwie huśtawki i bocianie gniazdo – dzieci nie czekają na swoją kolej'); add('xl', 3, 'dodatkowy taras 180 × 140 cm – więcej miejsca na górze'); add('premium', 1); }
    if (ans.dzieci === '3') { add('xxl', 4, 'dwie huśtawki i bocianie gniazdo – dzieci nie czekają na swoją kolej'); add('xl', 4, 'dodatkowy taras 180 × 140 cm – więcej miejsca na górze'); add('premium', 1); }
    if (ans.miejsce === 'maly') { add('komfort', 4, 'kompaktowy zestaw, który dobrze pasuje do mniejszego ogrodu'); add('standard', 1); add('premium', -8); add('xl', -1); }
    if (ans.miejsce === 'sredni') { add('standard', 1); add('xxl', 1); add('xl', 1); add('premium', 1, 'zajmuje 5 × 7 m'); }
    if (ans.miejsce === 'duzy') { add('premium', 3, 'masz miejsce na zestaw 5 × 7 m'); add('xl', 1); add('xxl', 1); }
    ans.wazne.forEach(w => {
      if (w === 'hustawki') add('xxl', 5, 'dwie huśtawki i bocianie gniazdo – dzieci nie czekają na swoją kolej');
      if (w === 'taras') add('xl', 5, 'dodatkowy taras 180 × 140 cm – więcej miejsca na górze');
      if (w === 'wspinaczka') { add('premium', 4, 'ścianka z kamieniami i uchwytami, a z drugiej strony siatka z grubych lin'); add('komfort', 3, 'rama wspinaczkowa z siatką linową'); add('xxl', 1, 'ścianka wspinaczkowa i drabinka do ćwiczeń'); }
      if (w === 'stol') add('xxl', 5, 'pod domkiem stół z ławkami zamiast piaskownicy');
      if (w === 'cena') { add('standard', 4, 'najniższa cena w ofercie – 4500 zł z montażem'); add('komfort', 2); }
    });
    const limit = ans.budzet && ans.budzet !== 'nie-wiem' ? Number(ans.budzet) : null;
    Object.keys(s).forEach(k => {
      if (limit && M[k].price > limit) s[k] -= 20;
      else if (limit) add(k, 0, `cena ${M[k].price} zł mieści się w budżecie`);
    });
    const order = Object.keys(s).sort((a, b) => s[b] - s[a] || M[a].price - M[b].price);
    return { order, why };
  }

  function summary(best) {
    const w = ans.wazne.map(x => LABEL['wazne:' + x].toLowerCase()).join(', ') || 'brak';
    return [
      'Dzień dobry, dobrałem/-am domek na stronie.',
      `Dzieci: ${LABEL['dzieci:' + ans.dzieci] || '–'}${ans.wiek ? ` (${LABEL['wiek:' + ans.wiek]})` : ''}.`,
      `Ogród: ${LABEL['miejsce:' + ans.miejsce] || '–'}.`,
      `Ważne: ${w}.`,
      `Budżet: ${LABEL['budzet:' + ans.budzet] || '–'}.`,
      `Polecony model: ${M[best].name} (${M[best].price} zł).`,
      'Proszę o informację o cenie i terminie.',
    ].join('\n');
  }

  function card(k, badge, why) {
    const m = M[k];
    const a = el('article', { class: 'v2-card' });
    a.append(el('span', { class: 'v2-result__badge' }, badge));
    const imgLink = el('a', { class: 'v2-card__img', href: m.url });
    imgLink.append(el('img', { src: m.img, alt: m.alt, loading: 'lazy', decoding: 'async' }));
    a.append(imgLink);
    const top = el('div', { class: 'v2-card__top' });
    const h = el('h3'); h.append(el('a', { href: m.url }, 'Model ' + m.name));
    top.append(h, el('span', { class: 'v2-price' }, m.price + ' zł'));
    a.append(top);
    if (why.length) {
      a.append(el('p', { class: 'v2-result__why' }, 'Dlaczego ten model:'));
      const ul = el('ul', { class: 'v2-checks' });
      why.slice(0, 4).forEach(r => ul.append(el('li', {}, r)));
      a.append(ul);
    } else {
      a.append(el('p', { class: 'v2-card__for' }, m.for));
    }
    const act = el('div', { class: 'v2-card__actions' });
    act.append(el('a', { class: 'v2-btn v2-btn--primary v2-btn--sm', href: m.url }, 'Zobacz model'));
    a.append(act);
    return a;
  }

  function renderResult() {
    const { order, why } = score();
    const [best, alt] = order;
    root.replaceChildren();
    root.append(el('p', { class: 'v2-quiz__step' }, 'Wynik'));
    root.append(el('h2', {}, `Najlepiej pasuje model ${M[best].name}`));
    root.append(el('p', { class: 'v2-quiz__hint' }, 'Dobór opiera się na wyposażeniu i cenach modeli. Ostateczny wybór potwierdzimy razem – najlepiej po zdjęciu ogrodu.'));
    const grid = el('div', { class: 'v2-result' });
    grid.append(card(best, 'Najlepsze dopasowanie', why[best]), card(alt, 'Alternatywa', why[alt]));
    root.append(grid);
    const sum = el('div', { class: 'v2-result__summary' });
    sum.append(el('strong', {}, 'Twoje odpowiedzi: '));
    sum.append(document.createTextNode(summary(best).split('\n').slice(1, 5).join(' ')));
    root.append(sum);
    const nav = el('div', { class: 'v2-quiz__nav' });
    const send = el('a', { class: 'v2-btn v2-btn--primary', href: WA + encodeURIComponent(summary(best)), target: '_blank', rel: 'noopener' }, 'Wyślij wynik na WhatsApp');
    const call = el('a', { class: 'v2-btn v2-btn--ghost', href: 'tel:+48575325407' }, 'Zadzwoń: 575 325 407');
    const again = el('button', { class: 'v2-btn v2-btn--ghost', type: 'button' }, 'Zacznij od nowa');
    again.addEventListener('click', () => { Object.assign(ans, { dzieci: null, wiek: null, miejsce: null, wazne: [], budzet: null }); step = 0; render(); });
    nav.append(send, call, again);
    root.append(nav);
    root.querySelector('h2').setAttribute('tabindex', '-1');
    root.querySelector('h2').focus({ preventScroll: true });
    root.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function render() {
    if (step >= STEPS.length) return renderResult();
    const s = STEPS[step];
    root.innerHTML = step === 0 ? intro : '';
    const nos = root.querySelector('noscript'); if (nos) nos.remove();
    const bar = el('div', { class: 'v2-quiz__progress', role: 'progressbar', 'aria-valuemin': '1', 'aria-valuemax': String(STEPS.length), 'aria-valuenow': String(step + 1) });
    const fill = el('span'); fill.style.width = ((step + 1) / STEPS.length * 100) + '%'; bar.append(fill);
    root.append(bar);
    root.append(el('p', { class: 'v2-quiz__step' }, `Pytanie ${step + 1} z ${STEPS.length}`));
    const h = el('h2', { id: 'pyt-' + s.id, tabindex: '-1' }, s.q);
    root.append(h, el('p', { class: 'v2-quiz__hint' }, s.hint));
    const box = el('div', { class: 'v2-opts', role: 'group', 'aria-labelledby': 'pyt-' + s.id });
    s.opts.forEach(([val, label, small]) => {
      const pressed = s.multi ? ans[s.id].includes(val) : ans[s.id] === val;
      const b = el('button', { class: 'v2-opt', type: 'button', 'aria-pressed': String(pressed) }, label);
      if (small) b.append(el('small', {}, small));
      b.addEventListener('click', () => {
        if (s.multi) {
          ans[s.id] = ans[s.id].includes(val) ? ans[s.id].filter(x => x !== val) : [...ans[s.id], val];
          b.setAttribute('aria-pressed', String(ans[s.id].includes(val)));
        } else {
          ans[s.id] = val; step += 1; render();
        }
      });
      box.append(b);
    });
    root.append(box);
    const nav = el('div', { class: 'v2-quiz__nav' });
    if (step > 0) {
      const back = el('button', { class: 'v2-btn v2-btn--ghost', type: 'button' }, 'Wstecz');
      back.addEventListener('click', () => { step -= 1; render(); });
      nav.append(back);
    }
    if (s.multi) {
      const next = el('button', { class: 'v2-btn v2-btn--primary', type: 'button' }, 'Dalej');
      next.addEventListener('click', () => { step += 1; render(); });
      nav.append(next);
    }
    root.append(nav);
    if (step > 0) h.focus({ preventScroll: true });
  }

  render();
})();
