'use strict';
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..'),site='https://zhongguauto.com';
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const write=(f,s)=>{if(!fs.existsSync(path.join(root,f))||read(f)!==s)fs.writeFileSync(path.join(root,f),s)};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cars=JSON.parse(read('cars.json')).filter(c=>c.id.startsWith('geely-coolray-'));
const manual=cars.find(c=>c.id==='geely-coolray-manual-super-power-edition');
const full=cars.find(c=>c.id==='geely-coolray-full-option');
const autos=cars.filter(c=>c!==manual&&c!==full);
const amount=c=>Number(c.fobPriceDisplay.replace(/[^0-9.]/g,''));
const money=n=>new Intl.NumberFormat('en-US').format(n)+' USD';
const manualPrice=money(amount(manual)),fullPrice=money(amount(full));
const values=autos.map(amount),autoPrice=Math.min(...values)===Math.max(...values)?money(values[0]):money(Math.min(...values))+' – '+money(Math.max(...values));
const tailgate=Number(cars.find(c=>c.id==='geely-coolray-battle-edition').configuration.match(/Electric tailgate version FOB USD ([\d,]+)/)[1].replace(/,/g,''));
const image='/images/new-cars/geely-coolray-full-option-nansha/optimized/01-front-three-quarter-right.webp';
const base='/landing/geely-binyue-export-algeria/';
const cfg={
fr:{
 title:'Geely Coolray prix Algérie | Automatique & Full Option',
 description:`Comparez les prix FOB Chine de la Geely Coolray pour l’Algérie : manuelle ${manualPrice}, automatique ${autoPrice}, Full Option ${fullPrice}.`,
 h1:'Geely Coolray : prix pour l’Algérie et importation de Chine',
 intro:'Vous recherchez le prix d’une Geely Coolray en Algérie ? Comparez ici les tarifs FOB au départ de Chine, les versions automatiques et la Full Option. Ces prix concernent la fourniture du véhicule pour l’exportation ; ils ne constituent pas un prix livré, dédouané et immatriculé en Algérie.',
 updated:'Prix mis à jour le 18 novembre 2026. Disponibilité, couleurs, port de départ et validité du devis à confirmer.',
 nav:['Prix et versions','Coolray automatique','Coolray Full Option'],
 priceHeading:'Prix Geely Coolray pour l’Algérie : comparer les versions',
 priceText:'La Geely Binyue est également commercialisée sous le nom Coolray sur certains marchés. Les équipements peuvent varier selon la version et le marché : comparez la référence exacte, et pas seulement le nom du modèle. Les tarifs ci-dessous sont exprimés en dollars américains, sur une base FOB Chine.',
 cols:['Version','Transmission / équipement','Prix FOB Chine','Fiche véhicule'],
 trims:['Super Power manuelle','Super Power automatique avec toit ouvrant','Super Power automatique sans toit ouvrant','Super MAX','BATTLE','Full Option'],
 features:['Boîte manuelle','Automatique · toit ouvrant','Automatique · sans toit ouvrant','Boîte automatique','Boîte automatique','Automatique · pack et toit panoramique'],
 detail:'Voir la fiche (anglais)',tailgate:'BATTLE avec hayon électrique',
 autoHeading:'Geely Coolray automatique : prix et choix de version',
 autoText:`Les versions Super Power automatiques avec ou sans toit ouvrant, Super MAX et BATTLE sont proposées à ${autoPrice} FOB Chine. La version BATTLE avec hayon électrique est affichée à ${money(tailgate)}. La Full Option avec pack et toit panoramique figure séparément à ${fullPrice}.`,
 autoCompare:'Un prix identique ne signifie pas un équipement identique. Avant de choisir, demandez la liste des équipements de la version exacte, les photos du véhicule, le type de boîte, le toit ouvrant éventuel et les détails du hayon. Indiquez également la quantité, la couleur souhaitée et votre port de destination.',
 fullHeading:'Geely Coolray Full Option : prix FOB et équipements',
 fullText:`La Geely Coolray Full Option avec pack et toit panoramique est affichée à ${fullPrice} FOB Chine. La fiche de stock à Nansha présente les photos de cette version. Faites confirmer les unités disponibles, le VIN et la liste des équipements avant toute réservation.`,
 fullDifference:'Pour comparer la Full Option à une Coolray automatique standard, vérifiez surtout le pack annoncé, le toit panoramique et les équipements réellement présents sur le véhicule proposé. L’appellation « Full Option » ne garantit pas que toutes les options proposées sur tous les marchés soient incluses.',
 caption:'Geely Coolray Full Option : photo de référence de cette version, et non de toutes les finitions.',
 stock:'Photos et détails du stock à Nansha (anglais)',
 shippingHeading:'Prix en Chine, transport vers Alger et coût total',
 shippingText:'Pour une importation de Geely Coolray de Chine vers l’Algérie, distinguez le prix FOB du devis CIF. Le fret maritime et l’assurance doivent être chiffrés pour le port de destination et la date de départ demandés. Les frais à destination, taxes, dédouanement et immatriculation sont à vérifier séparément. Un montant FOB en dollars ne doit pas être présenté comme un prix final en dinars.',
 shippingNext:'Nous confirmons les véhicules, les documents disponibles et les conditions de la vente côté Chine. Faites vérifier les conditions d’importation applicables à votre situation et au véhicule exact avant la commande. Aucune admission douanière ni date de livraison n’est garantie sur cette page.',
 cif:'Comprendre le devis CIF Alger',market:'Informations sur l’exportation vers l’Algérie',
 faqHeading:'Questions sur le prix de la Geely Coolray en Algérie',
 faqs:[['Quel est le prix de départ de la Geely Coolray pour l’Algérie ?',`La version manuelle est affichée à ${manualPrice} FOB Chine. Les autres versions automatiques, hors Full Option, sont affichées à ${autoPrice}. Le prix livré en Algérie nécessite un devis distinct.`],['Quel est le prix de la Geely Coolray automatique ?',`Les versions Super Power automatiques, Super MAX et BATTLE sont affichées à ${autoPrice} FOB Chine. Le BATTLE avec hayon électrique est à ${money(tailgate)}. Confirmez la version et ses équipements avant commande.`],['Combien coûte la Geely Coolray Full Option ?',`La version Full Option avec pack et toit panoramique est affichée à ${fullPrice} FOB Chine. Le transport maritime et les frais à destination ne sont pas inclus dans ce prix FOB.`],['Le prix indiqué inclut-il la livraison et le dédouanement en Algérie ?','Non. Demandez un devis séparé pour le fret et l’assurance, puis faites confirmer les taxes et frais à destination selon votre situation.'],['Comment demander un devis pour la version choisie ?','Précisez la version, la quantité, la couleur et le port de destination. Nous confirmons les véhicules disponibles, les documents et le devis FOB ou CIF demandé.']],
 contactHeading:'Demander le prix de votre Coolray pour l’Algérie',contactText:'Indiquez manuelle, automatique ou Full Option, ainsi que la quantité et le port de destination. Le modèle et les conditions seront confirmés dans le devis.',cta:'Demander un devis',form:'Formulaire en français',related:'Comparer les versions en français et en arabe',home:'Accueil',country:'Algérie',langLabel:'Langue'
},
ar:{
 title:'سعر جيلي كولراي في الجزائر | أوتوماتيك وفل أوبشن',
 description:`قارن أسعار جيلي كولراي للتصدير إلى الجزائر: يدوي ${manualPrice}، أوتوماتيك ${autoPrice}، فل أوبشن ${fullPrice}. أسعار FOB من الصين.`,
 h1:'سعر جيلي كولراي للجزائر والاستيراد من الصين',
 intro:'هل تبحث عن سعر جيلي كولراي في الجزائر؟ قارن هنا أسعار التصدير من الصين ونسخ الأوتوماتيك وفل أوبشن. الأسعار المعروضة هي أسعار FOB من الصين، وليست أسعار سيارة مسلّمة في الجزائر بعد التخليص الجمركي والتسجيل.',
 updated:'آخر تحديث للأسعار: 18 نوفمبر 2026. يُؤكَّد التوفر والألوان وميناء المغادرة وصلاحية عرض السعر عند الاستفسار.',
 nav:['الأسعار والفئات','كولراي أوتوماتيك','كولراي فل أوبشن'],
 priceHeading:'أسعار جيلي كولراي للجزائر حسب الفئة',
 priceText:'تُسوَّق جيلي بينيو أيضًا باسم كولراي في بعض الأسواق. قد تختلف التجهيزات حسب الفئة والسوق، لذلك يجب مقارنة مرجع السيارة المحدد وعدم الاكتفاء باسم الموديل. جميع الأسعار التالية بالدولار الأمريكي وعلى أساس FOB من الصين.',
 cols:['الفئة','ناقل الحركة والتجهيزات','سعر FOB من الصين','تفاصيل السيارة'],
 trims:['Super Power يدوي','Super Power أوتوماتيك مع فتحة سقف','Super Power أوتوماتيك دون فتحة سقف','Super MAX','BATTLE','Full Option — فل أوبشن'],
 features:['ناقل يدوي','أوتوماتيك · فتحة سقف','أوتوماتيك · دون فتحة سقف','ناقل أوتوماتيك','ناقل أوتوماتيك','أوتوماتيك · حزمة تجهيزات وسقف بانورامي'],
 detail:'عرض التفاصيل بالإنجليزية',tailgate:'BATTLE مع باب خلفي كهربائي',
 autoHeading:'سعر جيلي كولراي أوتوماتيك للجزائر',
 autoText:`أسعار نسخ Super Power الأوتوماتيك مع فتحة سقف أو دونها، وSuper MAX وBATTLE هي ${autoPrice} على أساس FOB من الصين. نسخة BATTLE مع الباب الخلفي الكهربائي بسعر ${money(tailgate)}. أما نسخة فل أوبشن مع حزمة التجهيزات والسقف البانورامي فسعرها ${fullPrice}.`,
 autoCompare:'تساوي السعر لا يعني تطابق التجهيزات. اطلب قائمة تجهيزات الفئة المحددة وصور السيارة ونوع ناقل الحركة، وتحقق من فتحة السقف والباب الخلفي قبل الاختيار. اذكر أيضًا العدد واللون المطلوب وميناء الوصول.',
 fullHeading:'سعر جيلي كولراي فل أوبشن وتجهيزاتها',
 fullText:`سعر جيلي كولراي Full Option مع حزمة التجهيزات والسقف البانورامي هو ${fullPrice} على أساس FOB من الصين. تعرض صفحة المخزون في نانشا صور هذه النسخة. يجب تأكيد الوحدات المتاحة ورقم الهيكل VIN وقائمة التجهيزات قبل الحجز.`,
 fullDifference:'عند مقارنة فل أوبشن بنسخة أوتوماتيك أخرى، تحقق من حزمة التجهيزات والسقف البانورامي والمعدات الموجودة فعلًا في السيارة المعروضة. تسمية «فل أوبشن» لا تعني أن جميع الخيارات المتاحة في كل الأسواق مشمولة.',
 caption:'جيلي كولراي فل أوبشن: صورة مرجعية لهذه النسخة، وليست لجميع الفئات.',
 stock:'صور وتفاصيل مخزون نانشا بالإنجليزية',
 shippingHeading:'سعر السيارة في الصين والشحن إلى الجزائر',
 shippingText:'عند استيراد جيلي كولراي من الصين إلى الجزائر، ميّز بين سعر FOB وعرض CIF. تُحسب أجرة الشحن البحري والتأمين حسب ميناء الوصول وموعد المغادرة المطلوبين. تُراجع رسوم الوجهة والضرائب والتخليص الجمركي والتسجيل بصورة منفصلة. لا يُعد سعر FOB بالدولار سعرًا نهائيًا للسيارة بالدينار الجزائري.',
 shippingNext:'نؤكد السيارات والوثائق المتاحة وشروط البيع من الجانب الصيني. تحقّق قبل الطلب من شروط الاستيراد المطبقة على حالتك وعلى السيارة المحددة. لا تتضمن هذه الصفحة ضمانًا للقبول الجمركي أو لموعد التسليم.',
 cif:'فهم عرض CIF إلى الجزائر العاصمة',market:'معلومات التصدير إلى الجزائر',
 faqHeading:'أسئلة حول سعر جيلي كولراي في الجزائر',
 faqs:[['ما هو السعر الابتدائي لجيلي كولراي للجزائر؟',`سعر النسخة اليدوية هو ${manualPrice} على أساس FOB من الصين. أسعار النسخ الأوتوماتيك الأخرى، باستثناء فل أوبشن، هي ${autoPrice}. يتطلب السعر شامل التسليم في الجزائر عرضًا منفصلًا.`],['كم سعر جيلي كولراي أوتوماتيك؟',`سعر نسخ Super Power الأوتوماتيك وSuper MAX وBATTLE هو ${autoPrice} على أساس FOB من الصين. نسخة BATTLE مع الباب الخلفي الكهربائي بسعر ${money(tailgate)}. يجب تأكيد الفئة وتجهيزاتها قبل الطلب.`],['كم سعر جيلي كولراي فل أوبشن؟',`سعر فل أوبشن مع حزمة التجهيزات والسقف البانورامي هو ${fullPrice} على أساس FOB من الصين. لا يشمل هذا السعر الشحن البحري أو رسوم الوجهة.`],['هل يشمل السعر التسليم والتخليص الجمركي في الجزائر؟','لا. اطلب عرضًا منفصلًا للشحن والتأمين، ثم تحقّق من الضرائب ورسوم الوجهة وفق حالتك.'],['كيف أطلب عرض سعر للفئة المطلوبة؟','حدد الفئة والعدد واللون وميناء الوصول. نؤكد السيارات المتاحة والوثائق وعرض FOB أو CIF المطلوب.']],
 contactHeading:'اطلب عرض سعر كولراي للجزائر',contactText:'حدد النسخة اليدوية أو الأوتوماتيك أو فل أوبشن، مع العدد وميناء الوصول. يتم تأكيد السيارة والشروط في عرض السعر.',cta:'اطلب عرض سعر',form:'نموذج الاستفسار بالعربية',related:'قارن الفئات بالفرنسية والعربية',home:'الرئيسية',country:'الجزائر',langLabel:'اللغة'
}};
const css=`.coolray-algeria .seo-hero{padding-top:120px}.coolray-algeria .price-amount{white-space:nowrap;unicode-bidi:isolate;direction:ltr;display:inline-block}.coolray-algeria .section-links{display:flex;gap:12px;flex-wrap:wrap;margin:20px 0}.coolray-algeria .section-links a{padding:10px 14px;border:1px solid currentColor;border-radius:8px}.coolray-algeria .quote-note{font-size:.92rem}.coolray-algeria figure{max-width:760px;margin:24px 0}.coolray-algeria figure img{display:block;width:100%;height:auto;border-radius:12px}.coolray-algeria figcaption{font-size:.9rem;color:#526174;margin-top:8px}.coolray-algeria .price-table{width:100%;border-collapse:collapse}.coolray-algeria th,.coolray-algeria td{text-align:start;border-bottom:1px solid #dce2e8;padding:12px;overflow-wrap:anywhere}.coolray-algeria section[id]{scroll-margin-top:100px}.coolray-algeria .locale-nav{display:flex;flex-wrap:wrap;gap:14px}.coolray-algeria details{padding:16px 0;border-bottom:1px solid #dce2e8}.coolray-algeria summary{font-weight:700;cursor:pointer}.coolray-algeria .quote-link{display:inline-block;margin:8px 12px 8px 0}@media(max-width:600px){.coolray-algeria .price-table thead{display:none}.coolray-algeria .price-table tr{display:block;border:1px solid #dce2e8;border-radius:10px;margin:12px 0;padding:8px}.coolray-algeria .price-table td,.coolray-algeria .price-table th{display:block;border:0;padding:6px}.coolray-algeria .seo-hero h1{font-size:2rem}.coolray-algeria .nav-wrap{flex-wrap:wrap;gap:10px}.coolray-algeria .locale-nav{font-size:.9rem}}`;
for(const [lang,c] of Object.entries(cfg)){
 const url=site+'/'+lang+base;
 const prices=cars.map((car,i)=>`<tr><th scope="row">${esc(c.trims[i])}</th><td>${esc(c.features[i])}</td><td><bdi class="price-amount">${money(amount(car))}</bdi></td><td><a href="/${car.id}.html">${esc(c.detail)}</a></td></tr>`).join('');
 const graph=[{'@type':'WebPage','@id':url+'#webpage',url,name:c.title,description:c.description,inLanguage:lang,dateModified:'2026-11-18',about:{'@type':'Thing',name:'Geely Coolray / Binyue'}},{'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:c.home,item:site+'/'},{'@type':'ListItem',position:2,name:c.country,item:site+'/'+lang+'/export-cars-from-china-to-algeria.html'},{'@type':'ListItem',position:3,name:c.h1,item:url}]},{'@type':'ItemList',itemListElement:cars.map((car,i)=>({'@type':'ListItem',position:i+1,name:'Geely Coolray '+c.trims[i],url:site+'/'+car.id+'.html'}))},{'@type':'FAQPage',mainEntity:c.faqs.map(([q,a])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}))}];
 const text=`<!DOCTYPE html><html lang="${lang}" dir="${lang==='ar'?'rtl':'ltr'}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(c.title)}</title><meta name="description" content="${esc(c.description)}"><link rel="canonical" href="${url}">${['en','fr','ar','x-default'].map(l=>`<link rel="alternate" hreflang="${l}" href="${site}${['en','x-default'].includes(l)?'':'/'+l}${base}">`).join('')}<meta property="og:type" content="website"><meta property="og:title" content="${esc(c.title)}"><meta property="og:description" content="${esc(c.description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${site}${image}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(c.title)}"><meta name="twitter:description" content="${esc(c.description)}"><meta name="twitter:image" content="${site}${image}"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/assets/css/whatsapp-lead-modal.css"><style>${css}</style></head><body class="seo-page landing-solution-page localized-market-page coolray-algeria" data-market-country="Algeria"><header class="site-header scrolled"><div class="container nav-wrap"><a class="logo" href="/"><span class="logo-mark">Z</span><span>Zhonggu <strong>Auto Export</strong></span></a><nav class="locale-nav" aria-label="${esc(c.langLabel)}"><a href="${base}" lang="en">English</a><a href="/fr${base}" lang="fr">Français</a><a href="/ar${base}" lang="ar">العربية</a></nav></div></header><main>
<section class="seo-hero"><div class="container"><p class="eyebrow">Zhonggu Auto Export · ${esc(c.country)}</p><h1>${esc(c.h1)}</h1><p>${esc(c.intro)}</p><p class="quote-note">${esc(c.updated)}</p><nav class="section-links" aria-label="${esc(c.priceHeading)}">${['prices','automatic','full-option'].map((id,i)=>`<a href="#${id}">${esc(c.nav[i])}</a>`).join('')}</nav><a class="btn btn-primary" href="#quote">${esc(c.cta)}</a></div></section>
<section class="seo-section" id="prices"><div class="container"><h2>${esc(c.priceHeading)}</h2><p>${esc(c.priceText)}</p><table class="price-table"><thead><tr>${c.cols.map(x=>`<th scope="col">${esc(x)}</th>`).join('')}</tr></thead><tbody>${prices}</tbody></table><p>${esc(c.tailgate)} : <bdi class="price-amount">${money(tailgate)}</bdi> FOB.</p></div></section>
<section class="seo-section" id="automatic"><div class="container"><h2>${esc(c.autoHeading)}</h2><p>${esc(c.autoText)}</p><p>${esc(c.autoCompare)}</p><a class="btn btn-primary" href="#quote">${esc(c.cta)}</a></div></section>
<section class="seo-section" id="full-option"><div class="container"><h2>${esc(c.fullHeading)}</h2><p>${esc(c.fullText)}</p><p>${esc(c.fullDifference)}</p><figure><img src="${image}" alt="${esc(c.caption)}" width="1280" height="960" loading="lazy"><figcaption>${esc(c.caption)}</figcaption></figure><a href="/geely-coolray-ready-stock-nansha-port.html">${esc(c.stock)}</a></div></section>
<section class="seo-section"><div class="container"><h2>${esc(c.shippingHeading)}</h2><p>${esc(c.shippingText)}</p><p>${esc(c.shippingNext)}</p><p><a href="/${lang}/landing/cif-car-price-to-algiers/">${esc(c.cif)}</a> · <a href="/${lang}/export-cars-from-china-to-algeria.html">${esc(c.market)}</a></p></div></section>
<section class="seo-section" id="faq"><div class="container"><h2>${esc(c.faqHeading)}</h2>${c.faqs.map(([q,a])=>`<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div></section>
<section class="seo-section" id="quote"><div class="container"><h2>${esc(c.contactHeading)}</h2><p>${esc(c.contactText)}</p><a class="btn btn-primary quote-link" href="https://wa.me/8618661888866" data-whatsapp-button="true" data-vehicle="Geely Coolray / Binyue" data-market="Algeria" data-source="algeria-coolray-${lang}">${esc(c.cta)} · WhatsApp</a><a class="quote-link" href="/${lang}/export-cars-from-china-to-algeria.html#contact">${esc(c.form)}</a></div></section></main><footer class="site-footer"><div class="container footer-wrap"><p>Zhonggu Auto Export</p><a href="/${lang}/export-cars-from-china-to-algeria.html">${esc(c.market)}</a></div></footer><script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@graph':graph}).replace(/</g,'\\u003c')}</script><script defer src="/assets/js/whatsapp-lead-modal.js"></script></body></html>\n`;
 write(lang+base+'index.html',text);
}
// Keep existing canonical URLs; expose the localized pages through visible links.
for(const file of ['landing/geely-binyue-export-algeria/index.html','landing/geely-coolray-exporter-china/index.html','fr/export-cars-from-china-to-algeria.html','ar/export-cars-from-china-to-algeria.html']){
 const lang=file.startsWith('fr/')?'fr':file.startsWith('ar/')?'ar':'en';
 const heading=cfg[lang]?.related||'Geely Coolray prices for Algeria: French and Arabic';
 const block=`<section class="seo-section" id="algeria-coolray-languages"><div class="container"><h2>${esc(heading)}</h2><p><a href="/fr${base}" lang="fr">Geely Coolray prix Algérie : automatique et Full Option</a></p><p><a href="/ar${base}" lang="ar" dir="rtl">سعر جيلي كولراي في الجزائر: أوتوماتيك وفل أوبشن</a></p></div></section>`;
 let s=read(file);s=s.replace(/<section class="seo-section" id="algeria-coolray-languages">[\s\S]*?<\/section>/g,'');s=s.replace('</main>',block+'</main>');write(file,s);
}
console.log('Generated French/Arabic Algeria Coolray keyword pages from confirmed catalogue prices.');
