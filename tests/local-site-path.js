const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const rewrites = new Map(fs.readFileSync(path.join(root, '_redirects'), 'utf8')
  .split(/\r?\n/)
  .map(line => line.trim().split(/\s+/))
  .filter(([from, to, status]) => /^200!?$/.test(status) && /^\/[\w./-]+$/.test(from) && /^\/[\w./-]+$/.test(to))
  .map(([from, to]) => [from, to]));

module.exports = function localSitePath(href) {
  const route = rewrites.get(href) || href;
  return path.join(root, route.endsWith('/') ? route + 'index.html' : route);
};
