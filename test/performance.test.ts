/**
 * Performance Tests for Test Flakiness Detector
 *
 * Benchmarks and performance validation
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { detectFlakiness } from '../src/index.js';

test('performance - execution speed', async (t) => {
  await t.test('should complete 10 runs in under 2 seconds', () => {
    const start = performance.now();

    const report = detectFlakiness({
      testCommand: 'echo "test"',
      runs: 10,
    });

    const elapsed = performance.now() - start;

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.totalRuns, 10);
    assert(elapsed < 2000, `Took ${elapsed}ms, should be < 2000ms`);
  });

  await t.test('should complete 100 runs in under 15 seconds', () => {
    const start = performance.now();

    const report = detectFlakiness({
      testCommand: 'echo "test"',
      runs: 100,
    });

    const elapsed = performance.now() - start;

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.totalRuns, 100);
    assert(elapsed < 15000, `Took ${elapsed}ms, should be < 15000ms`);
  });

  await t.test('should handle maximum 1000 runs', () => {
    const start = performance.now();

    const report = detectFlakiness({
      testCommand: 'echo "test"',
      runs: 1000,
    });

    const elapsed = performance.now() - start;

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.totalRuns, 1000);

    // Should complete (no timeout/hang)
    assert(elapsed < 120000, `Took ${elapsed}ms, should complete within 2 minutes`);
  });
});

test('performance - memory usage', async (t) => {
  await t.test('should not leak memory with many runs', () => {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const initialMemory = process.memoryUsage().heapUsed;

    // Run detection multiple times
    for (let i = 0; i < 10; i++) {
      detectFlakiness({
        testCommand: 'echo "test"',
        runs: 100,
      });
    }

    if (global.gc) {
      global.gc();
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const growth = finalMemory - initialMemory;
    const growthMB = growth / (1024 * 1024);

    // Memory growth should be reasonable (< 100MB for 1000 total runs)
    assert(
      growthMB < 100,
      `Memory grew by ${growthMB.toFixed(2)}MB, should be < 100MB`
    );
  });

  await t.test('should handle large output without excessive memory', () => {
    const initialMemory = process.memoryUsage().heapUsed;

    const report = detectFlakiness({
      testCommand: `node -e "for(let i=0; i<10000; i++) console.log('test line' + i)"`,
      runs: 10,
    });

    const finalMemory = process.memoryUsage().heapUsed;
    const growth = finalMemory - initialMemory;
    const growthMB = growth / (1024 * 1024);

    assert.strictEqual(report.success, true);

    // Should not use excessive memory (< 50MB for large output)
    assert(
      growthMB < 50,
      `Memory grew by ${growthMB.toFixed(2)}MB, should be < 50MB`
    );
  });
});

test('performance - scalability', async (t) => {
  await t.test('should scale linearly with number of runs', () => {
    const times: number[] = [];
    const runCounts = [10, 20, 40, 80];

    for (const runs of runCounts) {
      const start = performance.now();

      detectFlakiness({
        testCommand: 'echo "test"',
        runs,
      });

      const elapsed = performance.now() - start;
      times.push(elapsed);
    }

    // Check that execution time scales roughly linearly
    // time[1] / time[0] should be close to runCounts[1] / runCounts[0]
    const ratio10to20 = times[1] / times[0];
    const ratio20to40 = times[2] / times[1];
    const ratio40to80 = times[3] / times[2];

    // Ratios should be close to 2 (within reasonable tolerance)
    assert(ratio10to20 > 1.5 && ratio10to20 < 3, `Ratio 10->20 runs: ${ratio10to20.toFixed(2)}`);
    assert(ratio20to40 > 1.5 && ratio20to40 < 3, `Ratio 20->40 runs: ${ratio20to40.toFixed(2)}`);
    assert(ratio40to80 > 1.5 && ratio40to80 < 3, `Ratio 40->80 runs: ${ratio40to80.toFixed(2)}`);
  });

  await t.test('should handle fast-failing tests efficiently', () => {
    const start = performance.now();

    const report = detectFlakiness({
      testCommand: 'exit 1',
      runs: 100,
    });

    const elapsed = performance.now() - start;

    assert.strictEqual(report.failedRuns, 100);

    // Fast-failing tests should complete quickly
    assert(elapsed < 10000, `Took ${elapsed}ms, should be < 10000ms`);
  });
});

test('performance - resource limits', async (t) => {
  await t.test('should respect maximum runs limit', () => {
    const report = detectFlakiness({
      testCommand: 'echo "test"',
      runs: 1000, // Maximum allowed
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.totalRuns, 1000);
  });

  await t.test('should handle maximum buffer size (10MB)', () => {
    // Generate ~5MB of output per run
    const report = detectFlakiness({
      testCommand: `node -e "console.log('x'.repeat(5 * 1024 * 1024))"`,
      runs: 2,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.totalRuns, 2);

    // Verify output was captured (should be ~5MB each)
    assert(report.runs[0].stdout.length > 4 * 1024 * 1024);
    assert(report.runs[1].stdout.length > 4 * 1024 * 1024);
  });
});

test('performance - concurrent-like behavior', async (t) => {
  await t.test('should maintain consistent performance across runs', () => {
    const timings: number[] = [];

    // Run detection 5 times and measure consistency
    for (let i = 0; i < 5; i++) {
      const start = performance.now();

      detectFlakiness({
        testCommand: 'echo "test"',
        runs: 20,
      });

      const elapsed = performance.now() - start;
      timings.push(elapsed);
    }

    // Calculate average and standard deviation
    const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
    const variance = timings.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / timings.length;
    const stdDev = Math.sqrt(variance);

    // Standard deviation should be reasonable (< 50% of average)
    const coefficientOfVariation = stdDev / avg;
    assert(
      coefficientOfVariation < 0.5,
      `Performance varies too much: ${(coefficientOfVariation * 100).toFixed(1)}% coefficient of variation`
    );
  });
});

test('performance - report generation', async (t) => {
  await t.test('should generate reports quickly even with many runs', () => {
    const start = performance.now();

    // Use a simple deterministic test (all pass)
    const report = detectFlakiness({
      testCommand: 'exit 0',
      runs: 100,
    });

    const elapsed = performance.now() - start;

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.runs.length, 100);

    // Report should include all runs
    assert.strictEqual(report.totalRuns, 100);
    assert.strictEqual(report.passedRuns + report.failedRuns, 100);

    // Should complete in reasonable time
    assert(elapsed < 30000, `Took ${elapsed}ms, should be < 30000ms`);
  });

  await t.test('should calculate failure rates accurately', () => {
    // Create deterministic flaky test (50% failure rate)
    const tmpDir = join(process.cwd(), 'test', 'tmp');
    mkdirSync(tmpDir, { recursive: true });

    const counterFile = join(tmpDir, `counter-${Date.now()}-perf1.txt`);
    const testScript = join(tmpDir, `test-${Date.now()}-perf1.sh`);

    writeFileSync(counterFile, '0', 'utf-8');

    writeFileSync(testScript, `#!/bin/bash
COUNT=\$(cat "${counterFile}")
echo $((COUNT + 1)) > "${counterFile}"
# Fail on even counts, pass on odd counts (50% failure rate)
exit $(( COUNT % 2 ))
`, { mode: 0o755 });

    const report = detectFlakiness({
      testCommand: `bash ${testScript}`,
      runs: 100,
    });

    // Clean up
    try {
      rmSync(counterFile);
      rmSync(testScript);
    } catch (err) {
      // Ignore cleanup errors
    }

    assert.strictEqual(report.flakyTests.length, 1);
    const failureRate = report.flakyTests[0].failureRate;

    // Failure rate should be calculated correctly
    const expectedRate = (report.failedRuns / report.totalRuns) * 100;
    assert.strictEqual(failureRate, expectedRate);

    // Deterministic: exactly 50% failure rate
    assert.strictEqual(failureRate, 50);
  });
});

test('performance - edge case performance', async (t) => {
  await t.test('should handle minimum runs (1) instantly', () => {
    const start = performance.now();

    const report = detectFlakiness({
      testCommand: 'echo "test"',
      runs: 1,
    });

    const elapsed = performance.now() - start;

    assert.strictEqual(report.totalRuns, 1);
    assert(elapsed < 500, `Took ${elapsed}ms, should be < 500ms for single run`);
  });

  await t.test('should handle empty command output efficiently', () => {
    const start = performance.now();

    const report = detectFlakiness({
      testCommand: 'true', // No output
      runs: 50,
    });

    const elapsed = performance.now() - start;

    assert.strictEqual(report.passedRuns, 50);
    assert(elapsed < 5000, `Took ${elapsed}ms, should be < 5000ms`);
  });

  await t.test('should handle commands with minimal output', () => {
    const start = performance.now();

    const report = detectFlakiness({
      testCommand: 'echo "x"',
      runs: 100,
    });

    const elapsed = performance.now() - start;

    assert.strictEqual(report.passedRuns, 100);

    // Minimal output should be fast
    assert(elapsed < 10000, `Took ${elapsed}ms, should be < 10000ms`);
  });
});

test('performance - benchmarks summary', () => {
  // This test documents expected performance characteristics
  const benchmarks = {
    runs10: { maxTime: 2000, description: '10 runs should complete in <2s' },
    runs100: { maxTime: 15000, description: '100 runs should complete in <15s' },
    runs1000: { maxTime: 120000, description: '1000 runs should complete in <2min' },
    memoryGrowth: { maxMB: 100, description: 'Memory growth <100MB for 1000 runs' },
    singleRun: { maxTime: 500, description: 'Single run <500ms' },
  };

  // Document benchmarks in test output
  console.log('\nPerformance Benchmarks:');
  Object.entries(benchmarks).forEach(([key, value]) => {
    if ('maxTime' in value) {
      console.log(`  ${value.description}`);
    } else if ('maxMB' in value) {
      console.log(`  ${value.description}`);
    }
  });

  assert.strictEqual(true, true); // Always pass, just for documentation
});
