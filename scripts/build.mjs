import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
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
console.log(`Built ${count} public files in dist. Server functions, tests and tools are excluded.`);
