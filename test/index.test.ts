/**
 * Tests for Test Flakiness Detector
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { detectFlakiness } from '../src/index.js';
import type { Config, FlakinessReport } from '../src/index.js';

test('detectFlakiness - basic functionality', async (t) => {
  await t.test('should run test command multiple times', async () => {
    const report = await await detectFlakiness({
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

  await t.test('should detect all failing tests', async () => {
    const report = await await detectFlakiness({
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

  await t.test('should use default runs value of 10', async () => {
    const report = await await detectFlakiness({
      testCommand: 'echo "test"',
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.totalRuns, 10);
    assert.strictEqual(report.runs.length, 10);
  });

  await t.test('should capture stdout and stderr', async () => {
    const report = await await detectFlakiness({
      testCommand: 'echo "stdout output"',
      runs: 1,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.runs.length, 1);
    assert(report.runs[0].stdout.includes('stdout output'));
  });
});

test('detectFlakiness - input validation', async (t) => {
  await t.test('should reject empty test command', async () => {
    const report = await await detectFlakiness({
      testCommand: '',
      runs: 5,
    });

    assert.strictEqual(report.success, false);
    assert(report.error?.includes('Test command must be a non-empty string'));
  });

  await t.test('should reject non-string test command', async () => {
    const report = await await detectFlakiness({
      testCommand: null as unknown as string,
      runs: 5,
    });

    assert.strictEqual(report.success, false);
    assert(report.error?.includes('Test command must be a non-empty string'));
  });

  await t.test('should reject runs less than 1', async () => {
    const report = await await detectFlakiness({
      testCommand: 'echo "test"',
      runs: 0,
    });

    assert.strictEqual(report.success, false);
    assert(report.error?.includes('Runs must be between 1 and 1000'));
  });

  await t.test('should reject runs greater than 1000', async () => {
    const report = await await detectFlakiness({
      testCommand: 'echo "test"',
      runs: 1001,
    });

    assert.strictEqual(report.success, false);
    assert(report.error?.includes('Runs must be between 1 and 1000'));
  });

  await t.test('should accept runs of 1', async () => {
    const report = await await detectFlakiness({
      testCommand: 'echo "test"',
      runs: 1,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.totalRuns, 1);
  });

  await t.test('should accept runs of 1000', async () => {
    const report = await await detectFlakiness({
      testCommand: 'echo "test"',
      runs: 1000,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.totalRuns, 1000);
  });
});

test('detectFlakiness - flaky test detection', async (t) => {
  await t.test('should detect flaky tests with intermittent failures', async () => {
    // Create deterministic flaky test using file counter with proper cleanup
    const tmpDir = join(process.cwd(), 'test', 'tmp');
    mkdirSync(tmpDir, { recursive: true });

    // Use unique filename to avoid conflicts
    const counterFile = join(tmpDir, `counter-${Date.now()}-1.txt`);
    const testScript = join(tmpDir, `test-${Date.now()}-1.sh`);

    // Initialize counter BEFORE test
    writeFileSync(counterFile, '0', 'utf-8');

    writeFileSync(testScript, `#!/bin/bash
COUNT=\$(cat "${counterFile}")
echo $((COUNT + 1)) > "${counterFile}"
# Fail on even counts (0,2,4...), pass on odd (1,3,5...)
exit $(( COUNT % 2 ))
`, { mode: 0o755 });

    const report = await await detectFlakiness({
      testCommand: `bash ${testScript}`,
      runs: 100,
      verbose: false,
    });

    // Clean up
    try {
      rmSync(counterFile);
      rmSync(testScript);
    } catch (err) {
      // Ignore cleanup errors
    }

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.totalRuns, 100);

    // Deterministic: exactly 50 passes (odd counts), 50 fails (even counts)
    assert.strictEqual(report.passedRuns, 50, 'Should have 50 passed runs');
    assert.strictEqual(report.failedRuns, 50, 'Should have 50 failed runs');
    assert.strictEqual(
      report.passedRuns + report.failedRuns,
      100,
      'Total should equal runs'
    );

    // Should detect flakiness
    assert.strictEqual(report.flakyTests.length, 1);
    assert.strictEqual(report.flakyTests[0].testName, 'Test Suite');
    assert.strictEqual(report.flakyTests[0].totalRuns, 100);
    assert.strictEqual(report.flakyTests[0].passed, 50);
    assert.strictEqual(report.flakyTests[0].failed, 50);
    assert.strictEqual(report.flakyTests[0].failureRate, 50);
  });

  await t.test('should calculate correct failure rate', async () => {
    // Create a deterministic test that fails 30% of the time
    const tmpDir = join(process.cwd(), 'test', 'tmp');
    mkdirSync(tmpDir, { recursive: true });

    const counterFile = join(tmpDir, `counter-${Date.now()}-2.txt`);
    const testScript = join(tmpDir, `test-${Date.now()}-2.sh`);

    // Initialize counter
    writeFileSync(counterFile, '0', 'utf-8');

    writeFileSync(testScript, `#!/bin/bash
COUNT=\$(cat "${counterFile}")
echo $((COUNT + 1)) > "${counterFile}"
# Fail first 30 runs (0-29), pass remaining 70 (30-99)
if [ $COUNT -lt 30 ]; then
  exit 1
else
  exit 0
fi
`, { mode: 0o755 });

    const report = await await detectFlakiness({
      testCommand: `bash ${testScript}`,
      runs: 100,
      verbose: false,
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
    assert.strictEqual(failureRate, 30);
    assert.strictEqual(
      failureRate,
      (report.flakyTests[0].failed / 100) * 100
    );
  });
});

test('detectFlakiness - test run results', async (t) => {
  await t.test('should record success for passing tests', async () => {
    const report = await await detectFlakiness({
      testCommand: 'exit 0',
      runs: 2,
    });

    assert.strictEqual(report.runs.length, 2);
    assert.strictEqual(report.runs[0].success, true);
    assert.strictEqual(report.runs[0].exitCode, 0);
    assert.strictEqual(report.runs[1].success, true);
    assert.strictEqual(report.runs[1].exitCode, 0);
  });

  await t.test('should record failure for failing tests', async () => {
    const report = await await detectFlakiness({
      testCommand: 'exit 1',
      runs: 2,
    });

    assert.strictEqual(report.runs.length, 2);
    assert.strictEqual(report.runs[0].success, false);
    assert.strictEqual(report.runs[0].exitCode, 1);
    assert.strictEqual(report.runs[1].success, false);
    assert.strictEqual(report.runs[1].exitCode, 1);
  });

  await t.test('should handle different exit codes', async () => {
    const report = await await detectFlakiness({
      testCommand: 'exit 42',
      runs: 1,
    });

    assert.strictEqual(report.runs[0].success, false);
    assert.strictEqual(report.runs[0].exitCode, 42);
  });
});

test('detectFlakiness - verbose mode', async (t) => {
  await t.test('should run without errors in verbose mode', async () => {
    const report = await await detectFlakiness({
      testCommand: 'echo "test"',
      runs: 3,
      verbose: true,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.totalRuns, 3);
  });
});

test('detectFlakiness - edge cases', async (t) => {
  await t.test('should handle commands with arguments', async () => {
    const report = await await detectFlakiness({
      testCommand: 'echo "hello world"',
      runs: 2,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.totalRuns, 2);
  });

  await t.test('should handle commands with pipes', async () => {
    const report = await await detectFlakiness({
      testCommand: 'echo "test" | grep "test"',
      runs: 2,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.totalRuns, 2);
    assert.strictEqual(report.passedRuns, 2);
  });

  await t.test('should handle long-running commands', async () => {
    const report = await await detectFlakiness({
      testCommand: 'sleep 0.1 && echo "done"',
      runs: 2,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.totalRuns, 2);
  });
});

test('detectFlakiness - error scenarios', async (t) => {
  await t.test('should handle non-existent commands', async () => {
    const report = await await detectFlakiness({
      testCommand: 'nonexistent-command-xyz123',
      runs: 1,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.runs[0].success, false);
    // Command not found typically returns exit code 127
    assert(report.runs[0].exitCode !== 0);
  });

  await t.test('should handle command syntax errors', async () => {
    const report = await await detectFlakiness({
      testCommand: 'echo "unclosed quote',
      runs: 1,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.runs[0].success, false);
  });
});

test('detectFlakiness - configuration interface', async (t) => {
  await t.test('should accept minimal config', async () => {
    const config: Config = {
      testCommand: 'echo "test"',
    };

    const report = await detectFlakiness(config);
    assert.strictEqual(report.success, true);
  });

  await t.test('should accept full config', async () => {
    const config: Config = {
      testCommand: 'echo "test"',
      runs: 5,
      verbose: true,
    };

    const report = await detectFlakiness(config);
    assert.strictEqual(report.success, true);
    assert.strictEqual(report.totalRuns, 5);
  });
});

test('FlakinessReport structure', async (t) => {
  await t.test('should have all required fields', async () => {
    const report = await await detectFlakiness({
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

  await t.test('flaky test should have all required fields', async () => {
    // Create deterministic flaky result
    const tmpDir = join(process.cwd(), 'test', 'tmp');
    mkdirSync(tmpDir, { recursive: true });

    const counterFile = join(tmpDir, `counter-${Date.now()}-3.txt`);
    const testScript = join(tmpDir, `test-${Date.now()}-3.sh`);

    writeFileSync(counterFile, '0', 'utf-8');

    writeFileSync(testScript, `#!/bin/bash
COUNT=\$(cat "${counterFile}")
echo $((COUNT + 1)) > "${counterFile}"
# Fail on even counts, pass on odd counts (50% failure rate)
exit $(( COUNT % 2 ))
`, { mode: 0o755 });

    const report = await await detectFlakiness({
      testCommand: `bash ${testScript}`,
      runs: 50,
    });

    // Clean up
    try {
      rmSync(counterFile);
      rmSync(testScript);
    } catch (err) {
      // Ignore cleanup errors
    }

    assert.strictEqual(report.flakyTests.length, 1);
    const flakyTest = report.flakyTests[0];
    assert.strictEqual(typeof flakyTest.testName, 'string');
    assert.strictEqual(typeof flakyTest.passed, 'number');
    assert.strictEqual(typeof flakyTest.failed, 'number');
    assert.strictEqual(typeof flakyTest.totalRuns, 'number');
    assert.strictEqual(typeof flakyTest.failureRate, 'number');
  });
});
