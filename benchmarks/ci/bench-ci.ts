#!/usr/bin/env node --import tsx
/**
 * CI Benchmark Script for Test Flakiness Detector
 *
 * Outputs JSON benchmark results for CI regression detection.
 * Results can be compared against baselines to detect performance regressions.
 *
 * Usage:
 *   npm run bench:ci              # Run and output JSON
 *   npm run bench:ci > results.json  # Save results to file
 *   npm run bench:compare         # Compare against baseline
 */

import { bench, group, run } from 'tatami-ng';
import { detect, isFlaky, compileDetector } from '../../src/index.ts';

// ============================================================================
// Test Commands (fast, deterministic for benchmarking)
// ============================================================================

const alwaysPass = 'true'; // Exit 0 (instant pass)
const alwaysFail = 'false'; // Exit 1 (instant fail)

// Prevent Dead Code Elimination
let result: any;

// ============================================================================
// CI Benchmark Suite - Key Scenarios
// ============================================================================

// Core API operations for regression detection
group('ci:detect-api', () => {
  bench('detect:always-pass', async () => {
    result = await detect({ test: alwaysPass, runs: 5 });
  });

  bench('detect:always-fail', async () => {
    result = await detect({ test: alwaysFail, runs: 5 });
  });

  bench('detect:with-threshold', async () => {
    result = await detect({ test: alwaysPass, runs: 5, threshold: 10 });
  });
});

group('ci:isflaky-api', () => {
  bench('isFlaky:always-pass', async () => {
    result = await isFlaky({ test: alwaysPass, runs: 5 });
  });

  bench('isFlaky:always-fail', async () => {
    result = await isFlaky({ test: alwaysFail, runs: 5 });
  });

  bench('isFlaky:with-threshold', async () => {
    result = await isFlaky({ test: alwaysPass, runs: 5, threshold: 10 });
  });
});

group('ci:compile-api', () => {
  bench('compileDetector:create', () => {
    result = compileDetector({ test: alwaysPass });
  });

  bench('compileDetector:run', async () => {
    const detector = compileDetector({ test: alwaysPass });
    result = await detector.run(5);
  });
});

group('ci:runs-scaling', () => {
  bench('detect:5-runs', async () => {
    result = await detect({ test: alwaysPass, runs: 5 });
  });

  bench('detect:10-runs', async () => {
    result = await detect({ test: alwaysPass, runs: 10 });
  });

  bench('detect:20-runs', async () => {
    result = await detect({ test: alwaysPass, runs: 20 });
  });
});

// ============================================================================
// Run with JSON output for CI
// ============================================================================

const results = await run({
  units: false,
  silent: true,   // Suppress console output
  json: true,     // Return JSON object
  samples: 64,    // Fewer samples for faster CI (benchmarks are slow due to test execution)
  time: 500_000_000, // 500ms per benchmark (faster for CI)
  warmup: true,
  latency: true,
  throughput: true,
});

// Output structured JSON for CI consumption
const output = {
  version: '0.4.0',
  timestamp: new Date().toISOString(),
  node: process.version,
  platform: process.platform,
  arch: process.arch,
  results: results,
};

console.log(JSON.stringify(output, null, 2));
