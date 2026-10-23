-- D1 binding: RD_EVENTS. Only aggregate UTC daily counters, no individual records.
CREATE TABLE IF NOT EXISTS rd_event_counts (
  day TEXT NOT NULL CHECK (day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  environment TEXT NOT NULL CHECK (environment IN ('production', 'preview')),
  event TEXT NOT NULL CHECK (event IN ('kontakt_telefon_klik', 'kontakt_whatsapp_klik', 'kreator_start', 'kreator_wynik', 'wymiary_sprawdzenie')),
  path TEXT NOT NULL CHECK (path IN (
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
  )),
  place TEXT NOT NULL CHECK (place IN ('pasek_mobilny', 'naglowek', 'stopka', 'hero', 'kreator', 'kreator_wynik', 'karta_modelu', 'kontakt', 'sekcja_koncowa', 'formularz', 'wymiary_wynik', 'tresc')),
  model TEXT NOT NULL CHECK (model IN ('brak', 'standard', 'komfort', 'xxl', 'xl', 'premium')),
  result TEXT NOT NULL CHECK (result IN ('brak', 'nie_miesci', 'do_potwierdzenia', 'brak_danych', 'blad')),
  count INTEGER NOT NULL DEFAULT 1 CHECK (typeof(count) = 'integer' AND count > 0),
  PRIMARY KEY (day, environment, event, path, place, model, result),
  CHECK (
    (event = 'wymiary_sprawdzenie' AND place = 'wymiary_wynik' AND result != 'brak') OR
    (event = 'kreator_start' AND place = 'kreator' AND model = 'brak' AND result = 'brak') OR
    (event = 'kreator_wynik' AND place = 'kreator' AND result = 'brak') OR
    (event IN ('kontakt_telefon_klik', 'kontakt_whatsapp_klik') AND result = 'brak')
  )
) WITHOUT ROWID;
