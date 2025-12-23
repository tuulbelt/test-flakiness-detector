/**
 * Tests for Test Flakiness Detector
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectFlakiness } from '../src/index.js';
import type { Config, FlakinessReport } from '../src/index.js';

test('detectFlakiness - basic functionality', async (t) => {
  await t.test('should run test command multiple times', () => {
    const report = detectFlakiness({
      testCommand: 'echo "test passed"',
      runs: 5,
      verbose: false,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.totalRuns, 5);
    assert.strictEqual(report.passedRuns, 5);
    assert.strictEqual(report.failedRuns, 0);
    assert.strictEqual(report.flakyTests.length, 0);
    assert.strictEqual(report.runs.length, 5);
  });

  await t.test('should detect all failing tests', () => {
    const report = detectFlakiness({
      testCommand: 'exit 1',
      runs: 3,
      verbose: false,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.totalRuns, 3);
    assert.strictEqual(report.passedRuns, 0);
    assert.strictEqual(report.failedRuns, 3);
    assert.strictEqual(report.flakyTests.length, 0); // All fail, not flaky
  });

  await t.test('should use default runs value of 10', () => {
    const report = detectFlakiness({
      testCommand: 'echo "test"',
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.totalRuns, 10);
    assert.strictEqual(report.runs.length, 10);
  });

  await t.test('should capture stdout and stderr', () => {
    const report = detectFlakiness({
      testCommand: 'echo "stdout output"',
      runs: 1,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.runs.length, 1);
    assert(report.runs[0].stdout.includes('stdout output'));
  });
});

test('detectFlakiness - input validation', async (t) => {
  await t.test('should reject empty test command', () => {
    const report = detectFlakiness({
      testCommand: '',
      runs: 5,
    });

    assert.strictEqual(report.success, false);
    assert(report.error?.includes('Test command must be a non-empty string'));
  });

  await t.test('should reject non-string test command', () => {
    const report = detectFlakiness({
      testCommand: null as unknown as string,
      runs: 5,
    });

    assert.strictEqual(report.success, false);
    assert(report.error?.includes('Test command must be a non-empty string'));
  });

  await t.test('should reject runs less than 1', () => {
    const report = detectFlakiness({
      testCommand: 'echo "test"',
      runs: 0,
    });

    assert.strictEqual(report.success, false);
    assert(report.error?.includes('Runs must be between 1 and 1000'));
  });

  await t.test('should reject runs greater than 1000', () => {
    const report = detectFlakiness({
      testCommand: 'echo "test"',
      runs: 1001,
    });

    assert.strictEqual(report.success, false);
    assert(report.error?.includes('Runs must be between 1 and 1000'));
  });

  await t.test('should accept runs of 1', () => {
    const report = detectFlakiness({
      testCommand: 'echo "test"',
      runs: 1,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.totalRuns, 1);
  });

  await t.test('should accept runs of 1000', () => {
    const report = detectFlakiness({
      testCommand: 'echo "test"',
      runs: 1000,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.totalRuns, 1000);
  });
});

test('detectFlakiness - flaky test detection', async (t) => {
  await t.test('should detect flaky tests with intermittent failures', () => {
    // Create a flaky test using a script that randomly fails
    const report = detectFlakiness({
      testCommand: 'node -e "process.exit(Math.random() > 0.5 ? 0 : 1)"',
      runs: 100,
      verbose: false,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.totalRuns, 100);

    // With 100 runs and 50% failure rate, we should have both passes and fails
    // (statistically, it's extremely unlikely to have all passes or all fails)
    assert(report.passedRuns > 0, 'Should have some passed runs');
    assert(report.failedRuns > 0, 'Should have some failed runs');
    assert.strictEqual(
      report.passedRuns + report.failedRuns,
      100,
      'Total should equal runs'
    );

    // Should detect flakiness
    assert.strictEqual(report.flakyTests.length, 1);
    assert.strictEqual(report.flakyTests[0].testName, 'Test Suite');
    assert.strictEqual(report.flakyTests[0].totalRuns, 100);
    assert.strictEqual(report.flakyTests[0].passed, report.passedRuns);
    assert.strictEqual(report.flakyTests[0].failed, report.failedRuns);

    // Failure rate should be between 0 and 100
    const failureRate = report.flakyTests[0].failureRate;
    assert(failureRate > 0 && failureRate < 100);
  });

  await t.test('should calculate correct failure rate', () => {
    // Create a test that fails 30% of the time
    const report = detectFlakiness({
      testCommand: 'node -e "process.exit(Math.random() > 0.7 ? 0 : 1)"',
      runs: 100,
      verbose: false,
    });

    if (report.flakyTests.length > 0) {
      const failureRate = report.flakyTests[0].failureRate;
      assert.strictEqual(
        failureRate,
        (report.flakyTests[0].failed / 100) * 100
      );
    }
  });
});

test('detectFlakiness - test run results', async (t) => {
  await t.test('should record success for passing tests', () => {
    const report = detectFlakiness({
      testCommand: 'exit 0',
      runs: 2,
    });

    assert.strictEqual(report.runs.length, 2);
    assert.strictEqual(report.runs[0].success, true);
    assert.strictEqual(report.runs[0].exitCode, 0);
    assert.strictEqual(report.runs[1].success, true);
    assert.strictEqual(report.runs[1].exitCode, 0);
  });

  await t.test('should record failure for failing tests', () => {
    const report = detectFlakiness({
      testCommand: 'exit 1',
      runs: 2,
    });

    assert.strictEqual(report.runs.length, 2);
    assert.strictEqual(report.runs[0].success, false);
    assert.strictEqual(report.runs[0].exitCode, 1);
    assert.strictEqual(report.runs[1].success, false);
    assert.strictEqual(report.runs[1].exitCode, 1);
  });

  await t.test('should handle different exit codes', () => {
    const report = detectFlakiness({
      testCommand: 'exit 42',
      runs: 1,
    });

    assert.strictEqual(report.runs[0].success, false);
    assert.strictEqual(report.runs[0].exitCode, 42);
  });
});

test('detectFlakiness - verbose mode', async (t) => {
  await t.test('should run without errors in verbose mode', () => {
    const report = detectFlakiness({
      testCommand: 'echo "test"',
      runs: 3,
      verbose: true,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.totalRuns, 3);
  });
});

test('detectFlakiness - edge cases', async (t) => {
  await t.test('should handle commands with arguments', () => {
    const report = detectFlakiness({
      testCommand: 'echo "hello world"',
      runs: 2,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.totalRuns, 2);
  });

  await t.test('should handle commands with pipes', () => {
    const report = detectFlakiness({
      testCommand: 'echo "test" | grep "test"',
      runs: 2,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.totalRuns, 2);
    assert.strictEqual(report.passedRuns, 2);
  });

  await t.test('should handle long-running commands', () => {
    const report = detectFlakiness({
      testCommand: 'sleep 0.1 && echo "done"',
      runs: 2,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.totalRuns, 2);
  });
});

test('detectFlakiness - error scenarios', async (t) => {
  await t.test('should handle non-existent commands', () => {
    const report = detectFlakiness({
      testCommand: 'nonexistent-command-xyz123',
      runs: 1,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.runs[0].success, false);
    // Command not found typically returns exit code 127
    assert(report.runs[0].exitCode !== 0);
  });

  await t.test('should handle command syntax errors', () => {
    const report = detectFlakiness({
      testCommand: 'echo "unclosed quote',
      runs: 1,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.runs[0].success, false);
  });
});

test('detectFlakiness - configuration interface', async (t) => {
  await t.test('should accept minimal config', () => {
    const config: Config = {
      testCommand: 'echo "test"',
    };

    const report = detectFlakiness(config);
    assert.strictEqual(report.success, true);
  });

  await t.test('should accept full config', () => {
    const config: Config = {
      testCommand: 'echo "test"',
      runs: 5,
      verbose: true,
    };

    const report = detectFlakiness(config);
    assert.strictEqual(report.success, true);
    assert.strictEqual(report.totalRuns, 5);
  });
});

test('FlakinessReport structure', async (t) => {
  await t.test('should have all required fields', () => {
    const report = detectFlakiness({
      testCommand: 'echo "test"',
      runs: 1,
    });

    assert.strictEqual(typeof report.success, 'boolean');
    assert.strictEqual(typeof report.totalRuns, 'number');
    assert.strictEqual(typeof report.passedRuns, 'number');
    assert.strictEqual(typeof report.failedRuns, 'number');
    assert(Array.isArray(report.flakyTests));
    assert(Array.isArray(report.runs));
  });

  await t.test('flaky test should have all required fields', () => {
    // Force a flaky result
    const report = detectFlakiness({
      testCommand: 'node -e "process.exit(Math.random() > 0.5 ? 0 : 1)"',
      runs: 50,
    });

    if (report.flakyTests.length > 0) {
      const flakyTest = report.flakyTests[0];
      assert.strictEqual(typeof flakyTest.testName, 'string');
      assert.strictEqual(typeof flakyTest.passed, 'number');
      assert.strictEqual(typeof flakyTest.failed, 'number');
      assert.strictEqual(typeof flakyTest.totalRuns, 'number');
      assert.strictEqual(typeof flakyTest.failureRate, 'number');
    }
  });
});
