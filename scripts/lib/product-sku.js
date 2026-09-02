const { createHash } = require('node:crypto');

// Preserve existing valid identifiers; only shorten identifiers that exceed 50
// characters. The hash retains uniqueness when long IDs share the same prefix.
function productSku(id) {
  if (typeof id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(id)) {
    throw new Error('Product SKU requires a non-empty ASCII vehicle ID');
  }
  const legacy = `ZG-${id.toUpperCase()}`;
  if (legacy.length <= 50) return legacy;
  const suffix = createHash('sha256').update(id.toLowerCase()).digest('hex').slice(0, 16).toUpperCase();
  return `${legacy.slice(0, 33).replace(/-+$/, '')}-${suffix}`;
}

module.exports = { productSku };
