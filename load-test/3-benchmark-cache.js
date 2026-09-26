/**
 * 3-benchmark-cache.js
 * ---------------------------------------------------------
 * Measures your LRU cache's real speedup: same request run
 * once COLD (cache empty / DB hit) and once WARM (cache hit).
 *
 * ⚠️ INTEGRATION REQUIRED — same as script 2:
 *   Edit the import + function call below to match your
 *   actual cache-backed lookup function (e.g., whatever
 *   function your dashboard calls to fetch allocation results,
 *   that internally checks the LRU cache before hitting MySQL).
 *
 * USAGE:
 *   node 3-benchmark-cache.js
 *
 * OUTPUT:
 *   Prints cold time, warm time, and the speedup ratio.
 * ---------------------------------------------------------
 */

const { performance } = require('perf_hooks');

// ---------------------------------------------------------
// STEP 1: IMPORT YOUR ACTUAL CACHE-BACKED LOOKUP FUNCTION
// ---------------------------------------------------------
// This should be whatever function checks the LRU cache first,
// and falls back to a MySQL query on a miss. Example:
//
//   const { getAllocationResult } = require('../Backend/controllers/allocationController');
//   const { lruCache } = require('../Backend/utils/lruCache');
//
// You need a way to CLEAR the cache before the cold run so the
// first call is guaranteed to be a real cache miss. If your
// cache module exports a clear()/reset() method, use it below.
// ---------------------------------------------------------

let getAllocationResult, lruCache;
try {
  ({ getAllocationResult } = require('../Backend/controllers/allocationController'));
  ({ lruCache } = require('../Backend/utils/lruCache')); // adjust path/name
} catch (e) {
  console.error(
    '\n❌ Could not import your cache-backed lookup function or cache module.\n' +
    '   Edit the require() paths at the top of this script.\n' +
    `   (Original error: ${e.message})\n`
  );
  process.exit(1);
}

// A realistic key to query — adjust to whatever your function expects
// (e.g., a student roll number, a block name, etc.)
const TEST_QUERY_KEY = process.argv[2] || 'A'; // e.g., block 'A' occupancy/allocation lookup

(async () => {
  // ---------------------------------------------------------
  // STEP 2: Ensure cache is empty for a fair COLD measurement
  // ---------------------------------------------------------
  if (lruCache && typeof lruCache.clear === 'function') {
    lruCache.clear();
  } else {
    console.warn(
      '⚠️  Could not find a clear()/reset() method on your cache module.\n' +
      '   The "cold" run below may actually hit a warm cache if this\n' +
      '   script or a prior process already populated it.\n' +
      '   Add a clear() method to your LRU cache class if you don\'t have one.\n'
    );
  }

  // ---------------------------------------------------------
  // STEP 3: COLD run (should hit MySQL, not cache)
  // ---------------------------------------------------------
  const coldStart = performance.now();
  const coldResult = await getAllocationResult(TEST_QUERY_KEY);
  const coldTimeMs = performance.now() - coldStart;

  // ---------------------------------------------------------
  // STEP 4: WARM run (same key — should now hit cache)
  // ---------------------------------------------------------
  const warmStart = performance.now();
  const warmResult = await getAllocationResult(TEST_QUERY_KEY);
  const warmTimeMs = performance.now() - warmStart;

  const speedup = coldTimeMs / warmTimeMs;

  console.log('=== CACHE BENCHMARK RESULTS ===');
  console.log(`Query key:        ${TEST_QUERY_KEY}`);
  console.log(`Cold (DB) time:   ${coldTimeMs.toFixed(3)} ms`);
  console.log(`Warm (cache) time:${warmTimeMs.toFixed(3)} ms`);
  console.log(`Speedup:          ${speedup.toFixed(2)}x faster`);
  console.log('================================\n');

  // ---------------------------------------------------------
  // OPTIONAL: repeat over multiple different keys and average
  // (single-key results can be noisy / not representative)
  // ---------------------------------------------------------
  /*
  const testKeys = ['A', 'B', 'C', 'D'];
  const results = [];
  for (const key of testKeys) {
    if (lruCache?.clear) lruCache.clear();
    const c0 = performance.now();
    await getAllocationResult(key);
    const cold = performance.now() - c0;

    const w0 = performance.now();
    await getAllocationResult(key);
    const warm = performance.now() - w0;

    results.push({ key, cold, warm, speedup: cold / warm });
  }
  console.table(results);
  */

  process.exit(0);
})();
