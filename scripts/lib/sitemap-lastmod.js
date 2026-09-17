const isoDate = (value) => {
  const match = String(value || '').match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : '';
};

const resolveLastmod = ({ metadataDate, sourceFile, outputFile }, fileDate) => isoDate(metadataDate) || fileDate(sourceFile) || fileDate(outputFile);
const latestLastmod = (entries) => entries.map((entry) => isoDate(entry.lastmod)).filter(Boolean).sort().at(-1) || '';

// Asset cache keys and line endings do not constitute an editorial update.
const sameEditorialHtml = (left, right) => {
  const normalize = (html) => String(html).replace(/\r\n/g, '\n').replace(/(\.(?:css|js)\?v=)[a-f0-9]+/gi, '$1VERSION').trim();
  return normalize(left) === normalize(right);
};

module.exports = { isoDate, latestLastmod, resolveLastmod, sameEditorialHtml };
