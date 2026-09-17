'use strict';

const { lines, availableUsedBevs } = require('./seo-product-lines');

// Runs inside the existing SEO generator, before the existing form/SEO/asset post-processors.
module.exports = function generateSixProductPages({ cars, read, write, pageShell, contactSection, escapeHtml: e, vehicleCard, vehiclePrice, vehicleImage }) {
  const byId = new Map(cars.map(c => [c.id, c]));
  const get = id => { if (!byId.has(id)) throw new Error('Missing product source: ' + id); return byId.get(id); };
  const spec = (c, label) => (c.detailSpecs || []).map(s => Array.isArray(s) ? s : [s.label, s.value]).find(([key]) => key === label)?.[1] || 'Not provided; request details';
  const section = (heading, content) => '<section class="seo-section"><div class="container"><h2>' + e(heading) + '</h2>' + content + '</div></section>';
  const p = text => '<p>' + e(text) + '</p>';
  const link = (href, label) => '<a href="' + e(href) + '">' + e(label) + '</a>';
  const table = (headers, rows) => '<div class="table-scroll" role="region" aria-label="' + e(headers.join(', ')) + '" tabindex="0"><table class="market-vehicle-table"><thead><tr>' + headers.map(h => '<th scope="col">' + e(h) + '</th>').join('') + '</tr></thead><tbody>' + rows.map(r => '<tr>' + r.map((c, i) => '<' + (i ? 'td' : 'th scope="row"') + '>' + c + '</' + (i ? 'td' : 'th') + '>').join('') + '</tr>').join('') + '</tbody></table></div>';
  const block = content => '<!-- SIX_PRODUCT_BUYING_START -->\n' + content + '\n<!-- SIX_PRODUCT_BUYING_END -->';
  function insert(file, content, before = '<section id="contact"') {
    let html = read(file).replace(/<!-- SIX_PRODUCT_BUYING_START -->[\s\S]*?<!-- SIX_PRODUCT_BUYING_END -->\s*/g, '');
    if (!html.includes(before)) before = '</main>';
    if (!html.includes(before)) throw new Error('No insertion point: ' + file);
    if (!html.includes('class="menu-toggle"') && html.includes('<nav class="main-nav"')) {
      html=html.replace('<nav class="main-nav"', '<button class="menu-toggle" type="button" aria-expanded="false" aria-controls="main-nav" aria-label="Open navigation"><span></span><span></span><span></span></button><nav id="main-nav" class="main-nav"');
    }
    write(file, html.replace(before, block(content) + '\n' + before));
  }
  function metadata(file, title, description, h1) {
    let html = read(file).replace(/<title>[\s\S]*?<\/title>/, '<title>' + e(title) + '</title>');
    for (const [attr, name, value] of [['name','description',description],['property','og:title',title],['property','og:description',description],['name','twitter:title',title],['name','twitter:description',description]]) {
      html = html.replace(new RegExp('<meta ' + attr + '="' + name + '" content="[^"]*"[^>]*>'), '<meta ' + attr + '="' + name + '" content="' + e(value) + '">');
    }
    if (h1) html = html.replace(/<h1[^>]*>[\s\S]*?<\/h1>/, '<h1>' + e(h1) + '</h1>');
    html = html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, (all, json) => {
      const data = JSON.parse(json);
      for (const node of data['@graph'] || [data]) if (node['@type'] === 'WebPage') { node.name = title; node.description = description; }
      return '<script type="application/ld+json">' + JSON.stringify(data).replace(/</g, '\\u003c') + '</script>';
    });
    write(file, html);
  }

  // One early homepage entry per product line; full catalogue and media sections remain intact.
  let home = read('index.html').replace(/<section class="section priority-vehicles-section">[\s\S]*?<\/section>\s*/g, '');
  const priority = '<section class="section priority-vehicles-section"><div class="container"><div class="section-heading centered"><p class="eyebrow">For dealers and importers</p><h2>Explore Six Vehicle Sourcing Lines</h2><p>Compare specific listings and prepare a stock or sourcing inquiry for your destination.</p></div><div class="priority-vehicle-links">' + lines.map(l => '<a href="' + l.path + '"><span><strong>' + e(l.label) + '</strong><small>' + e(l.note) + '</small></span></a>').join('') + '</div></div></section>\n';
  write('index.html', home.replace('<section id="new-cars"', priority + '<section id="new-cars"'));

  const navCards = ids => '<div class="seo-card-grid">' + lines.filter(l => ids.includes(l.id)).map(l => '<article class="seo-card"><h3>' + e(l.label) + '</h3>' + p(l.note) + link(l.path, 'Review ' + l.label) + '</article>').join('') + '</div>';
  insert('new-cars.html', section('New Vehicle Buying Guides', navCards(['coolray','yueyi03','xiaoma'])));
  insert('used-cars.html', section('Used Petrol, PHEV and BEV Sourcing', navCards(['b70','yueyi07','usedBev'])));
  insert('bestune-car-exporter-china.html', section('Compare Bestune Purchase Options', navCards(['b70','yueyi03','xiaoma','yueyi07'])));
  insert('landing/geely-car-exporter-china/index.html', section('Coolray Purchase Options', navCards(['coolray'])));

  const coolrays = cars.filter(c => c.id.startsWith('geely-coolray-'));
  insert('landing/geely-coolray-exporter-china/index.html',
    section('Compare the Listed Coolray Versions',
      p('Start with the exact version and its published reference quotation. Equipment and availability must be checked on the actual units; different trims are not interchangeable.') +
      table(['Version','Published price','Details'], coolrays.map(c => [e(c.cardTitle || c.model), e(vehiclePrice(c)), link('/' + c.id + '.html','Review this version')])) +
      p('These are existing listing quotations, not guaranteed landed prices. Confirm the quotation term, port, validity and included charges before comparing offers.')) +
    section('From Trim Selection to a Shipment Inquiry',
      p('Send the exact trim, quantity, colors and destination port. Ask for current vehicle references and equipment photos before reserving units. A CIF request also needs a fresh freight quotation.') +
      '<div class="priority-vehicle-links">' + link('/geely-coolray-full-option.html','Full Option specification and actual media') + link('/geely-coolray-ready-stock-nansha-port.html','Nansha stock verification and shipping checklist') + link('/landing/geely-binyue-export-algeria/','Algeria-specific procurement guide') + '</div>'),
    '<section class="seo-section">');
  metadata('landing/geely-coolray-exporter-china/index.html',
    'Geely Coolray / Binyue Prices & Export Options from China',
    'Compare listed Geely Coolray trims and reference prices from China. Review Full Option media, Nansha stock checks and FOB/CIF inquiry requirements.',
    'Geely Coolray / Binyue Buying Guide from China');


  // The general buying guide must not label every lead as an Algeria request.
  let generalCoolray = read('landing/geely-coolray-exporter-china/index.html');
  generalCoolray = generalCoolray
    .replace('Algeria Vehicle Export Support', 'Geely Coolray Sourcing from China')
    .replace('Ask for Algeria Shipping Quote', 'Ask for an Export Quote')
    .replace('This page focuses on ready stock compact SUVs, realistic stock confirmation, China port delivery and shipping coordination rather than broad claims or keyword-stuffed promises.', 'Compare the listed trims, confirm current vehicle details and prepare a quotation for your destination port.')
    .replace(/<input type="hidden" name="market_(?:region|country)" value="[^"]*">/g, '');
  write('landing/geely-coolray-exporter-china/index.html', generalCoolray);

  insert('geely-coolray-ready-stock-nansha-port.html',
    section('Confirm Stock and Shipment Readiness',
      p('The Full Option listing includes existing Nansha port photos and a click-to-load video. Those materials show the recorded vehicles; they are not a live quantity count or a new inspection date.') +
      '<ol class="seo-list"><li>Specify Full Option with Package and Panoramic Sunroof, quantity and colors.</li><li>Request current VIN or vehicle references, location, equipment photos and quantity confirmation.</li><li>Confirm the named FOB port, included charges and quotation validity. For CIF, provide the destination port.</li><li>Confirm document readiness, loading arrangements and the current carrier schedule before agreeing a shipment date.</li></ol>' +
      link('/geely-coolray-full-option.html','View the existing photos and Nansha video') + ' · ' + link('/landing/geely-coolray-exporter-china/','Compare other Coolray versions')));
  insert('landing/geely-binyue-export-algeria/index.html', section('Prepare a Specific Coolray Inquiry for Algeria',
    p('Use the exact trim and vehicle reference, your destination port and quantity. Ask for the available vehicle documents and inspection media, then have your importer confirm the requirements applicable to those units before ordering.') +
    link('/landing/geely-coolray-exporter-china/','Compare Coolray versions') + ' · ' + link('/geely-coolray-ready-stock-nansha-port.html','Check the Nansha Full Option listing')));

  const b70 = ['2021','2022','2023'].map(y => get('used-bestune-b70-' + y));
  let b70html = read('used-bestune-b70-wholesale.html');
  b70html = b70html.replace(/<div class="table-scroll">[\s\S]*?<\/table><\/div>/,
    table(['Model year','Version','Listed batch mileage','Listed sale price','Details'], b70.map(c => [e(c.year),e(c.configuration),e(c.mileage),e(vehiclePrice(c)),link('/'+c.id+'.html','View '+c.year+' B70')])));
  write('used-bestune-b70-wholesale.html', b70html);
  insert('used-bestune-b70-wholesale.html', section('Plan a Mixed-Year B70 Order',
    p('State the quantity required from each model year and an acceptable mileage range. Ask for one vehicle-reference list with separate odometer readings, inspection evidence and quoted prices; do not assume all units in a batch have the same condition.') +
    p('The table uses the catalogue’s listed sale prices. Confirm the FOB or CIF scope separately in the written quotation. Request accident and repair disclosures and prior-use records; unknown operating or ownership history must remain unconfirmed.')));

  const y03 = ['445km-zhixuan','565km-xinxiang'].map(v => get('bestune-yueyi-03-2026-' + v + '-edition'));
  let y03html = read('bestune-yueyi-03-wholesale.html').replace(/<div class="table-scroll">[\s\S]*?<\/table><\/div>/,
    table(['2026 version','CLTC range','Battery (listed)','FOB reference','Details'],y03.map(c => [e(c.configuration),e(c.cltcRange),e(spec(c,'Battery type') + '; ' + spec(c,'Battery capacity')),e(vehiclePrice(c)),link('/'+c.id+'.html','Review version')])));
  y03html = y03html.replace('with ample stock, FOB export support and dealer quotation workflow.', 'for a version-specific FOB inquiry. Confirm current quantity and colors before ordering.').replace('Brand-new pure electric SUV with CLTC range, LFP battery and ample stock.', 'New pure electric SUV; confirm the listed version and current availability.');
  write('bestune-yueyi-03-wholesale.html', y03html);
  insert('bestune-yueyi-03-wholesale.html',
    section('Yueyi 03 and JoyEE 03 Naming',
      p('Bestune’s official brand news uses JoyEE (Yueyi) 03 for this model family. This page compares the two China-market 2026 versions in our catalogue; the shared name does not prove identical equipment, charging hardware or warranty across markets.') +
      link('https://bestune.ru/brand/news/bestune-introduced-special-version-joyee03-in-china/','Bestune brand announcement on the model name')) +
    section('Battery, Charging and Destination Checks',
      p('The range figures use CLTC, not a promised real-world distance. Temperature, route, speed, load and battery condition affect driving range. Request the exact battery specification and charging-port photos for the offered units.') +
      p('Confirm local AC/DC charging compatibility, included equipment, inspection documents and the written scope of after-sales support. Overseas warranty terms and registration eligibility are not established by a domestic model name.') +
      p('Send the 445 km or 565 km version, quantity, colors, destination port, intended use and required delivery timing. Ask for an itemized current quotation.')));
  metadata('bestune-yueyi-03-wholesale.html','Bestune Yueyi 03 / JoyEE 03 | 445 & 565 km EV Comparison',
    'Compare the listed 2026 Bestune Yueyi 03 / JoyEE 03 EV versions, CLTC ranges and FOB references. Request current stock, charging details and export terms.');

  const y07 = get('used-bestune-yueyi-07-2025');
  let y07html = read('used-bestune-yueyi-07-phev-export.html').replace('No major accidents reported. Final condition, mileage, color and configuration must be confirmed by VIN.', 'Request accident and repair disclosures, current inspection records and a per-unit odometer photo. Missing records are not confirmation of an accident-free history.');
  y07html = y07html.replace('<small>FOB price</small><strong>US$13,500</strong>', '<small>Listed sale price</small><strong>' + e(vehiclePrice(y07)) + '</strong>');
  write('used-bestune-yueyi-07-phev-export.html', y07html);
  insert('used-bestune-yueyi-07-phev-export.html',
    section('PHEV Inspection and Quotation Checklist',
      p('This is the used 2025 210 km Youxiang Edition listing. It is a plug-in hybrid with an engine and electric drive, not a used battery-only EV. The 210 km figure is CLTC electric range; the listed mileage is approximate and must be verified by unit.') +
      p('Request battery diagnostics with the test date and method, charging-operation checks, engine and hybrid-system maintenance records, and accident or repair disclosures. Confirm charging connector compatibility for the destination.') +
      p('Send quantity, acceptable mileage, intended use and destination port. Match each quoted unit to its VIN or vehicle reference, current photos, condition notes and available documents. The published sale-price reference does not establish the final FOB/CIF scope.') +
      link('/used-bestune-yueyi-07-2025.html','Review the existing 2025 listing and gallery') + ' · ' + link('/used-electric-cars-from-china.html','For battery-only vehicles, use the used BEV sourcing request')));
  metadata('used-bestune-yueyi-07-phev-export.html','Used 2025 Bestune Yueyi 07 PHEV | Price & Export Inquiry',
    'Review the used 2025 Bestune Yueyi 07 PHEV listing, 210 km CLTC electric range and inspection checklist. Confirm per-unit mileage and current export quotation.');

  const bevs = availableUsedBevs(cars);
  const inventory = bevs.length
    ? '<div class="seo-card-grid">' + bevs.map(c => vehicleCard(c, 'Used battery electric listing; request current unit and battery evidence.')).join('') + '</div>'
    : '<p class="inventory-empty" data-inventory-status="no-verified-public-stock"><strong>There is currently no verified public used BEV inventory in our catalogue. You can submit a sourcing request.</strong></p>';
  const body = '<section class="seo-hero"><div class="container"><p class="eyebrow">Battery electric vehicles only</p><h1>Used Electric Cars from China — Sourcing Requests</h1><p>Prepare a vehicle-specific request for used battery electric cars. Review the information needed to assess battery condition, charging compatibility and a destination-based quotation.</p><div class="hero-actions"><a class="btn btn-primary" href="#contact" data-title="Used BEV sourcing request" data-static-label="Send Used EV Requirements">Send Used EV Requirements</a><a class="btn btn-light" href="/used-cars.html">Browse All Used Vehicles</a></div></div></section>' +
    section('Current Used BEV Listings', inventory + p('Used petrol B70 listings and Yueyi 07 plug-in hybrids belong to other categories. New Xiaoma and Yueyi 03 vehicles are not used BEV stock.')) +
    section('Describe the Vehicles You Need',
      '<ol class="seo-list"><li>Preferred brand/model, model-year or first-registration range, quantity and budget.</li><li>Maximum mileage, intended use, steering requirement and acceptable condition.</li><li>Destination country and port, local charging connection and required charging equipment.</li><li>Battery evidence required, purchasing timeline and FOB or CIF quotation preference.</li></ol>') +
    section('Ask for Battery and Vehicle Evidence',
      table(['Evidence','Current status','What to request'], [
        ['Battery health (SOH)','Not obtained','A per-vehicle diagnostic report, test date, method and test conditions.'],
        ['Battery repair and charging history','Not obtained','Available service records, repair disclosures and AC/DC charging checks.'],
        ['Accident, flood and repair history','Not obtained','Inspection report, disclosures, underbody photos and available records.'],
        ['Identity, year and mileage','Not obtained','VIN or reference, registration documents and current odometer photos.']
      ].map(r=>r.map(e))) +
      p('A missing report must remain unknown. A range estimate or dashboard reading is not a measured battery-health result. Compare diagnostic reports using their stated methods and conditions.')) +
    section('Check Charging and Quotation Scope',
      p('Confirm the actual connector and vehicle charging specification against destination equipment before purchase. An adapter or matching plug shape alone does not establish full compatibility. Ask which charging equipment and documents are included.') +
      p('Confirm the named port, currency, quotation validity and itemized charges once a real vehicle is identified. No public vehicle is reserved by this request, and no price, battery score, registration approval or availability is promised.')) +
    section('Related Vehicle Categories',navCards(['b70','yueyi07','yueyi03','xiaoma'])) +
    contactSection({heading:'Send a Used BEV Sourcing Request',intro:'Share your requirements below. We will first check whether matching vehicles and supporting records can be obtained.',model:'Used battery electric vehicle (BEV) sourcing request',sourcePath:'used-electric-cars-from-china.html',button:'Send Sourcing Request',message:'Preferred model:\nModel year / first registration range:\nQuantity and budget:\nMaximum mileage and intended use:\nDestination country / port:\nCharging connector and equipment:\nRequired battery / inspection records:\nPurchase timing and FOB / CIF preference:'});
  write('used-electric-cars-from-china.html',pageShell({
    title:'Used Electric Cars from China | BEV Sourcing Request',
    description:bevs.length ? 'Review listed used battery electric cars from China and request vehicle, battery and charging evidence before an export quotation.' : 'No verified public used BEV stock currently listed. Submit model, year, mileage and battery requirements for used electric car sourcing from China.',
    path:'used-electric-cars-from-china.html',h1:'Used Electric Cars from China — Sourcing Requests',body:body.replace('class="btn inquiry-submit" type="submit"', 'class="btn inquiry-submit" type="submit" data-static-label="Send Sourcing Request"'),
    schema:[{'@type':'Service',name:'Used BEV sourcing requests',serviceType:'Vehicle sourcing inquiry',provider:{'@id':'https://zhongguauto.com/#organization'},url:'https://zhongguauto.com/used-electric-cars-from-china.html'}]
  }));
  // Shared script populates worldwide calling codes and binds the single CRM flow.
  for (const line of lines) {
    const file=line.path.endsWith('/')?line.path.slice(1)+'index.html':line.path.slice(1);
    let html=read(file);
    html=html.replace(/<label><span>WhatsApp<\/span><input type="tel" name="whatsapp"[^>]*><\/label>/g,
      '<label><span>Phone / WhatsApp country code</span><select name="calling_code" autocomplete="tel-country-code" required><option value="" selected>Select code</option></select></label><label><span>Phone / WhatsApp number</span><input type="tel" name="phone_number" autocomplete="tel-national" placeholder="Local number or +international number" required></label><input type="hidden" name="whatsapp" value="">');
    write(file,html);
  }

};
