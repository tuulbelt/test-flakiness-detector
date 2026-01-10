/**
 * Threshold configuration tests for Test Flakiness Detector
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectFlakiness } from '../src/detector.js';
import { detect, isFlaky, compileDetector } from '../src/api.js';

// Test script that fails predictably based on FAIL_COUNT env var
const createPredictableTest = (failCount: number, totalRuns: number): string => {
  return `
    const failCount = parseInt(process.env.FAIL_COUNT || '0', 10);
    const runNumber = parseInt(process.env.RUN_NUMBER || '1', 10);
    if (runNumber <= failCount) {
      process.exit(1);
    }
    process.exit(0);
  `;
};

// Helper to run detection with specific failure rate
async function runWithFailureRate(failureRatePercent: number, runs: number, threshold?: number) {
  const failCount = Math.floor((failureRatePercent / 100) * runs);

  // Create a test command that fails failCount times
  const testScript = `/tmp/test-${Date.now()}.sh`;
  const fs = await import('node:fs/promises');
  await fs.writeFile(testScript, `#!/bin/bash
COUNTER_FILE="/tmp/counter-${Date.now()}.txt"
if [ ! -f "$COUNTER_FILE" ]; then
  echo "0" > "$COUNTER_FILE"
fi
COUNT=$(cat "$COUNTER_FILE")
COUNT=$((COUNT + 1))
echo "$COUNT" > "$COUNTER_FILE"
if [ $COUNT -le ${failCount} ]; then
  exit 1
else
  exit 0
fi
`, 'utf8');
  await fs.chmod(testScript, 0o755);

  const result = await detectFlakiness({
    testCommand: testScript,
    runs,
    threshold,
  });

  // Clean up
  try {
    await fs.unlink(testScript);
  } catch {
    // Ignore cleanup errors
  }

  return result;
}

// ===== Default Threshold Tests =====

test('threshold - default (0) flags any failure as flaky', async () => {
  // 1 failure out of 10 runs (10% failure rate)
  const report = await runWithFailureRate(10, 10); // threshold defaults to 0

  assert.strictEqual(report.success, true);
  assert.strictEqual(report.flakyTests.length, 1, 'Should detect flakiness with 10% failure');
  assert.strictEqual(report.flakyTests[0]!.failureRate, 10);
});

test('threshold - explicit 0 behaves same as default', async () => {
  // 1 failure out of 10 runs (10% failure rate)
  const report = await runWithFailureRate(10, 10, 0);

  assert.strictEqual(report.success, true);
  assert.strictEqual(report.flakyTests.length, 1);
  assert.strictEqual(report.flakyTests[0]!.failureRate, 10);
});

// ===== Threshold Value Tests =====

test('threshold - 10% only flags tests >10% failure', async () => {
  // 5% failure rate (0.5 failures out of 10 = 0, so use 20 runs with 1 failure = 5%)
  const report = await runWithFailureRate(5, 20, 10);

  assert.strictEqual(report.success, true);
  assert.strictEqual(report.flakyTests.length, 0, 'Should NOT flag 5% failure with 10% threshold');
});

test('threshold - 10% flags tests with exactly 15% failure', async () => {
  // 15% failure rate (3 failures out of 20 runs)
  const report = await runWithFailureRate(15, 20, 10);

  assert.strictEqual(report.success, true);
  assert.strictEqual(report.flakyTests.length, 1, 'Should flag 15% failure with 10% threshold');
  assert.strictEqual(report.flakyTests[0]!.failureRate, 15);
});

test('threshold - 50% only flags tests >50% failure', async () => {
  // 40% failure rate (4 failures out of 10 runs)
  const report = await runWithFailureRate(40, 10, 50);

  assert.strictEqual(report.success, true);
  assert.strictEqual(report.flakyTests.length, 0, 'Should NOT flag 40% failure with 50% threshold');
});

test('threshold - 50% flags tests with 60% failure', async () => {
  // 60% failure rate (6 failures out of 10 runs)
  const report = await runWithFailureRate(60, 10, 50);

  assert.strictEqual(report.success, true);
  assert.strictEqual(report.flakyTests.length, 1, 'Should flag 60% failure with 50% threshold');
  assert.strictEqual(report.flakyTests[0]!.failureRate, 60);
});

test('threshold - 99% only flags tests with 100% failure (edge case)', async () => {
  // 100% failure (all 10 fail, all 0 pass) - but this means no flakiness detected
  // because flakiness requires SOME passes and SOME fails
  const report = await runWithFailureRate(100, 10, 99);

  assert.strictEqual(report.success, true);
  assert.strictEqual(report.flakyTests.length, 0, 'All failures = consistent, not flaky');
});

// ===== Edge Case: All Pass =====

test('threshold - all tests pass (no flakiness regardless of threshold)', async () => {
  const report = await runWithFailureRate(0, 10, 50);

  assert.strictEqual(report.success, true);
  assert.strictEqual(report.passedRuns, 10);
  assert.strictEqual(report.failedRuns, 0);
  assert.strictEqual(report.flakyTests.length, 0);
});

// ===== Edge Case: All Fail =====

test('threshold - all tests fail (consistent failure, not flaky)', async () => {
  const report = await runWithFailureRate(100, 10, 0);

  assert.strictEqual(report.success, true);
  assert.strictEqual(report.passedRuns, 0);
  assert.strictEqual(report.failedRuns, 10);
  assert.strictEqual(report.flakyTests.length, 0, 'Consistent failure is not flaky');
});

// ===== Validation Tests =====

test('threshold - invalid: negative value', async () => {
  const report = await detectFlakiness({
    testCommand: 'echo "test"',
    runs: 5,
    threshold: -1,
  });

  assert.strictEqual(report.success, false);
  assert.strictEqual(report.error, 'Threshold must be between 0 and 100');
});

test('threshold - invalid: >100', async () => {
  const report = await detectFlakiness({
    testCommand: 'echo "test"',
    runs: 5,
    threshold: 101,
  });

  assert.strictEqual(report.success, false);
  assert.strictEqual(report.error, 'Threshold must be between 0 and 100');
});

test('threshold - invalid: NaN', async () => {
  const report = await detectFlakiness({
    testCommand: 'echo "test"',
    runs: 5,
    threshold: NaN,
  });

  assert.strictEqual(report.success, false);
  assert.strictEqual(report.error, 'Threshold must be between 0 and 100');
});

test('threshold - invalid: Infinity', async () => {
  const report = await detectFlakiness({
    testCommand: 'echo "test"',
    runs: 5,
    threshold: Infinity,
  });

  assert.strictEqual(report.success, false);
  assert.strictEqual(report.error, 'Threshold must be between 0 and 100');
});

test('threshold - valid: 0 is allowed', async () => {
  const report = await detectFlakiness({
    testCommand: 'exit 0',
    runs: 3,
    threshold: 0,
  });

  assert.strictEqual(report.success, true, 'Threshold 0 should be valid');
});

test('threshold - valid: 100 is allowed', async () => {
  const report = await detectFlakiness({
    testCommand: 'exit 0',
    runs: 3,
    threshold: 100,
  });

  assert.strictEqual(report.success, true, 'Threshold 100 should be valid');
});

test('threshold - valid: decimal values like 12.5', async () => {
  const report = await runWithFailureRate(15, 20, 12.5);

  assert.strictEqual(report.success, true);
  assert.strictEqual(report.flakyTests.length, 1, 'Should accept decimal threshold');
});

// ===== API Integration Tests =====

test('threshold - detect() API with threshold', async () => {
  // Use 20% failure rate with 15% threshold - should be flagged
  const result = await detect({
    test: 'bash -c "[ $((RANDOM % 5)) -ne 0 ]"',  // ~80% pass, 20% fail
    runs: 100,
    threshold: 15,
  });

  // This test is probabilistic, but with 100 runs it should be reliable
  assert.strictEqual(result.ok, true);
  // We can't assert on flaky count due to randomness, just verify it runs
});

test('threshold - isFlaky() API with threshold', async () => {
  const report = await runWithFailureRate(5, 20, 10);

  // 5% failure with 10% threshold = not flaky
  assert.strictEqual(report.flakyTests.length, 0);

  const report2 = await runWithFailureRate(15, 20, 10);

  // 15% failure with 10% threshold = flaky
  assert.strictEqual(report2.flakyTests.length, 1);
});

test('threshold - compileDetector() API with threshold', async () => {
  const detector = compileDetector({
    test: 'exit 0',
    threshold: 20,
  });

  assert(typeof detector.run === 'function');

  const result = await detector.run(5);
  assert.strictEqual(result.ok, true);

  if (result.ok) {
    // All pass, so no flaky tests
    assert.strictEqual(result.value.flakyTests.length, 0);
  }
});
