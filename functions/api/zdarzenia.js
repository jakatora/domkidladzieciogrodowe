// Pages Function: aggregate counters only. No individual records or public read API.
// Binding: RD_EVENTS (D1). Install db/analytics.sql before enabling the route.
const EVENTS = new Set(['kontakt_telefon_klik', 'kontakt_whatsapp_klik', 'kreator_start', 'kreator_wynik', 'wymiary_sprawdzenie']);
const PLACES = new Set(['pasek_mobilny', 'naglowek', 'stopka', 'hero', 'kreator', 'kreator_wynik', 'karta_modelu', 'kontakt', 'sekcja_koncowa', 'formularz', 'wymiary_wynik', 'tresc']);
const MODELS = new Set(['brak', 'standard', 'komfort', 'xxl', 'xl', 'premium']);
const RESULTS = new Set(['brak', 'nie_miesci', 'do_potwierdzenia', 'brak_danych', 'blad']);
const PATHS = new Set([
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
]);
const KEYS = ['event', 'strona', 'miejsce', 'model', 'wynik'];
const MAX_BYTES = 512;
const UPSERT = `INSERT INTO rd_event_counts (day, environment, event, path, place, model, result, count)
  VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1)
  ON CONFLICT (day, environment, event, path, place, model, result)
  DO UPDATE SET count = rd_event_counts.count + 1`;
const CLEANUP = 'DELETE FROM rd_event_counts WHERE day < ?1';
function reply(status) {
  return new Response(null, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex', ...(status === 405 ? { Allow: 'POST' } : {}) } });
}
function valid(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  const keys = Object.keys(data);
  if (keys.length !== KEYS.length || keys.some(key => !KEYS.includes(key)) || KEYS.some(key => typeof data[key] !== 'string')) return false;
  if (!EVENTS.has(data.event) || !PATHS.has(data.strona) || !PLACES.has(data.miejsce) || !MODELS.has(data.model) || !RESULTS.has(data.wynik)) return false;
  if (data.event === 'wymiary_sprawdzenie') return data.miejsce === 'wymiary_wynik' && data.wynik !== 'brak';
  if (data.wynik !== 'brak') return false;
  if (data.event === 'kreator_start') return data.miejsce === 'kreator' && data.model === 'brak';
  if (data.event === 'kreator_wynik') return data.miejsce === 'kreator';
  return true;
}
async function limitedBody(request) {
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks = [];
  let length = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_BYTES) { await reader.cancel(); return false; }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const part of chunks) { bytes.set(part, offset); offset += part.byteLength; }
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}
export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return reply(405);
  let url;
  try { url = new URL(request.url); } catch (_) { return reply(400); }
  const production = url.hostname === 'domkidladzieciogrodowe.pl' || url.hostname === 'www.domkidladzieciogrodowe.pl';
  const preview = url.hostname === 'robdrew.pages.dev' || url.hostname.endsWith('.robdrew.pages.dev');
  if (url.protocol !== 'https:' || (!production && !preview) || url.pathname !== '/api/zdarzenia' || url.search || url.hash) return reply(403);
  if (request.headers.get('Origin') !== url.origin) return reply(403);
  const fetchSite = request.headers.get('Sec-Fetch-Site');
  if (fetchSite && fetchSite !== 'same-origin') return reply(403);
  if (!/^application\/json(?:\s*;\s*charset=(?:utf-8|"utf-8"))?$/i.test(request.headers.get('Content-Type') || '')) return reply(415);
  if (request.headers.get('Content-Encoding') && request.headers.get('Content-Encoding') !== 'identity') return reply(415);
  const declared = request.headers.get('Content-Length');
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > MAX_BYTES)) return reply(413);
  if (request.headers.get('DNT') === '1' || request.headers.get('Sec-GPC') === '1') return reply(204);
  let data;
  try {
    const raw = await limitedBody(request);
    if (raw === false) return reply(413);
    data = JSON.parse(raw);
  } catch (_) { return reply(400); }
  if (!valid(data)) return reply(400);
  if (!env || !env.RD_EVENTS || typeof env.RD_EVENTS.batch !== 'function') return reply(503);
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const cutoff = new Date(now.getTime() - 90 * 86400000).toISOString().slice(0, 10);
  try {
    // Every valid write also removes aggregates older than 90 days. D1 batch is transactional.
    const results = await env.RD_EVENTS.batch([
      env.RD_EVENTS.prepare(CLEANUP).bind(cutoff),
      env.RD_EVENTS.prepare(UPSERT).bind(day, production ? 'production' : 'preview', data.event, data.strona, data.miejsce, data.model, data.wynik)
    ]);
    if (!Array.isArray(results) || results.length !== 2 || results.some(result => !result || result.success !== true)) return reply(503);
    return reply(204);
  } catch (_) { return reply(503); }
}
