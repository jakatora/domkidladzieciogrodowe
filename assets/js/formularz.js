/* Formularz „Zapytaj o termin” – bez serwera: składa wiadomość i otwiera WhatsApp. Nic nie jest zapisywane. */
(function () {
  var WA = "https://wa.me/48575325407?text=";
  document.querySelectorAll("form[data-wa-form]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = function (n) { var el = form.elements[n]; return el ? el.value.trim() : ""; };
      var lines = ["Dzień dobry, pytam o dostępny termin."];
      if (v("imie")) lines.push("Imię: " + v("imie"));
      if (v("miejscowosc")) lines.push("Miejscowość: " + v("miejscowosc"));
      if (v("model")) lines.push("Model: " + v("model"));
      if (v("wiadomosc")) lines.push("", v("wiadomosc"));
      window.open(WA + encodeURIComponent(lines.join("\n")), "_blank", "noopener");
    });
  });
})();
