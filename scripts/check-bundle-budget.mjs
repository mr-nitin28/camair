import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const BUDGET_KB = 200; // Master Prompt Section 8 & 16 limit (<= 200 kB First Load JS gzipped)
const BUDGET_BYTES = BUDGET_KB * 1024;

const appManifestPath = path.resolve('.next/app-build-manifest.json');
if (!fs.existsSync(appManifestPath)) {
  console.error('Error: .next/app-build-manifest.json not found. Run "npm run build" first.');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(appManifestPath, 'utf8'));
const pages = manifest.pages;

console.log('='.repeat(75));
console.log(` CampusOS Bundle Budget Verification (Limit: <= ${BUDGET_KB} kB First Load JS, gzipped)`);
console.log('='.repeat(75));

let hasFailure = false;
const routeSizes = [];

// Base layout chunks shared by all
const rootLayoutChunks = pages['/layout'] || [];

// Cache gzipped sizes of chunks to avoid recalculating
const chunkGzipCache = new Map();

function getChunkGzipSize(chunkPath) {
  if (chunkGzipCache.has(chunkPath)) return chunkGzipCache.get(chunkPath);
  const fullChunkPath = path.resolve('.next', chunkPath);
  if (!fs.existsSync(fullChunkPath)) return 0;
  const content = fs.readFileSync(fullChunkPath);
  const gzipped = zlib.gzipSync(content);
  const size = gzipped.length;
  chunkGzipCache.set(chunkPath, size);
  return size;
}

for (const [pagePath, chunks] of Object.entries(pages)) {
  if (pagePath === '/layout' || pagePath.endsWith('/layout')) continue;

  const allChunks = new Set([...rootLayoutChunks, ...chunks]);
  let totalGzipBytes = 0;

  for (const chunk of allChunks) {
    if (!chunk.endsWith('.js')) continue;
    totalGzipBytes += getChunkGzipSize(chunk);
  }

  const kb = totalGzipBytes / 1024;
  const status = totalGzipBytes <= BUDGET_BYTES ? 'PASS' : 'FAIL';
  if (totalGzipBytes > BUDGET_BYTES) hasFailure = true;

  routeSizes.push({
    route: pagePath.replace(/\/page$/, '') || '/',
    bytes: totalGzipBytes,
    kb: kb.toFixed(1),
    status,
  });
}

// Sort alphabetically by route
routeSizes.sort((a, b) => a.route.localeCompare(b.route));

console.log(
  'Route'.padEnd(36) +
  'First Load JS'.padEnd(16) +
  'Budget'.padEnd(12) +
  'Status'
);
console.log('-'.repeat(75));

for (const r of routeSizes) {
  const statusIcon = r.status === 'PASS' ? '✅ PASS' : '❌ FAIL';
  console.log(
    r.route.padEnd(36) +
    `${r.kb} kB`.padEnd(16) +
    `<= ${BUDGET_KB} kB`.padEnd(12) +
    statusIcon
  );
}

console.log('='.repeat(75));
if (hasFailure) {
  console.error(`❌ Budget Check FAILED: One or more routes exceeded ${BUDGET_KB} kB.`);
  process.exit(1);
} else {
  console.log(`✅ All ${routeSizes.length} routes strictly comply with the <= ${BUDGET_KB} kB First Load JS budget.`);
  process.exit(0);
}
