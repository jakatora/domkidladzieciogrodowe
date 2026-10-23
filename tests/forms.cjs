const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'assets/js/formularz.js'),'utf8');
function fixture(file,search) {
  const html=fs.readFileSync(path.join(root,file),'utf8');
  const select=html.match(/<select\b[^>]*name="model"[^>]*>([\s\S]*?)<\/select>/)[1];
  const options=[...select.matchAll(/<option\b[^>]*value="([^"]*)"/g)].map(m=>({value:m[1]}));
  const initial=select.match(/<option\b(?=[^>]*selected)[^>]*value="([^"]*)"/);
  const elements={model:{value:initial?initial[1]:'',options}};
  for(const name of ['imie','miejscowosc','kod','wiadomosc'])elements[name]={value:''};
  const status={textContent:''};let submit;const opened=[];
  const form={elements,querySelector:()=>status,addEventListener:(name,fn)=>{if(name==='submit')submit=fn;}};
  vm.runInNewContext(source,{URLSearchParams,location:{search},document:{querySelectorAll:()=>[form]},window:{open:(...args)=>opened.push(args)}});
  return {elements,status,opened,submit:()=>{let prevented=false;submit({preventDefault:()=>{prevented=true;}});assert.ok(prevented);}};
}
test('all six real form option sets accept known model links without opening WhatsApp',()=>{
  for(const file of ['kontakt.html',...['standard','komfort','xxl','xl','premium'].map(x=>'model-'+x+'.html')]) {
    for(const model of ['standard','komfort','xxl','xl','premium']) {
      const f=fixture(file,'?model='+model);
      assert.equal(f.elements.model.value.toLowerCase(),model,file);
      assert.equal(f.opened.length,0);
    }
  }
});
test('unknown model query does not change the real default',()=>{
  assert.equal(fixture('kontakt.html','?model=unknown').elements.model.value,'');
  const a=fixture('model-xl.html',''),b=fixture('model-xl.html','?model=https://example.org');
  assert.equal(a.elements.model.value,b.elements.model.value);
});
test('WhatsApp draft safely encodes Polish text and postal code and requires manual send',()=>{
  const f=fixture('kontakt.html','?model=komfort');
  f.elements.imie.value='  Łukasz & Ola  ';f.elements.miejscowosc.value='Łódź';
  f.elements.kod.value='90-001';f.elements.wiadomosc.value='Ogród: 8 × 9 m? #termin';
  f.submit();assert.equal(f.opened.length,1);
  const [value,target,features]=f.opened[0];const url=new URL(value);
  assert.equal(url.origin,'https://wa.me');assert.equal(url.pathname,'/48575325407');
  assert.equal(target,'_blank');assert.equal(features,'noopener');
  assert.equal([...url.searchParams.keys()].join(','),'text');
  const body=url.searchParams.get('text');
  for(const text of ['Imię: Łukasz & Ola','Miejscowość: Łódź','Kod pocztowy: 90-001','Model: Komfort','Ogród: 8 × 9 m? #termin'])assert.ok(body.includes(text));
  assert.ok(f.status.textContent.includes('Wyślij ją w rozmowie'));
});
