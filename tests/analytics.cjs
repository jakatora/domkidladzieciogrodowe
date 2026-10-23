'use strict';
// Run with Node 24+: node --test tests/analytics.cjs. No external packages or network.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { DatabaseSync } = require('node:sqlite');
const root = path.resolve(__dirname, '..');
const clientSource = fs.readFileSync(path.join(root, 'assets/js/pomiar.js'), 'utf8');
const serverSource = fs.readFileSync(path.join(root, 'functions/api/zdarzenia.js'), 'utf8');
const schema = fs.readFileSync(path.join(root, 'db/analytics.sql'), 'utf8');
const server = import('data:text/javascript;base64,' + Buffer.from(serverSource).toString('base64'));
const origin = 'https://domkidladzieciogrodowe.pl';
const payload = () => ({ event: 'kontakt_whatsapp_klik', strona: '/model-xl', miejsce: 'karta_modelu', model: 'xl', wynik: 'brak' });
function request(data = payload(), overrides = {}) {
  const headers = { Origin: overrides.origin === undefined ? origin : overrides.origin, 'Content-Type': 'application/json', ...overrides.headers };
  if (headers.Origin === null) delete headers.Origin;
  const options = { method: overrides.method || 'POST', headers };
  if (!['GET', 'HEAD'].includes(options.method)) options.body = overrides.raw === undefined ? JSON.stringify(data) : overrides.raw;
  return new Request(overrides.url || origin + '/api/zdarzenia', options);
}
async function post(db, data, overrides) {
  return (await server).onRequest({ request: request(data, overrides), env: { RD_EVENTS: db } });
}
function database(t) {
  const sql = new DatabaseSync(':memory:');
  sql.exec(schema);
  t.after(() => sql.close());
  const calls = [];
  return {
    sql, calls,
    prepare(query) { return { bind(...values) { return { query, values }; } }; },
    async batch(statements) {
      calls.push(statements);
      sql.exec('BEGIN');
      try {
        const result = statements.map(({ query, values }) => {
          const bindings = Object.fromEntries(values.map((value, i) => ['?' + (i + 1), value]));
          sql.prepare(query).run(bindings);
          return { success: true };
        });
        sql.exec('COMMIT');
        return result;
      } catch (error) { sql.exec('ROLLBACK'); throw error; }
    },
    rows() { return sql.prepare('SELECT * FROM rd_event_counts ORDER BY environment, event').all().map(row => ({ ...row })); }
  };
}
function browser(options = {}) {
  const url = new URL(options.url || origin + '/model-xl?name=PRIVATE&phone=SECRET');
  const listeners = new Map();
  const calls = [];
  let mutation;
  let result = null;
  const chooserListeners = {};
  const chooser = {
    addEventListener(type, fn) { chooserListeners[type] = fn; },
    querySelector() { return result; }
  };
  const document = {
    addEventListener(type, fn) { listeners.set(type, fn); },
    getElementById() { return options.chooser ? chooser : null; },
    querySelector() { return options.resultLink || null; }
  };
  Object.defineProperty(document, 'cookie', { get() { throw new Error('Cookie access'); }, set() { throw new Error('Cookie access'); } });
  const sandbox = {
    location: url, navigator: options.navigator || {}, document,
    fetch: options.fetch || ((url, config) => { calls.push({ url, config }); return Promise.resolve(new Response(null, { status: 204 })); }),
    MutationObserver: function (callback) { mutation = callback; this.observe = function () {}; }
  };
  for (const key of ['localStorage', 'sessionStorage']) Object.defineProperty(sandbox, key, { get() { throw new Error('Storage access'); } });
  sandbox.window = sandbox;
  if (options.windowDNT) sandbox.doNotTrack = options.windowDNT;
  vm.runInNewContext(clientSource, sandbox, { filename: 'pomiar.js' });
  return {
    calls, sandbox, listeners,
    emit(detail) { const fn = listeners.get('rd:pomiar'); if (fn) fn({ detail }); },
    click(anchor) { const fn = listeners.get('click'); if (fn) fn({ target: { closest: selector => selector === 'a[href]' ? anchor : null } }); },
    submit(form) { const fn = listeners.get('submit'); if (fn) fn({ target: form, preventDefault() { throw new Error('Contact blocked'); } }); },
    choose() { chooserListeners.click({ target: { closest: () => ({}) } }); },
    show(model) { result = model ? { querySelector: () => ({ getAttribute: () => '/model-' + model }) } : null; mutation(); },
    entries() { return JSON.parse(JSON.stringify(sandbox.__rdPomiarTest || [])); }
  };
}
function anchor(href, matches = {}) {
  return { getAttribute: name => name === 'href' ? href : null, closest: selector => matches[selector] || null };
}

test('all 52 allowed paths match sitemap in client, handler and database', async () => {
  const xml = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const expected = [...xml.matchAll(/<loc>(https:\/\/domkidladzieciogrodowe\.pl[^<]*)<\/loc>/g)].map(m => new URL(m[1]).pathname).sort();
  const clientPaths = vm.runInNewContext(clientSource.match(/var STRONY = (\[[\s\S]*?\]);/)[1]);
  const serverPaths = vm.runInNewContext(serverSource.match(/const PATHS = new Set\((\[[\s\S]*?\])\)/)[1]);
  const sqlPaths = [...schema.match(/path TEXT NOT NULL CHECK \(path IN \(([\s\S]*?)\)\)/)[1].matchAll(/'([^']*)'/g)].map(m => m[1]);
  assert.equal(expected.length, 52);
  for (const paths of [clientPaths, serverPaths, sqlPaths]) assert.deepEqual(Array.from(paths).sort(), expected);
});

test('real SQLite atomically increments a single daily aggregate under concurrent requests', async t => {
  const db = database(t);
  const replies = await Promise.all(Array.from({ length: 30 }, () => post(db, payload(), { headers: {
    Cookie: 'PRIVATE_COOKIE', 'CF-Connecting-IP': 'PRIVATE_IP', 'User-Agent': 'PRIVATE_UA', Referer: 'https://example.com/PRIVATE_QUERY'
  } })));
  assert.ok(replies.every(response => response.status === 204));
  assert.deepEqual(db.rows(), [{ day: new Date().toISOString().slice(0, 10), environment: 'production', event: 'kontakt_whatsapp_klik', path: '/model-xl', place: 'karta_modelu', model: 'xl', result: 'brak', count: 30 }]);
  assert.doesNotMatch(JSON.stringify(db.calls), /PRIVATE/);
  assert.deepEqual(db.sql.prepare('PRAGMA table_info(rd_event_counts)').all().map(row => row.name), ['day', 'environment', 'event', 'path', 'place', 'model', 'result', 'count']);
});

test('preview is separated by server host, only the owned Pages project is allowed', async t => {
  const db = database(t);
  for (const host of ['robdrew.pages.dev', 'abc123.robdrew.pages.dev', 'www.domkidladzieciogrodowe.pl']) {
    const site = 'https://' + host;
    assert.equal((await post(db, payload(), { url: site + '/api/zdarzenia', origin: site })).status, 204);
  }
  assert.deepEqual(db.rows().map(row => [row.environment, row.count]), [['preview', 2], ['production', 1]]);
  for (const site of ['https://other.pages.dev', 'https://evil.domkidladzieciogrodowe.pl', 'https://robdrew.pages.dev.evil.example', 'http://domkidladzieciogrodowe.pl']) {
    assert.equal((await post(db, payload(), { url: site + '/api/zdarzenia', origin: site })).status, 403);
  }
});

test('valid writes remove only aggregates older than the 90-day cutoff', async t => {
  const db = database(t);
  const day = age => new Date(Date.now() - age * 86400000).toISOString().slice(0, 10);
  const seed = db.sql.prepare("INSERT INTO rd_event_counts VALUES (?, 'production', 'kontakt_telefon_klik', '/', 'hero', 'brak', 'brak', 1)");
  seed.run(day(91)); seed.run(day(90));
  assert.equal((await post(db, payload())).status, 204);
  assert.ok(!db.rows().some(row => row.day === day(91)));
  assert.ok(db.rows().some(row => row.day === day(90)));
});

test('server rejects unknown fields, types, paths, values and contradictory event dimensions', async t => {
  const db = database(t);
  const invalid = [null, [], 1, 'text', {}, { ...payload(), imie: 'Jan' }, { ...payload(), environment: 'production' },
    { ...payload(), event: 'PRIVATE_EVENT' }, { ...payload(), strona: '/kontakt?telefon=PRIVATE' }, { ...payload(), strona: '/unknown' },
    { ...payload(), model: ['xl'] }, { ...payload(), model: 1 }, { ...payload(), model: null }, { ...payload(), model: 'XL' },
    { ...payload(), miejsce: 'PRIVATE_PLACE' }, { ...payload(), wynik: 'blad' },
    { ...payload(), event: 'wymiary_sprawdzenie', wynik: 'nie_miesci' },
    { ...payload(), event: 'kreator_start', miejsce: 'kreator' },
    { ...payload(), event: 'kreator_wynik', miejsce: 'hero' }
  ];
  for (const body of invalid) assert.equal((await post(db, body)).status, 400, JSON.stringify(body));
  assert.equal(db.calls.length, 0);
  assert.equal(db.rows().length, 0);
});

test('server enforces POST, same-origin, JSON, byte limit and valid UTF-8 before D1', async t => {
  const db = database(t);
  for (const method of ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE']) {
    const response = await post(db, payload(), { method });
    assert.equal(response.status, 405); assert.equal(response.headers.get('Allow'), 'POST');
  }
  for (const remote of [null, 'null', 'https://evil.example', 'https://www.domkidladzieciogrodowe.pl']) assert.equal((await post(db, payload(), { origin: remote })).status, 403);
  assert.equal((await post(db, payload(), { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
  assert.equal((await post(db, payload(), { url: origin + '/api/zdarzenia?name=PRIVATE' })).status, 403);
  for (const type of ['text/plain', 'application/x-www-form-urlencoded', 'application/json; charset=iso-8859-2']) assert.equal((await post(db, payload(), { headers: { 'Content-Type': type } })).status, 415);
  assert.equal((await post(db, payload(), { headers: { 'Content-Encoding': 'gzip' } })).status, 415);
  for (const length of ['513', '-1', 'abc']) assert.equal((await post(db, payload(), { headers: { 'Content-Length': length } })).status, 413);
  for (const raw of ['{', '', 'null', '[]']) assert.equal((await post(db, payload(), { raw })).status, 400);
  assert.equal((await post(db, payload(), { raw: new Uint8Array([0xff, 0xfe]) })).status, 400);
  const raw = JSON.stringify(payload());
  assert.equal((await post(db, payload(), { raw: raw.padEnd(513) })).status, 413);
  assert.equal((await post(db, payload(), { raw: raw.padEnd(512), headers: { 'Content-Type': 'application/json; charset=utf-8' } })).status, 204);
  assert.equal(db.calls.length, 1);
});

test('all supported event shapes reach D1 and database rejects invalid direct insertions', async t => {
  const db = database(t);
  const events = [payload(), { ...payload(), event: 'kontakt_telefon_klik' },
    { ...payload(), event: 'kreator_start', miejsce: 'kreator', model: 'brak' },
    { ...payload(), event: 'kreator_wynik', miejsce: 'kreator' },
    ...['nie_miesci', 'do_potwierdzenia', 'brak_danych', 'blad'].map(wynik => ({ ...payload(), event: 'wymiary_sprawdzenie', miejsce: 'wymiary_wynik', wynik }))];
  for (const body of events) assert.equal((await post(db, body)).status, 204);
  assert.equal(db.rows().length, 8);
  assert.throws(() => db.sql.prepare("INSERT INTO rd_event_counts VALUES ('2026-10-23', 'production', 'PRIVATE', '/', 'hero', 'brak', 'brak', 1)").run(), /CHECK/);
  assert.throws(() => db.sql.prepare("INSERT INTO rd_event_counts VALUES ('2026-10-23', 'production', 'kontakt_telefon_klik', '/?PRIVATE', 'hero', 'brak', 'brak', 1)").run(), /CHECK/);
});

test('DNT and GPC prevent writes and no endpoint response exposes counts or cookies', async t => {
  const db = database(t);
  for (const headers of [{ DNT: '1' }, { 'Sec-GPC': '1' }]) {
    const response = await post(db, payload(), { headers });
    assert.equal(response.status, 204); assert.equal(await response.text(), '');
    assert.equal(response.headers.get('Set-Cookie'), null); assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
  }
  assert.equal(db.calls.length, 0);
});

test('missing or failing D1 gives a generic empty response', async () => {
  const handler = (await server).onRequest;
  const failureModes = [async () => { throw Error('PRIVATE_DATABASE'); }, async () => [], async () => undefined, async () => [{ success: true }, { success: false }]];
  const envs = [{}, ...failureModes.map(batch => ({ RD_EVENTS: { batch, prepare: () => ({ bind: () => ({}) }) } }))];
  for (const env of envs) {
    const response = await handler({ request: request(), env });
    assert.equal(response.status, 503); assert.equal(await response.text(), '');
  }
});

test('test mode buffers sanitized data only, never network, query strings or arbitrary detail', () => {
  const b = browser({ url: 'https://abc.robdrew.pages.dev/model-xl?pomiar-test&name=PRIVATE' });
  b.emit({ event: 'wymiary_sprawdzenie', wynik: 'do_potwierdzenia', model: 'xl', name: 'PRIVATE', phone: 'SECRET', strona: '/bad?PRIVATE' });
  b.emit({ event: 'kontakt_whatsapp_klik', miejsce: 'PRIVATE', model: 'Jan SECRET', text: 'PRIVATE' });
  b.emit({ event: 'PRIVATE', model: 'xl' });
  assert.equal(b.calls.length, 0);
  assert.equal(b.entries().length, 2);
  assert.deepEqual(b.entries()[0].props, { strona: '/model-xl', miejsce: 'wymiary_wynik', model: 'xl', wynik: 'do_potwierdzenia' });
  assert.deepEqual(b.entries()[1].props, { strona: '/model-xl', miejsce: 'tresc', model: 'brak', wynik: 'brak' });
  assert.doesNotMatch(JSON.stringify(b.entries()), /PRIVATE|SECRET|\?/);
});

test('client only sends on production HTTPS, with privacy-preserving fetch options', () => {
  for (const url of [origin + '/', 'https://www.domkidladzieciogrodowe.pl/']) {
    const b = browser({ url }); b.emit({ event: 'kontakt_telefon_klik', miejsce: 'hero' });
    assert.equal(b.calls.length, 1);
    const { url: endpoint, config } = b.calls[0];
    assert.equal(endpoint, '/api/zdarzenia'); assert.equal(config.method, 'POST');
    assert.equal(config.credentials, 'omit'); assert.equal(config.referrerPolicy, 'no-referrer');
    assert.equal(config.keepalive, true); assert.equal(config.mode, 'same-origin');
    assert.deepEqual(Object.keys(JSON.parse(config.body)).sort(), ['event', 'miejsce', 'model', 'strona', 'wynik']);
    assert.doesNotMatch(config.body, /PRIVATE|SECRET|\?/);
  }
  for (const url of ['https://robdrew.pages.dev/', 'https://abc.robdrew.pages.dev/', 'http://domkidladzieciogrodowe.pl/', 'https://evil.domkidladzieciogrodowe.pl/', origin + '/private']) {
    const b = browser({ url }); b.emit({ event: 'kontakt_telefon_klik' }); assert.equal(b.calls.length, 0);
  }
});

test('client respects DNT and GPC even in local test mode', () => {
  for (const options of [{ navigator: { globalPrivacyControl: true } }, { navigator: { doNotTrack: '1' } }, { navigator: { msDoNotTrack: '1' } }, { windowDNT: '1' }]) {
    const b = browser({ ...options, url: origin + '/?pomiar-test' }); b.emit({ event: 'kontakt_telefon_klik' });
    assert.equal(b.calls.length, 0); assert.equal(b.entries().length, 0);
  }
});

test('contact anchors and forms are preserved; new home classes classify correctly without form contents', () => {
  const b = browser({ url: origin + '/?pomiar-test' });
  for (const [selector, place] of [['.at-hero', 'hero'], ['.at-contact', 'kontakt']]) {
    b.click(anchor('tel:+48575325407', { [selector]: {} }));
    assert.equal(b.entries().at(-1).props.miejsce, place);
  }
  const card = { matches: () => false, querySelector: () => ({ getAttribute: () => '/model-standard' }) };
  b.click(anchor('https://wa.me/48575325407?text=PRIVATE', { '.at-product': card }));
  assert.deepEqual(b.entries().at(-1).props, { strona: '/', miejsce: 'karta_modelu', model: 'standard', wynik: 'brak' });
  const elements = { model: { value: 'Model XL' } };
  Object.defineProperty(elements, 'name', { get() { throw Error('Name accessed'); } });
  b.submit({ matches: () => true, elements });
  assert.deepEqual(b.entries().at(-1).props, { strona: '/', miejsce: 'formularz', model: 'xl', wynik: 'brak' });
  assert.doesNotMatch(JSON.stringify(b.entries()), /PRIVATE|48575325407/);
});

test('chooser start and result count once, reset allows another attempt', () => {
  const b = browser({ url: origin + '/dobierz-domek?pomiar-test', chooser: true });
  b.choose(); b.choose(); b.show('xl');
  assert.deepEqual(b.entries().map(e => e.event), ['kreator_start', 'kreator_wynik']);
  b.show(null); b.choose(); b.show('komfort');
  assert.deepEqual(b.entries().map(e => e.event), ['kreator_start', 'kreator_wynik', 'kreator_start', 'kreator_wynik']);
});

test('client payloads for all five event families pass the real handler', async t => {
  const db = database(t);
  const b = browser({ url: origin + '/?name=PRIVATE' });
  for (const event of ['kontakt_telefon_klik', 'kontakt_whatsapp_klik', 'kreator_start', 'kreator_wynik', 'wymiary_sprawdzenie']) b.emit({ event, miejsce: 'hero', model: 'xl', wynik: 'brak_danych', name: 'PRIVATE' });
  assert.equal(b.calls.length, 5);
  for (const call of b.calls) assert.equal((await post(db, undefined, { raw: call.config.body })).status, 204);
  assert.equal(db.rows().length, 5);
});

test('fetch failures never throw into contact handlers', async () => {
  for (const fetch of [() => { throw Error('offline'); }, () => Promise.reject(Error('offline'))]) {
    const b = browser({ fetch });
    assert.doesNotThrow(() => b.click(anchor('tel:+48575325407')));
  }
  await new Promise(resolve => setImmediate(resolve));
});
