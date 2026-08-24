const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('BMW canonical URL redirects the .html variant and rewrites the extensionless URL', () => {
  const redirects = fs.readFileSync(path.join(__dirname, '..', '_redirects'), 'utf8');
  const redirect = '/new-cars/2024-bmw-x1-xdrive25li-awd-horgos.html /new-cars/2024-bmw-x1-xdrive25li-awd-horgos 301!';
  const rewrite = '/new-cars/2024-bmw-x1-xdrive25li-awd-horgos /new-cars/2024-bmw-x1-xdrive25li-awd-horgos.html 200!';
  assert.ok(redirects.includes(redirect));
  assert.ok(redirects.includes(rewrite));
  assert.ok(redirects.indexOf(redirect) < redirects.indexOf(rewrite));
});
