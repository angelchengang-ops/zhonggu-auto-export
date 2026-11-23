const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const labels={en:['Get a quote','Chat on WhatsApp'],fr:['Demander un devis','Discuter sur WhatsApp'],ar:['اطلب عرض سعر','تواصل عبر واتساب'],ru:['Запросить цену','Написать в WhatsApp'],fa:['دریافت قیمت','گفتگو در واتساپ'],es:['Solicitar cotización','Chatear por WhatsApp']};
const files=[];
function walk(dir){for(const entry of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){if(entry.name.startsWith('.')||['node_modules','admin','ops','docs','tests','tmp'].includes(entry.name))continue;const name=path.join(dir,entry.name);if(entry.isDirectory())walk(name);else if(name.endsWith('.html'))files.push(name);}}
walk('');let count=0;
for(const file of files){
 let html=fs.readFileSync(path.join(root,file),'utf8');
 if(!/<form[^>]+inquiry-form|data-sales-quote|#contact-whatsapp|class="quote-link"|wa\.me/.test(html))continue;
 const lang=html.match(/<html[^>]+lang="([^"]+)/)?.[1].split('-')[0]||'en';const [quote,chat]=labels[lang]||labels.en;
 if(lang!=='en'&&!/<body[^>]*localized-market-page/.test(html))html=html.replace(/<body([^>]*)class="([^"]*)"/, '<body$1class="$2 localized-market-page"');
 if(!/<form[^>]+inquiry-form/.test(html)){
  const template=fs.readFileSync(path.join(root,(lang==='ar'||lang==='fr'?lang+'/':'')+'export-cars-from-china-to-algeria.html'),'utf8');
  let form=template.match(/<form[^>]+class="inquiry-form[^>]*>[\s\S]*?<\/form>/)?.[0];
  if(!form)throw Error('Missing form template '+file);
  const heading=html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1].replace(/<[^>]*>/g,'')||'';
  form=form.replace(/(name="source_url" value=")[^"]*/, '$1https://zhongguauto.com/'+file.replace(/index.html$/,''))
    .replace(/(name="source_page" value=")[^"]*/,(_,p)=>p+heading).replace(/(name="model" value=")[^"]*/,(_,p)=>p+heading);
  html=html.replace('</main>',`<section id="contact" class="contact-section"><div class="container inquiry-panel">${form}</div></section></main>`);
  if(!html.includes('/assets/js/phone-input.js'))html=html.replace('</head>','<script defer src="/assets/js/phone-input.js"></script></head>');
  html=html.replace(/<body([^>]*)>/,'<body$1 data-lightweight-page>');
  if(!/src="\/script\.js(?:[?"])/.test(html))html=html.replace('</body>','<script defer src="/script.js"></script></body>');
 }
 html=html.replace(/<a\b([^>]+)>([\s\S]*?)<\/a>/g,(all,attrs,content)=>{
  if(!/wa\.me|#contact-whatsapp|data-whatsapp-button/.test(attrs))return all;
  if(!/data-whatsapp-direct/.test(attrs))attrs+=' data-whatsapp-direct';
  attrs=attrs.replace(/href="[^"]*"/,'href="https://wa.me/8618661888866"');
  return `<a${attrs}>${chat}</a>`;
 });
 if(!html.includes('data-sales-quote')){
  html=html.replace(/<\/h1>/,`</h1><div class="sales-actions"><a class="sales-actions__link sales-actions__quote" href="#quote-form" data-sales-quote>${quote}</a><a class="sales-actions__link sales-actions__chat" href="https://wa.me/8618661888866" target="_blank" rel="noopener noreferrer" data-whatsapp-direct data-whatsapp-button="true">${chat}</a></div>`);
 }
 html=html.replace(/<form([^>]*class="inquiry-form[^>]*)>/,(all,attrs)=>/\bid=/.test(attrs)?all:`<form id="quote-form"${attrs}>`);
 if(!/src="\/script\.js(?:[?"])/.test(html))html=html.replace('</body>','<script defer src="/script.js"></script></body>');
 if(!html.includes('/assets/css/sales-actions.css'))html=html.replace('</head>','<link rel="stylesheet" href="/assets/css/sales-actions.css"></head>');
 if(!html.includes('/assets/js/inquiry-channels.js'))html=html.replace('</body>','<script defer src="/assets/js/inquiry-channels.js"></script></body>');
 html=html.replace(/<script defer src="\/assets\/js\/inquiry-channels\.js[^"]*"><\/script>/g,'').replace('</body>','<script defer src="/assets/js/inquiry-channels.js"></script></body>');
 fs.writeFileSync(path.join(root,file),html);count++;
}
console.log(`Installed inquiry channels on ${count} pages`);
