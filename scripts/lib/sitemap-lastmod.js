const isoDate = (value) => {
  const match = String(value || '').match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : '';
};

const resolveLastmod = ({ metadataDate, sourceFile, outputFile }, fileDate) => isoDate(metadataDate) || fileDate(sourceFile) || fileDate(outputFile);
const latestLastmod = (entries) => entries.map((entry) => isoDate(entry.lastmod)).filter(Boolean).sort().at(-1) || '';

module.exports = { isoDate, latestLastmod, resolveLastmod };
