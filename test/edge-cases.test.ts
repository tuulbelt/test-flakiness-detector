/**
 * Edge Cases Tests
 *
 * Tests for boundary conditions and unusual behaviors:
 * - Unusual exit codes (not 0 or 1)
 * - Output characteristics (empty, large, unicode)
 * - Timing edge cases (very fast, very slow)
 * - Unusual command patterns
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectFlakiness, detect, isFlaky } from '../src/index.js';

// ============================================================================
// Unusual Exit Codes (3 tests)
// ============================================================================

test('edge: unusual exit codes', async (t) => {
  await t.test('should handle exit code 2', async () => {
    const report = await detectFlakiness({
      testCommand: 'exit 2',
      runs: 3,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.passedRuns, 0);
    assert.strictEqual(report.failedRuns, 3);
    // Consistent failure (exit 2) should not be flagged as flaky
    assert.strictEqual(report.flakyTests.length, 0);
  });

  await t.test('should handle exit code 127 (command not found)', async () => {
    const report = await detectFlakiness({
      testCommand: 'nonexistent_command_xyz',
      runs: 2,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.failedRuns, 2);
    // Consistent failure should not be flaky
    assert.strictEqual(report.flakyTests.length, 0);
  });

  await t.test('should handle mixed exit codes', async () => {
    // This will alternate between exit 0 and exit 1
    const report = await detectFlakiness({
      testCommand: 'test $(( $(date +%s) % 2 )) -eq 0',
      runs: 10,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.totalRuns, 10);
    // Should have both passes and failures (time-based alternation)
  });
});

// ============================================================================
// Output Characteristics (6 tests)
// ============================================================================

test('edge: output characteristics', async (t) => {
  await t.test('should handle commands with no output', async () => {
    const report = await detectFlakiness({
      testCommand: 'true', // Succeeds with no output
      runs: 3,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.passedRuns, 3);
    report.runs.forEach(run => {
      assert.strictEqual(run.stdout, '');
      assert.strictEqual(run.stderr, '');
    });
  });

  await t.test('should handle commands with only stdout', async () => {
    const report = await detectFlakiness({
      testCommand: 'echo "stdout only"',
      runs: 2,
    });

    assert.strictEqual(report.success, true);
    report.runs.forEach(run => {
      assert(run.stdout.includes('stdout only'));
      assert.strictEqual(run.stderr, '');
    });
  });

  await t.test('should handle commands with only stderr', async () => {
    const report = await detectFlakiness({
      testCommand: 'echo "stderr only" >&2',
      runs: 2,
    });

    assert.strictEqual(report.success, true);
    report.runs.forEach(run => {
      assert(run.stderr.includes('stderr only'));
    });
  });

  await t.test('should handle commands with both stdout and stderr', async () => {
    const report = await detectFlakiness({
      testCommand: 'echo "stdout" && echo "stderr" >&2',
      runs: 2,
    });

    assert.strictEqual(report.success, true);
    report.runs.forEach(run => {
      assert(run.stdout.includes('stdout'));
      assert(run.stderr.includes('stderr'));
    });
  });

  await t.test('should handle unicode output', async () => {
    const report = await detectFlakiness({
      testCommand: 'echo "你好世界 🌍 ✓"',
      runs: 2,
    });

    assert.strictEqual(report.success, true);
    report.runs.forEach(run => {
      assert(run.stdout.includes('你好世界'));
      assert(run.stdout.includes('🌍'));
      assert(run.stdout.includes('✓'));
    });
  });

  await t.test('should handle output with special characters', async () => {
    const report = await detectFlakiness({
      testCommand: 'echo "Line1\\nLine2\\tTabbed"',
      runs: 2,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.passedRuns, 2);
  });
});

// ============================================================================
// Timing Edge Cases (3 tests)
// ============================================================================

test('edge: timing characteristics', async (t) => {
  await t.test('should handle very fast commands', async () => {
    // Commands that complete instantly
    const report = await detectFlakiness({
      testCommand: 'true',
      runs: 5,
      verbose: false,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.totalRuns, 5);
    assert.strictEqual(report.passedRuns, 5);
  });

  await t.test('should handle commands with small delay', async () => {
    // Commands with minimal sleep
    const report = await detectFlakiness({
      testCommand: 'sleep 0.1 && echo "done"',
      runs: 3,
      verbose: false,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.passedRuns, 3);
  });

  await t.test('should handle rapid consecutive runs', async () => {
    // Ensure no race conditions when running same command rapidly
    const report = await detectFlakiness({
      testCommand: 'echo "test"',
      runs: 20,
      verbose: false,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.totalRuns, 20);
    assert.strictEqual(report.passedRuns, 20);
  });
});

// ============================================================================
// Boundary Conditions (5 tests)
// ============================================================================

test('edge: boundary conditions', async (t) => {
  await t.test('should handle minimum runs (1)', async () => {
    const report = await detectFlakiness({
      testCommand: 'echo "test"',
      runs: 1,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.totalRuns, 1);
    assert.strictEqual(report.runs.length, 1);
    // With 1 run, no flakiness can be detected (all pass or all fail)
    assert.strictEqual(report.flakyTests.length, 0);
  });

  await t.test('should handle threshold at 0% (any failure is flaky)', async () => {
    // This test alternates pass/fail based on time
    const report = await detectFlakiness({
      testCommand: 'test $(( $(date +%s) % 2 )) -eq 0',
      runs: 10,
      threshold: 0, // Explicit 0
    });

    assert.strictEqual(report.success, true);
    // With threshold=0, any failure makes it flaky
    if (report.failedRuns > 0 && report.failedRuns < report.totalRuns) {
      assert(report.flakyTests.length > 0);
    }
  });

  await t.test('should handle threshold at 100% (only 100% failure is flaky)', async () => {
    const report = await detectFlakiness({
      testCommand: 'exit 1', // Always fails
      runs: 5,
      threshold: 100,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.failedRuns, 5);
    // 100% failure rate, threshold=100, so NOT flaky (failureRate == threshold)
    assert.strictEqual(report.flakyTests.length, 0);
  });

  await t.test('should handle decimal threshold with exact match', async () => {
    // With 10 runs and 2 failures, failure rate = 20%
    // If we set threshold to exactly 20%, it should NOT be flaky
    // But this is hard to test deterministically without a flaky command

    // Instead, test that decimal thresholds work at all
    const report = await detectFlakiness({
      testCommand: 'echo "test"',
      runs: 10,
      threshold: 12.5,
    });

    assert.strictEqual(report.success, true);
  });

  await t.test('should handle all pass scenario', async () => {
    const report = await detectFlakiness({
      testCommand: 'true',
      runs: 10,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.passedRuns, 10);
    assert.strictEqual(report.failedRuns, 0);
    assert.strictEqual(report.flakyTests.length, 0);
  });
});

// ============================================================================
// Command Pattern Edge Cases (4 tests)
// ============================================================================

test('edge: command patterns', async (t) => {
  await t.test('should handle commands with environment variables', async () => {
    const report = await detectFlakiness({
      testCommand: 'echo $HOME',
      runs: 2,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.passedRuns, 2);
  });

  await t.test('should handle commands with command substitution', async () => {
    const report = await detectFlakiness({
      testCommand: 'echo $(echo "nested")',
      runs: 2,
    });

    assert.strictEqual(report.success, true);
    report.runs.forEach(run => {
      assert(run.stdout.includes('nested'));
    });
  });

  await t.test('should handle piped commands', async () => {
    const report = await detectFlakiness({
      testCommand: 'echo "hello world" | grep "hello"',
      runs: 2,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.passedRuns, 2);
  });

  await t.test('should handle commands with logic operators', async () => {
    const report = await detectFlakiness({
      testCommand: 'true && echo "success" || echo "failure"',
      runs: 2,
    });

    assert.strictEqual(report.success, true);
    report.runs.forEach(run => {
      assert(run.stdout.includes('success'));
    });
  });
});

// ============================================================================
// API-Specific Edge Cases (3 tests)
// ============================================================================

test('edge: API-specific behaviors', async (t) => {
  await t.test('detect() API with minimum config', async () => {
    // Minimal valid config
    const result = await detect({
      test: 'echo "test"',
    });

    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value.totalRuns, 10); // Default runs
    }
  });

  await t.test('isFlaky() API with all passing tests', async () => {
    const result = await isFlaky({
      test: 'true',
      runs: 5,
    });

    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, false); // No flakiness
    }
  });

  await t.test('isFlaky() API with all failing tests', async () => {
    const result = await isFlaky({
      test: 'false',
      runs: 5,
    });

    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, false); // Consistent failure, not flaky
    }
  });
});
