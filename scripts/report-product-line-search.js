'use strict';
// Offline consumer for a sanitized adapter export. No network, credentials or scheduler.
const fs=require('node:fs');
const path=require('node:path');
const {buildProductLineReport,renderProductLineReport}=require('./lib/product-line-search');
const input=process.argv[2]?JSON.parse(fs.readFileSync(process.argv[2],'utf8')):{now:new Date().toISOString()};
const report=buildProductLineReport(input);
const output=process.argv[3];
if(output) {
  if(fs.existsSync(output)||fs.existsSync(output+'.md')) throw new Error('Refusing to overwrite an existing report');
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  fs.writeFileSync(output+'.md',renderProductLineReport(report),{flag:'wx'});
}
else process.stdout.write(JSON.stringify(report,null,2)+'\n');
