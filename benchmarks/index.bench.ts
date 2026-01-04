#!/usr/bin/env node --import tsx
/**
 * Test Flakiness Detector Benchmarks
 *
 * Measures performance of core operations using tatami-ng for statistical rigor.
 *
 * Run: npm run bench
 *
 * See: /docs/BENCHMARKING_STANDARDS.md
 */

import { bench, baseline, group, run } from 'tatami-ng';
import { parseTestOutput, analyzeFlakiness, FlakinessSummary } from '../src/index.ts';

// Prevent dead code elimination
let result: FlakinessSummary | string[] | any;

// Sample test outputs for benchmarking
const smallOutput = `
TAP version 13
ok 1 - test should pass
ok 2 - another test
# tests 2
# pass 2
`;

const mediumOutput = Array.from({ length: 50 }, (_, i) =>
  `ok ${i + 1} - test case ${i + 1}`
).join('\n') + '\n# tests 50\n# pass 50';

const largeOutput = Array.from({ length: 500 }, (_, i) =>
  `ok ${i + 1} - test case ${i + 1}`
).join('\n') + '\n# tests 500\n# pass 500';

const flakyRuns = [
  { passed: true, output: smallOutput },
  { passed: false, output: smallOutput.replace('ok 1', 'not ok 1') },
  { passed: true, output: smallOutput },
  { passed: false, output: smallOutput.replace('ok 2', 'not ok 2') },
  { passed: true, output: smallOutput },
];

// ============================================================================
// Core Operations Benchmarks
// ============================================================================

group('Output Parsing', () => {
  baseline('parse: small output (2 tests)', () => {
    result = parseTestOutput(smallOutput);
  });

  bench('parse: medium output (50 tests)', () => {
    result = parseTestOutput(mediumOutput);
  });

  bench('parse: large output (500 tests)', () => {
    result = parseTestOutput(largeOutput);
  });
});

group('Flakiness Analysis', () => {
  baseline('analyze: 5 runs (mixed results)', () => {
    result = analyzeFlakiness(flakyRuns);
  });

  bench('analyze: 10 stable runs', () => {
    const stableRuns = Array.from({ length: 10 }, () => ({
      passed: true,
      output: smallOutput,
    }));
    result = analyzeFlakiness(stableRuns);
  });

  bench('analyze: 20 runs (some failures)', () => {
    const mixedRuns = Array.from({ length: 20 }, (_, i) => ({
      passed: i % 4 !== 0,
      output: i % 4 !== 0 ? smallOutput : smallOutput.replace('ok 1', 'not ok 1'),
    }));
    result = analyzeFlakiness(mixedRuns);
  });
});

// ============================================================================
// Run Benchmarks
// ============================================================================

await run({
  units: false,
  silent: false,
  json: false,
});
