# Rob Drew — strona internetowa

Serwis statyczny HTML/CSS/JS, publikowany z gałęzi `main` na Cloudflare Pages
w projekcie `robdrew`. Domena produkcyjna: https://domkidladzieciogrodowe.pl/.

## Budowanie i kontrola

Wymagany Node.js 22 lub nowszy, bez instalowania zależności:

```sh
node scripts/build.mjs
node tests/gallery-regression.cjs
node --test tests/analytics.cjs tests/forms.cjs
```

Testy analityki używają wbudowanego `node:sqlite`. Skrypt budowania tworzy `dist/`
wyłącznie z plikami publicznymi. Zestawy CSS łączy w jeden plik o nazwie
zależnej od treści; kolejność reguł pozostaje zachowana. Oryginalne pliki CSS
pozostają dostępne pod dotychczasowymi adresami. Cloudflare Pages ma ustawienia:

- Build command: `node scripts/build.mjs`
- Build output directory: `dist`
- Root directory: katalog główny repozytorium
- Pages Functions: `functions/` w katalogu repozytorium

`_routes.json` kieruje do Functions tylko `/api/zdarzenia`. Pozostałe adresy
są statyczne. Zachowujemy dotychczasowe adresy, canonical i `_redirects`.

## Pomiar kontaktów

`assets/js/pomiar.js` liczy zamiary kontaktu, użycie doboru modelu i sprawdzenie
wymiarów. Kliknięcie telefonu/WhatsApp nie jest wysłanym zapytaniem ani sprzedażą.
Klient wysyła dane tylko z domeny produkcyjnej HTTPS. `?pomiar-test` zapisuje
wyłącznie do `window.__rdPomiarTest`, a zwykły preview nie wysyła danych.
Do Not Track i Global Privacy Control wyłączają pomiar.

Binding D1 `RD_EVENTS` musi być dostępny w środowisku production i preview.
Schemat `db/analytics.sql` należy zastosować przed pierwszym wdrożeniem odbiornika.
Tabela `rd_event_counts` zawiera dzienne sumy, bez pojedynczych zdarzeń,
identyfikatorów, IP, nagłówków, parametrów URL i treści formularza. Odbiornik
akceptuje zamknięty zestaw pól i wartości, tylko POST JSON tej samej domeny,
z limitem 512 bajtów. Nie ma publicznego API odczytu.

Przykład odczytu w konsoli D1 (bez nadawania publicznego dostępu):

```sql
SELECT day, event, path, model, SUM(count) AS actions
FROM rd_event_counts
WHERE environment = 'production'
GROUP BY day, event, path, model
ORDER BY day DESC, actions DESC;
```

Sumy starsze niż 90 dni usuwa transakcyjny batch przy każdym poprawnym zapisie.
Przy braku ruchu cleanup nie jest uruchamiany. Nie ma harmonogramu usuwania.
Preview jest rozdzielone kolumną `environment`; testy sieciowe wykonujemy tam.

## Formularze i dane oferty

Formularz przygotowuje wiadomość WhatsApp; klient sam wysyła ją w aplikacji.
Wiadomość i dane kontaktowe nie trafiają do D1. Parametr `?model=komfort`
(lub inny istniejący model) zaznacza produkt w formularzu kontaktowym.
Nie dodajemy niepotwierdzonych terminów, wymiarów, certyfikatów ani realizacji.
Wymiary konstrukcji i potrzebna przestrzeń użytkowania to różne dane.

## Cofnięcie wydania

W Cloudflare Pages → Deployments wybierz poprzednie udane wdrożenie production
i użyj Rollback. Następnie wykonaj `git revert` odpowiedniego commita na `main`,
aby kolejne wdrożenie zachowało cofnięty stan. Wyłączenie klienta pomiarowego
nie wymaga usuwania bazy. Klucze API są poza repozytorium i katalogiem `dist`.
