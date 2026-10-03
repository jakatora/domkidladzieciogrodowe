const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'assets/js/main.js'), 'utf8');
const helper = script.slice(script.indexOf('  function setModelImage('), script.indexOf('  function getItemData('));
const context = vm.createContext({});
vm.runInContext(helper, context);
function image(tag) {
  const attrs = Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
  return {src: attrs.src, alt: attrs.alt, getAttribute: key => attrs[key] ?? null,
    setAttribute: (key, value) => attrs[key] = value, removeAttribute: key => delete attrs[key], attrs};
}
let checked = 0;
for (const model of ['standard', 'komfort', 'xxl', 'xl', 'premium']) {
  const html = fs.readFileSync(path.join(root, `model-${model}.html`), 'utf8');
  const main = image(html.match(new RegExp(`<img[^>]*id="main-${model}"[^>]*>`))[0]);
  const photos = [...html.matchAll(/<img class="model-thumb__full"[^>]*>/g)].map(m => image(m[0]));
  assert(photos.length > 1);
  // Select every photo and return to the responsive first one: no stale srcset.
  for (const photo of [...photos, photos[0]]) {
    context.setModelImage(main, photo);
    assert.equal(main.src, photo.src);
    assert.equal(main.alt, photo.alt);
    assert.equal(main.getAttribute('srcset'), photo.getAttribute('srcset'));
    assert.equal(main.getAttribute('sizes'), photo.getAttribute('sizes'));
    checked++;
  }
}
// Complete an older lightbox download after a newer selection: newest must win.
const loads = [];
const modalImg = {classList: {add() {}, remove() {}}};
const lightboxContext = vm.createContext({currentGroup: [{src: 'first'}, {src: 'last'}], currentIndex: 0,
  modalImg, lightboxRenderId: 0, getItemData: item => ({src: item.src, alt: item.src}),
  Image: function () { loads.push(this); }, counterEl: {}, captionEl: {}, updateThumbs() {}});
vm.runInContext(script.slice(script.indexOf('  function renderLightbox('), script.indexOf('  function setLightboxIndex(')), lightboxContext);
lightboxContext.renderLightbox();
lightboxContext.currentIndex = 1;
lightboxContext.renderLightbox();
loads[1].onload();
loads[0].onload();
assert.equal(modalImg.src, 'last');
assert.equal(lightboxContext.counterEl.textContent, '2 / 2');
// Thumbnail selection applies synchronously, so rapid clicks and opening the viewer
// cannot leave an old delayed selection waiting to overwrite the current choice.
const selection = script.slice(script.indexOf('  // Model thumbnails'), script.indexOf('  // Subtle premium'));
assert(!selection.includes('setTimeout'));
assert(selection.includes('setModelImage(mainImg, img)'));
assert(script.includes('setModelImage(mainImg, sourceImg)'));
console.log(`PASS: ${checked} selections across all five models; responsive sources, viewer sync, stale image load.`);
