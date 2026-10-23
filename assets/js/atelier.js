/* Local catalogue filters. Product links and all products remain usable without JavaScript. */
document.addEventListener('DOMContentLoaded', function () {
  var filters = Array.from(document.querySelectorAll('[data-filter]'));
  var products = Array.from(document.querySelectorAll('.at-product'));
  var count = document.querySelector('.at-result-count');
  filters.forEach(function (button) {
    button.addEventListener('click', function () {
      filters.forEach(function (b) { b.setAttribute('aria-pressed', String(b === button)); });
      var visible = 0;
      products.forEach(function (product) {
        product.hidden = button.dataset.filter !== 'all' && !product.dataset.tags.split(' ').includes(button.dataset.filter);
        if (!product.hidden) visible++;
      });
      if (count) count.textContent = 'Pokazujemy ' + visible + ' ' + (visible === 1 ? 'model' : visible < 5 ? 'modele' : 'modeli');
    });
  });
});
