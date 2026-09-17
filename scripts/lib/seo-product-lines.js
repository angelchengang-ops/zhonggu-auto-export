'use strict';

const lines = [
  { id: 'coolray', label: 'Geely Coolray / Binyue', path: '/landing/geely-coolray-exporter-china/', note: 'Compare trims, prices and Nansha stock checks.' },
  { id: 'b70', label: 'Used Bestune B70', path: '/used-bestune-b70-wholesale.html', note: 'Compare 2021–2023 petrol batch listings.' },
  { id: 'yueyi03', label: 'Bestune Yueyi 03 / JoyEE 03', path: '/bestune-yueyi-03-wholesale.html', note: 'Compare the listed 445 km and 565 km CLTC EVs.' },
  { id: 'xiaoma', label: 'Bestune Xiaoma', path: '/bestune-xiaoma-2026-222km-shanyaoma-edition.html', note: 'Review the 2026 222 km CLTC city EV.' },
  { id: 'yueyi07', label: 'Used Bestune Yueyi 07 PHEV', path: '/used-bestune-yueyi-07-phev-export.html', note: 'Review the 2025 plug-in hybrid listing.' },
  { id: 'usedBev', label: 'Used Electric Cars', path: '/used-electric-cars-from-china.html', note: 'Submit a BEV sourcing request; no verified public stock currently listed.' }
];
const isUsed = car => car.isUsed === true || [car.category, car.type, car.condition].some(v => /^(used|used car)$/i.test(String(v || '').trim()));
// Conflicting or unspecified powertrains fail closed. A PHEV's electric range is not BEV evidence.
function isUsedBev(car) {
  const fields = [car.energyType, car.fuel, car.powertrain].filter(Boolean).map(String);
  return isUsed(car) && fields.some(v => /^(BEV|electric|pure electric|battery electric(?: vehicle)?)$/i.test(v.trim()))
    && !fields.some(v => /hybrid|phev|hev|erev|petrol|diesel|gasoline|range.exten/i.test(v));
}
const availableUsedBevs = cars => cars.filter(car => isUsedBev(car)
  && !/sold|out.?of.?stock|unavailable/i.test([car.inventoryStatus, car.status, car.availability].filter(Boolean).join(' ')));

function buyingGuide(car, escape) {
  const id = car.id;
  let heading, paragraphs;
  if (id === 'bestune-xiaoma-2026-222km-shanyaoma-edition') {
    heading = 'Buying the Xiaoma 222 km City EV';
    paragraphs = [
      'This listing covers the new 2026 222km Shanyaoma Edition. Use its trim and vehicle reference in your inquiry; other model names or market versions do not establish identical equipment.',
      'The listed 222 km range is measured under CLTC. Driving conditions, temperature, load and battery use affect actual range. Confirm the charging connector, AC supply requirements and included charging equipment for your destination.',
      'Send quantity, colors, destination country and port, expected use and delivery target. Request current unit photos, battery documentation and the scope of any available after-sales support. The FOB quotation is not an overseas landed price or a registration guarantee.'
    ];
  } else if (/^used-bestune-b70-20/.test(id)) {
    heading = 'Choose Units Within This Model-Year Listing';
    paragraphs = [
      'The mileage shown is a batch range, not an exact odometer reading for a reserved car. Ask for each vehicle reference, first registration date, odometer photo, repair disclosures and available inspection records.',
      'For a mixed-year order, specify your quantity by year and maximum mileage. Confirm availability and a separate condition and price record for every selected unit before agreeing the batch quotation.'
    ];
  } else if (/^bestune-yueyi-03-/.test(id)) {
    heading = 'Confirm This Yueyi 03 Version Before Ordering';
    paragraphs = [
      'CLTC range and the published charging figures describe the listed version, not a guaranteed overseas driving range or charging result. Check the exact battery and charging equipment on the units offered.',
      'Send destination, quantity, preferred colors and intended use. Request connector photos, charging requirements, available inspection documents and written after-sales terms; do not assume a domestic warranty applies abroad.'
    ];
  } else if (id === 'used-bestune-yueyi-07-2025') {
    heading = 'Inspect the Used 2025 PHEV as a Complete Vehicle';
    paragraphs = [
      'This is a plug-in hybrid, not a battery-only electric car. The listed 210 km CLTC figure refers to electric range. The approximate mileage is a listing reference; request an odometer photo for each offered unit.',
      'Ask for battery diagnostic records with test date and method, charging checks, engine and hybrid-system service records, and accident or repair disclosures. Missing records are not evidence of a clean history.'
    ];
  } else if (id === 'geely-coolray-full-option') {
    heading = 'Match the Full Option Quotation to the Actual Units';
    paragraphs = [
      'Use the Full Option with Package and Panoramic Sunroof description and this vehicle reference when requesting a quote. Confirm exact equipment, color, VIN and current quantity; the port video does not establish today’s stock count.',
      'Confirm the named loading port, quotation validity, included charges and shipment readiness. For a CIF inquiry, include the destination port so freight can be checked for the requested shipment.'
    ];
  } else return '';
  return '<section class="seo-section product-buying-guide"><div class="container"><h2>' + escape(heading) + '</h2>' + paragraphs.map(p => '<p>' + escape(p) + '</p>').join('') + '</div></section>';
}
module.exports = { lines, isUsedBev, availableUsedBevs, buyingGuide };
