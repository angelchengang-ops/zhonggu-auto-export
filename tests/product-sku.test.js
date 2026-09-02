const test = require('node:test');
const assert = require('node:assert/strict');
const cars = require('../cars.json');
const { productSku } = require('../scripts/lib/product-sku');

test('all catalogue SKUs are unique, stable ASCII identifiers within 50 characters', () => {
  const skus = cars.map(({ id }) => productSku(id));
  assert.equal(new Set(skus).size, skus.length);
  for (const car of cars) {
    const sku = productSku(car.id);
    assert.match(sku, /^ZG-[A-Z0-9-]+$/);
    assert.ok(sku.length <= 50, car.id);
    assert.equal(sku, productSku(car.id));
    if (car.id.length + 3 <= 50) assert.equal(sku, `ZG-${car.id.toUpperCase()}`);
  }
});

test('long IDs with identical prefixes do not collapse to the same SKU', () => {
  const prefix = 'geely-coolray-automatic-super-power-edition-';
  assert.notEqual(productSku(`${prefix}with-sunroof`), productSku(`${prefix}without-sunroof`));
  assert.equal(productSku(`${prefix}with-sunroof`), productSku(`${prefix}with-sunroof`.toUpperCase()));
  for (const id of ['', 'car with spaces', '车型', null]) assert.throws(() => productSku(id));
});
