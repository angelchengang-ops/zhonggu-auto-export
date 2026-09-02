const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
const hashes = Object.fromEntries(['style.css', 'script.js'].map(file => [`/${file}`, createHash('sha256').update(fs.readFileSync(path.join(ROOT,file))).digest('hex').slice(0,12)]));
const ignored = new Set(['node_modules','tmp','admin','ops','data','media-inbox','media-processed','media-trash']);
let changed = 0;
function walk(dir) {
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})) {
    if(entry.name.startsWith('.') || ignored.has(entry.name)) continue;
    const file=path.join(dir,entry.name);
    if(entry.isDirectory()) { walk(file); continue; }
    if(!entry.isFile() || !entry.name.endsWith('.html')) continue;
    const old=fs.readFileSync(file,'utf8');
    const next=old.replace(/\b(src|href)=(['"])([^'"]+)\2/g,(match,attr,quote,value)=>{
      let url;
      try { url=new URL(value,`https://zhongguauto.com/${path.relative(ROOT,file).replace(/\\/g,'/')}`); } catch { return match; }
      if(url.origin!=='https://zhongguauto.com' || !hashes[url.pathname]) return match;
      url.searchParams.set('v',hashes[url.pathname]);
      const base=value.split(/[?#]/)[0];
      return `${attr}=${quote}${base}${url.search}${url.hash}${quote}`;
    });
    if(old!==next) { fs.writeFileSync(file,next); changed++; }
  }
}
walk(ROOT);
console.log(`Content-versioned shared assets in ${changed} public pages.`);
