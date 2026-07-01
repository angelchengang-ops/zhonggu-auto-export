const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const SITE = 'https://www.zhongguauto.com';
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const write = (p, s) => { const f=path.join(ROOT,p); fs.mkdirSync(path.dirname(f),{recursive:true}); fs.writeFileSync(f,s,'utf8'); };

function replaceMessage(file, message) {
  let s=read(file);
  s=s.replace(/(<textarea name="message" rows="4">)[\s\S]*?(<\/textarea>)/, `$1${message}$2`);
  write(file,s);
}

let home=read('index.html');
const priority=`<section class="section priority-vehicles-section"><div class="container"><div class="section-heading heading-row"><div><p class="eyebrow">Current export enquiries</p><h2>Priority Algeria Vehicles</h2></div><p>Popular models our team can check for current stock, colors and export quotations.</p></div><div class="priority-vehicle-links"><a href="/geely-coolray-manual-super-power-edition.html">Geely Coolray Super Power Edition Manual</a><a href="/geely-coolray-battle-edition.html">Geely Coolray Battle Edition</a><a href="/landing/geely-binyue-export-algeria">Geely Binyue / Coolray related stock</a><a href="/bestune-yueyi-08-2026-erev-240-plus.html">Bestune Yueyi 08</a><a href="/mg5-67900-rmb.html">MG5</a></div></div></section>`;
if(!home.includes('priority-vehicles-section')) home=home.replace('    <section id="used-cars"', `    ${priority}\n\n    <section id="used-cars"`);
write('index.html',home);

let css=read('style.css');
if(!css.includes('.priority-vehicle-links')) css += `\n.priority-vehicle-links{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px}.priority-vehicle-links a{display:flex;align-items:center;min-height:84px;padding:18px;border:1px solid #dbe3ec;border-radius:14px;background:#fff;color:#17324d;font-weight:700;text-decoration:none}.priority-vehicle-links a:hover{border-color:#df3127;color:#b82018}@media(max-width:900px){.priority-vehicle-links{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){.priority-vehicle-links{grid-template-columns:1fr}.priority-vehicle-links a{min-height:64px}}\n`;
write('style.css',css);

const stock=`<section class="seo-section sample-geely-stock"><div class="container"><h2>Sample Geely Stock Inquiry</h2><p>Overseas dealers usually ask for current Geely Binyue / Coolray availability, color options, FOB price and CIF price to Algiers. Stock changes quickly, so we confirm available units before quotation.</p><div class="link-cloud"><a href="/geely-coolray-manual-super-power-edition.html">Geely Coolray Super Power Edition Manual</a><a href="/geely-coolray-battle-edition.html">Geely Coolray Battle Edition</a><a href="/geely-coolray-super-max.html">Geely Coolray Super Max</a><a href="/geely-coolray-full-option.html">Geely Coolray Full Option</a></div></div></section>`;
let geely=read('landing/geely-car-exporter-china/index.html');
if(!geely.includes('sample-geely-stock')) geely=geely.replace('<section id="contact"',`${stock}\n<section id="contact"`);
write('landing/geely-car-exporter-china/index.html',geely);
replaceMessage('landing/geely-car-exporter-china/index.html','Please send the latest Geely Binyue / Coolray stock list, FOB price and CIF Algiers quotation.');
replaceMessage('landing/geely-binyue-export-algeria/index.html','Please send current Geely Binyue stock, available colors, FOB price and CIF price to Algiers.');
replaceMessage('landing/cif-car-price-to-algiers/index.html','Please quote CIF Algiers price based on my target model, quantity and shipping schedule.');
replaceMessage('landing/export-cars-to-algeria/index.html','I am an Algeria car importer. Please send available Geely Binyue / Coolray stock, FOB price and CIF price to Algiers.');

const slugs=['export-cars-to-algeria','geely-binyue-export-algeria','cif-car-price-to-algiers'];
for(const slug of slugs){
  let s=read(`landing/${slug}/index.html`);
  const alternates=`  <link rel="alternate" hreflang="en" href="${SITE}/landing/${slug}">\n  <link rel="alternate" hreflang="fr" href="${SITE}/fr/landing/${slug}">\n  <link rel="alternate" hreflang="ar" href="${SITE}/ar/landing/${slug}">\n  <link rel="alternate" hreflang="x-default" href="${SITE}/landing/${slug}">`;
  s=s.replace(/\s*<link rel="alternate" hreflang="(?:en|fr|ar|x-default)"[^>]*>\s*/g,'\n');
  s=s.replace(/(<link rel="canonical"[^>]*>)/,`$1\n${alternates}`);
  write(`landing/${slug}/index.html`,s);
}

const local={
 fr:{lang:'fr',dir:'ltr',title:{'export-cars-to-algeria':'Exporter une voiture vers l’Algérie depuis la Chine','geely-binyue-export-algeria':'Geely Binyue Algérie : stock et prix export','cif-car-price-to-algiers':'Prix CIF Alger pour une voiture chinoise'},desc:{'export-cars-to-algeria':'Service pour exporter voiture vers Algérie : stock réel, documents et import voiture de Chine Algérie.','geely-binyue-export-algeria':'Geely Binyue Algérie : disponibilité, couleurs, prix FOB et prix CIF Alger.','cif-car-price-to-algiers':'Demandez un prix CIF Alger selon le modèle, la quantité et le calendrier maritime.'},body:{'export-cars-to-algeria':'Nous accompagnons les professionnels qui souhaitent exporter une voiture vers l’Algérie. Notre équipe vérifie le stock, les couleurs, les documents et le transport pour un projet d’import voiture de Chine Algérie.','geely-binyue-export-algeria':'Pour une Geely Binyue Algérie, nous confirmons les unités disponibles, les couleurs, le prix FOB et le prix CIF Alger avant chaque offre.','cif-car-price-to-algiers':'Le prix CIF Alger dépend du modèle, de la quantité, du port de départ et du calendrier du navire. Envoyez vos besoins pour recevoir une offre vérifiée.'},cta:'Demander une offre'},
 ar:{lang:'ar',dir:'rtl',title:{'export-cars-to-algeria':'تصدير سيارات إلى الجزائر من الصين','geely-binyue-export-algeria':'سيارات جيلي في الجزائر وأسعار التصدير','cif-car-price-to-algiers':'سعر CIF إلى الجزائر للسيارات'},desc:{'export-cars-to-algeria':'خدمة استيراد سيارات من الصين إلى الجزائر مع التحقق من المخزون والشحن والوثائق.','geely-binyue-export-algeria':'سيارات جيلي في الجزائر: مخزون بينيو وكولراي والألوان وسعر FOB وCIF.','cif-car-price-to-algiers':'اطلب سعر CIF إلى الجزائر حسب الطراز والكمية وجدول الشحن.'},body:{'export-cars-to-algeria':'ندعم المستوردين في استيراد سيارات من الصين إلى الجزائر وتصدير سيارات إلى الجزائر، مع تأكيد المخزون والألوان والوثائق وخيارات الشحن.','geely-binyue-export-algeria':'للباحثين عن سيارات جيلي في الجزائر، نؤكد مخزون Geely Binyue / Coolray والألوان وسعر FOB وسعر CIF إلى الجزائر قبل تقديم العرض.','cif-car-price-to-algiers':'يعتمد سعر CIF إلى الجزائر على الطراز والكمية وميناء المغادرة وجدول السفينة. أرسل التفاصيل للحصول على عرض دقيق.'},cta:'اطلب عرض سعر'}
};
for(const [code,d] of Object.entries(local)) for(const slug of slugs){
 const url=`${SITE}/${code}/landing/${slug}`;
 const html=`<!DOCTYPE html><html lang="${d.lang}" dir="${d.dir}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${d.title[slug]} | Zhonggu Auto Export</title><meta name="description" content="${d.desc[slug]}"><link rel="canonical" href="${url}"><link rel="alternate" hreflang="en" href="${SITE}/landing/${slug}"><link rel="alternate" hreflang="fr" href="${SITE}/fr/landing/${slug}"><link rel="alternate" hreflang="ar" href="${SITE}/ar/landing/${slug}"><link rel="alternate" hreflang="x-default" href="${SITE}/landing/${slug}"><meta property="og:type" content="website"><meta property="og:title" content="${d.title[slug]}"><meta property="og:description" content="${d.desc[slug]}"><meta property="og:url" content="${url}"><meta property="og:image" content="${SITE}/images/new-cars/geely-coolray-01.jpg"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${SITE}/images/new-cars/geely-coolray-01.jpg"><link rel="stylesheet" href="/style.css?v=20260701-seo"></head><body class="seo-page landing-solution-page"><header class="site-header scrolled"><div class="container nav-wrap"><a class="logo" href="/index.html"><span class="logo-mark">Z</span><span>Zhonggu <strong>Auto Export</strong></span></a></div></header><main><section class="seo-hero"><div class="container"><p class="eyebrow">Zhonggu Auto Export</p><h1>${d.title[slug]}</h1><p>${d.body[slug]}</p><div class="hero-actions"><a class="btn btn-primary" href="https://wa.me/447473271351">${d.cta}</a></div></div></section><section class="seo-section"><div class="container"><h2>${code==='fr'?'Stock, prix et expédition':'المخزون والسعر والشحن'}</h2><p>${d.desc[slug]} ${code==='fr'?'Le stock change rapidement; chaque devis est confirmé selon la disponibilité actuelle.':'يتغير المخزون بسرعة، لذلك نؤكد الوحدات المتاحة قبل عرض السعر.'}</p></div></section></main><footer class="site-footer"><div class="container footer-wrap"><p>Zhonggu Auto Export</p></div></footer></body></html>`;
 write(`${code}/landing/${slug}/index.html`,html);
}

const cars=JSON.parse(read('cars.json'));
const xml=(urls,frequency='monthly')=>`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u=>`  <url><loc>${u}</loc><lastmod>2026-07-01</lastmod><changefreq>${frequency}</changefreq></url>`).join('\n')}\n</urlset>\n`;
const vehicleUrls=cars.filter(c=>c.id).map(c=>`${SITE}/${c.id}.html`);
const landingDirs=fs.readdirSync(path.join(ROOT,'landing'),{withFileTypes:true}).filter(x=>x.isDirectory()&&fs.existsSync(path.join(ROOT,'landing',x.name,'index.html'))).map(x=>`${SITE}/landing/${x.name}/`);
const localized=[]; for(const code of ['fr','ar']) for(const slug of slugs) localized.push(`${SITE}/${code}/landing/${slug}/`);
const vehicleIds=new Set(cars.map(c=>`${c.id}.html`));
const pages=fs.readdirSync(ROOT,{withFileTypes:true}).filter(x=>x.isFile()&&x.name.endsWith('.html')&&!vehicleIds.has(x.name)&&x.name!=='index.html').map(x=>`${SITE}/${x.name}`);
write('sitemap-pages.xml',xml([`${SITE}/`,...pages]));
write('sitemap-landing.xml',xml([...landingDirs,...localized]));
write('sitemap-vehicles.xml',xml(vehicleUrls,'weekly'));
write('sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap><loc>${SITE}/sitemap-pages.xml</loc><lastmod>2026-07-01</lastmod></sitemap>\n  <sitemap><loc>${SITE}/sitemap-landing.xml</loc><lastmod>2026-07-01</lastmod></sitemap>\n  <sitemap><loc>${SITE}/sitemap-vehicles.xml</loc><lastmod>2026-07-01</lastmod></sitemap>\n</sitemapindex>\n`);