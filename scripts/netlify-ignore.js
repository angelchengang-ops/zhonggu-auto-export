const { execFileSync } = require('child_process');

const BUILD = 1;
const SKIP = 0;

const buildPatterns = [
  /^_headers$/i,
  /^_redirects$/i,
  /^netlify\.toml$/i,
  /^package(?:-lock)?\.json$/i,
  /^robots\.txt$/i,
  /^sitemap(?:-[a-z0-9-]+)?\.xml$/i,
  /^lang\.json$/i,
  /^cars\.json$/i,
  /^grouped-cars\.json$/i,
  /^manual-image-map\.json$/i,
  /^[^/]+\.html$/i,
  /^landing\/.*\.html$/i,
  /^(?:ar|fa|fr|ru)\/.*\.html$/i,
  /^new-cars\/.*\.html$/i,
  /^assets\//i,
  /^images\//i,
  /^videos\//i,
  /^data\//i,
  /^netlify\/functions\//i,
  /^scripts\/.*\.js$/i,
  /(^|\/)[^/]+\.css$/i,
  /(^|\/)[^/]+\.js$/i
];

const skipPatterns = [
  /^README(?:\..*)?$/i,
  /^docs\//i,
  /^\.agents\//i,
  /^\.codex\//i,
  /\.md$/i,
  /\.txt$/i,
  /_REPORT\.md$/i,
  /_TODO\.md$/i,
  /^COMPANY_.*\.md$/i,
  /^IMAGE_.*\.md$/i,
  /^MEDIA_.*\.md$/i,
  /^OFFICIAL_IMAGE_SOURCES\.md$/i
];

const normalizeFile = (file) => String(file || '').trim().replace(/\\/g, '/').replace(/^\.\//, '');
const isBuildRelevant = (file) => buildPatterns.some((pattern) => pattern.test(file));
const isSkippable = (file) => skipPatterns.some((pattern) => pattern.test(file));

const log = (message) => console.log(`[netlify-ignore] ${message}`);

const testChangedFiles = process.env.NETLIFY_IGNORE_TEST_CHANGED_FILES;
const getTestChangedFiles = () => testChangedFiles
  ? testChangedFiles.split(/\r?\n|,/).map(normalizeFile).filter(Boolean)
  : null;

const diffCommits = (base, head) => {
  const output = execFileSync('git', ['diff', '--name-only', base, head], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  return output.split(/\r?\n/).map(normalizeFile).filter(Boolean);
};

const getChangedFiles = () => {
  const testFiles = getTestChangedFiles();
  if (testFiles) {
    log(`using test changed files: ${testFiles.join(', ') || '(empty)'}`);
    return { files: testFiles, reliable: true, source: 'test-env' };
  }

  const base = process.env.CACHED_COMMIT_REF;
  const head = process.env.COMMIT_REF;

  if (!head) {
    log('COMMIT_REF is unavailable; continuing build.');
    return { files: [], reliable: false, source: 'missing-head' };
  }

  if (!base) {
    log('CACHED_COMMIT_REF is unavailable; continuing build.');
    return { files: [], reliable: false, source: 'missing-base' };
  }

  if (base === head) {
    log('CACHED_COMMIT_REF equals COMMIT_REF; Netlify may be building without cache. Continuing build.');
    return { files: [], reliable: false, source: 'same-ref' };
  }

  try {
    return { files: diffCommits(base, head), reliable: true, source: `${base}..${head}` };
  } catch (error) {
    log(`git diff failed for ${base}..${head}: ${error.message}. Continuing build.`);
    return { files: [], reliable: false, source: 'diff-error' };
  }
};

const { files: changedFiles, reliable, source } = getChangedFiles();

if (!reliable) {
  process.exit(BUILD);
}

if (!changedFiles.length) {
  log(`no changed files from ${source}; continuing build because an empty diff is not a reliable no-op signal.`);
  process.exit(BUILD);
}

const relevantFiles = changedFiles.filter(isBuildRelevant);
if (relevantFiles.length) {
  log(`build required by: ${relevantFiles.slice(0, 20).join(', ')}${relevantFiles.length > 20 ? ', ...' : ''}`);
  process.exit(BUILD);
}

const unknownFiles = changedFiles.filter((file) => !isSkippable(file));
if (unknownFiles.length) {
  log(`build required by conservative fallback for: ${unknownFiles.slice(0, 20).join(', ')}${unknownFiles.length > 20 ? ', ...' : ''}`);
  process.exit(BUILD);
}

log(`skipping build; only non-production files changed: ${changedFiles.join(', ')}`);
process.exit(SKIP);
