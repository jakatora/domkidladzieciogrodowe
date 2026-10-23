/* Zapytanie pozostaje lokalne do chwili otwarcia WhatsApp przez użytkownika. */
(function () {
  var WA = "https://wa.me/48575325407?text=";
  document.querySelectorAll("form[data-wa-form]").forEach(function (form) {
    var selected = new URLSearchParams(location.search).get('model');
    var labels = {standard:'Standard',komfort:'Komfort',xxl:'XXL',xl:'XL',premium:'Premium'};
    if (labels[selected] && form.elements.model) {
      var option = Array.from(form.elements.model.options).find(function (o) {
        return o.value.toLowerCase() === selected;
      });
      if (option) form.elements.model.value = option.value;
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = function (n) { var el = form.elements[n]; return el ? el.value.trim() : ""; };
      var lines = ["Dzień dobry, pytam o dostępny termin."];
      if (v("imie")) lines.push("Imię: " + v("imie"));
      if (v("miejscowosc")) lines.push("Miejscowość: " + v("miejscowosc"));
      if (v("kod")) lines.push("Kod pocztowy: " + v("kod"));
      if (v("model")) lines.push("Model: " + v("model"));
      if (v("wiadomosc")) lines.push("", v("wiadomosc"));
      var url = WA + encodeURIComponent(lines.join("\n"));
      window.open(url, "_blank", "noopener");
      // noopener windows may return null even when opened; never open a second copy.
      var status = form.querySelector('[data-wa-status]');
      if (status) status.textContent = 'W WhatsApp czeka przygotowana wiadomość. Wyślij ją w rozmowie; zdjęcia możesz dołączyć tam. Jeśli aplikacja się nie otworzyła, skorzystaj z numeru telefonu pod formularzem.';
    });
  });
})();
