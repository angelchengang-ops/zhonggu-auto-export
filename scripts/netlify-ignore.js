const { execFileSync } = require("child_process");

const relevantPatterns = [
  /^index\.html$/i,
  /^used-cars\.html$/i,
  /^company\.html$/i,
  /^new-cars\.html$/i,
  /^brands\.html$/i,
  /^contact\.html$/i,
  /^export-process\.html$/i,
  /^process\.html$/i,
  /^seo\.html$/i,
  /^vehicle\.html$/i,
  /^lead-gen\.js$/i,
  /^data\/seo-pages\.json$/i,
  /^sitemap\.xml$/i,
  /^robots\.txt$/i,
  /^_redirects$/i,
  /^china-.*\.html$/i,
  /^chinese-.*\.html$/i,
  /^buy-cars-from-china\.html$/i,
  /^export-cars-from-china-.*\.html$/i,
  /^byd-car-exporter-china\.html$/i,
  /^geely-car-exporter-china\.html$/i,
  /^bestune-car-exporter-china\.html$/i,
  /^toyota-used-cars-china\.html$/i,
  /^honda-used-cars-china\.html$/i,
  /^used-.*\.html$/i,
  /^style\.css$/i,
  /^script\.js$/i,
  /^lang\.json$/i,
  /^cars\.json$/i,
  /^grouped-cars\.json$/i,
  /^manual-image-map\.json$/i,
  /^data\/used-cars\.json$/i,
  /^data\/media-config\.json$/i,
  /^images\//i,
  /^videos\//i,
  /^admin\//i,
  /^sw\.js$/i,
  /^service-worker\.js$/i,
  /^netlify\.toml$/i,
  /^_headers$/i,
  /^_redirects$/i,
  /^package\.json$/i,
  /^package-lock\.json$/i
];

const ignoredPatterns = [
  /^README/i,
  /_REPORT\.md$/i,
  /_TODO\.md$/i,
  /\.txt$/i,
  /^COMPANY_.*\.md$/i,
  /^IMAGE_.*\.md$/i,
  /^MEDIA_.*\.md$/i,
  /^OFFICIAL_IMAGE_SOURCES\.md$/i
];

const diffBase = process.env.CACHED_COMMIT_REF;
const diffHead = process.env.COMMIT_REF;

if (!diffBase || !diffHead) {
  process.exit(1);
}

let changedFiles = [];
try {
  const output = execFileSync("git", ["diff", "--name-only", diffBase, diffHead], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  });
  changedFiles = output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
} catch {
  process.exit(1);
}

if (!changedFiles.length) {
  process.exit(0);
}

const isRelevant = (file) => relevantPatterns.some((pattern) => pattern.test(file));
const isIgnored = (file) => ignoredPatterns.some((pattern) => pattern.test(file));

if (changedFiles.some(isRelevant)) {
  process.exit(1);
}

if (changedFiles.every(isIgnored)) {
  process.exit(0);
}

process.exit(1);




