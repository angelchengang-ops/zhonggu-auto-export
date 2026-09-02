const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const phone = require('../scripts/lib/phone');
const lib = require('libphonenumber-js/max');
const examples = require('libphonenumber-js/examples.mobile.json');

test('all 245 supported regions normalize international and national mobile examples', () => {
  assert.equal(phone.countries().length, 245);
  for (const region of lib.getCountries()) {
    const example = lib.getExampleNumber(region, examples);
    assert.ok(example, region);
    const code = '+' + lib.getCountryCallingCode(region);
    for (const raw of [example.number, example.formatNational(), example.formatInternational(), '00' + example.number.slice(1)]) {
      assert.equal(phone.normalize(raw, code)?.number, example.number, `${region}: ${raw}`);
    }
  }
});

test('Egypt Iraq Iran prefixes, retained Italian zero, Unicode digits and cross-border WhatsApp', () => {
  for (const [code, input, expected] of [
    ['+20','01012345678','+201012345678'], ['+964','07701234567','+9647701234567'],
    ['+98','۰۹۱۲۱۲۳۴۵۶۷','+989121234567'], ['+20','٠١٠١٢٣٤٥٦٧٨','+201012345678'],
    ['+39','02 3661 8300','+390236618300'], ['+1','１ ２１３ ３７３ ４２５３','+12133734253'],
    ['+213','+1 213 373 4253','+12133734253'], ['+213','+34 612 345 678','+34612345678'],
    ['+34','34612345678','+34612345678'], ['','0034612345678','+34612345678']
  ]) assert.equal(phone.normalize(input, code)?.number, expected);
  for (const input of ['123','abc','       ','123abc456789','+34+34612345678','+99912345678','+1 213 373 4253 ext 9']) assert.equal(phone.normalize(input, '+213'), null, input);
});

test('all 60,025 cross-region combinations accept the number independently of the selected default', () => {
  const regions = lib.getCountries();
  for (const numberRegion of regions) {
    const sample = lib.getExampleNumber(numberRegion, examples).number;
    for (const defaultRegion of regions) {
      assert.equal(phone.normalize(sample, '+' + lib.getCountryCallingCode(defaultRegion))?.number, sample, `${numberRegion} number / ${defaultRegion} default`);
    }
  }
});

test('WhatsApp modal uses the same global normalization, including foreign international numbers', () => {
  const source = fs.readFileSync(path.join(__dirname,'../assets/js/whatsapp-lead-modal.js'),'utf8');
  const code = source.slice(source.indexOf('  const buildWhatsappParts ='), source.indexOf('  let activeContext ='));
  const fn = vm.runInNewContext(code+'\nbuildWhatsappParts;', {window:{ZhongguPhone:phone}});
  for (const region of lib.getCountries()) {
    const sample = lib.getExampleNumber(region,examples);
    assert.equal(fn('+213',sample.number).whatsapp,sample.number.slice(1),region);
  }
  assert.equal(fn('+964','07701234567').whatsapp,'9647701234567');
  assert.equal(fn('+39','02 3661 8300').whatsapp,'390236618300');
  assert.equal(fn('+1','123').whatsapp,'');
});

test('browser HTML pattern is valid in modern v mode and the built browser shares server rules', () => {
  const pattern = new RegExp('^(?:' + phone.pattern + ')$', 'v');
  assert.equal(pattern.test('123'), false);
  assert.equal(pattern.test('+34 (612) 345-678'), true);
  assert.equal(pattern.test('۰۹۱۲۱۲۳۴۵۶۷'), true);
  const context = vm.createContext({ Intl });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/js/phone-input.js'), 'utf8'), context);
  assert.equal(context.ZhongguPhone.normalize('01012345678', '+20').number, '+201012345678');
  assert.equal(context.ZhongguPhone.normalize('+34 612345678', '+213').number, '+34612345678');
});

test('public generated pages load phone rules before shared scripts and contain no broken old pattern', () => {
  const root = path.join(__dirname, '..');
  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    if (e.name.startsWith('.') || ['node_modules','tmp','admin','ops','data'].includes(e.name)) return [];
    const file = path.join(dir, e.name);
    return e.isDirectory() ? walk(file) : e.name.endsWith('.html') ? [file] : [];
  });
  for (const file of walk(root)) {
    const html = fs.readFileSync(file, 'utf8');
    if (!/<form[^>]+inquiry-form/.test(html)) continue;
    assert.ok(html.includes('/assets/js/phone-input.js'), file);
    assert.ok(!html.includes('[0-9 ()-]{5,20}'), file);
    for (const match of html.matchAll(/<input\b[^>]*name="phone_number"[^>]*>/g)) {
      const value = match[0].match(/pattern="([^"]*)"/)?.[1];
      assert.ok(value, file);
      assert.doesNotThrow(() => new RegExp(value, 'v'), file);
    }
  }
});
