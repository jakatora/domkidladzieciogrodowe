import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.resolve(root,'dist');
if(out!==path.join(root,'dist') || (fs.existsSync(out)&&fs.lstatSync(out).isSymbolicLink())) throw new Error('Unexpected output directory');
fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out);
let count=0;
function copy(source,dest) {fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(source,dest);count++;}
function directory(source,dest) {
  for(const entry of fs.readdirSync(source,{withFileTypes:true})) {
    if(entry.isSymbolicLink()) throw new Error('Symlink in public asset tree');
    const from=path.join(source,entry.name),to=path.join(dest,entry.name);
    if(entry.isDirectory())directory(from,to);else copy(from,to);
  }
}
for(const entry of fs.readdirSync(root,{withFileTypes:true})) {
  if(entry.isFile() && (/\.(html|txt|xml|ico)$/.test(entry.name)||['_redirects','_headers','_routes.json'].includes(entry.name))) copy(path.join(root,entry.name),path.join(out,entry.name));
}
for(const dir of ['assets','poradnik','kontakt','modele','realizacje','wykonanie']) {
  if(fs.existsSync(path.join(root,dir)))directory(path.join(root,dir),path.join(out,dir));
}
// One stylesheet per ordered set avoids five blocking CSS requests on the home page.
// Keep original files for established asset URLs and readable source maintenance.
const bundles=new Map();
function bundleHtml(folder) {
  for(const entry of fs.readdirSync(folder,{withFileTypes:true})) {
    const file=path.join(folder,entry.name);
    if(entry.isDirectory()) {if(entry.name!=='assets')bundleHtml(file);continue;}
    if(!entry.name.endsWith('.html'))continue;
    let html=fs.readFileSync(file,'utf8');
    const links=[...html.matchAll(/<link\b[^>]*>/g)].filter(m=>/rel="stylesheet"/.test(m[0])&&/href="\/assets\/css\//.test(m[0]));
    if(links.length<2)continue;
    const sources=links.map(m=>m[0].match(/href="([^"?]+)(?:\?[^" ]*)?"/)[1]);
    const key=sources.join('|');let href=bundles.get(key);
    if(!href) {
      const css=sources.map(source=>fs.readFileSync(path.join(root,source),'utf8')).join('\n');
      const hash=createHash('sha256').update(css).digest('hex').slice(0,12);
      href='/assets/css/rd-'+hash+'.css';
      fs.writeFileSync(path.join(out,href),css);count++;bundles.set(key,href);
    }
    html=html.replace(links[0][0],'<link href="'+href+'" rel="stylesheet"/>');
    for(const link of links.slice(1))html=html.replace(link[0],'');
    fs.writeFileSync(file,html);
  }
}
bundleHtml(out);
console.log(`Built ${count} public files in dist. Server functions, tests and tools are excluded.`);
