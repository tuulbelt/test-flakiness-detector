/**
 * Unit tests for multi-tier API (detect, isFlaky, compileDetector)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detect, isFlaky, compileDetector } from '../src/index.js';

/**
 * Helper: Create a test command that succeeds
 */
const successCommand = 'echo "test passed"';

/**
 * Helper: Create a test command that fails
 */
const failCommand = 'exit 1';

/**
 * Helper: Create a flaky test command (alternates pass/fail using file counter)
 */
function createFlakyCommand(): string {
  const counterFile = `/tmp/flaky-counter-${Date.now()}-${Math.random()}.txt`;
  return `bash -c 'if [ ! -f ${counterFile} ]; then echo 0 > ${counterFile}; fi; COUNT=$(cat ${counterFile}); echo $((COUNT + 1)) > ${counterFile}; [ $((COUNT % 2)) -eq 0 ]'`;
}

// ============================================================================
// detect() API Tests
// ============================================================================

test('detect() - successful tests (all pass)', async () => {
  const result = await detect({
    test: successCommand,
    runs: 3,
    verbose: false,
  });

  assert(result.ok, 'Result should be ok');
  if (result.ok) {
    const report = result.value;
    assert.strictEqual(report.success, true, 'Report should succeed');
    assert.strictEqual(report.totalRuns, 3, 'Should run 3 times');
    assert.strictEqual(report.passedRuns, 3, 'All runs should pass');
    assert.strictEqual(report.failedRuns, 0, 'No runs should fail');
    assert.strictEqual(report.flakyTests.length, 0, 'No flaky tests');
  }
});

test('detect() - failing tests (all fail)', async () => {
  const result = await detect({
    test: failCommand,
    runs: 3,
    verbose: false,
  });

  assert(result.ok, 'Result should be ok');
  if (result.ok) {
    const report = result.value;
    assert.strictEqual(report.success, true, 'Report should succeed');
    assert.strictEqual(report.totalRuns, 3, 'Should run 3 times');
    assert.strictEqual(report.passedRuns, 0, 'No runs should pass');
    assert.strictEqual(report.failedRuns, 3, 'All runs should fail');
    assert.strictEqual(report.flakyTests.length, 0, 'No flaky tests (all fail)');
  }
});

test('detect() - flaky tests (some pass, some fail)', async () => {
  const flakyCmd = createFlakyCommand();
  const result = await detect({
    test: flakyCmd,
    runs: 4, // Even number to ensure balance
    verbose: false,
  });

  assert(result.ok, 'Result should be ok');
  if (result.ok) {
    const report = result.value;
    assert.strictEqual(report.success, true, 'Report should succeed');
    assert.strictEqual(report.totalRuns, 4, 'Should run 4 times');
    assert(report.passedRuns > 0, 'Some runs should pass');
    assert(report.failedRuns > 0, 'Some runs should fail');
    assert.strictEqual(report.flakyTests.length, 1, 'Should detect flaky test');
    assert.strictEqual(report.flakyTests[0]!.testName, 'Test Suite');
    assert(report.flakyTests[0]!.failureRate > 0);
    assert(report.flakyTests[0]!.failureRate < 100);
  }
});

test('detect() - invalid test command (empty)', async () => {
  const result = await detect({
    test: '',
    runs: 5,
  });

  assert.strictEqual(result.ok, false, 'Result should be error');
  if (!result.ok) {
    assert.match(result.error.message, /non-empty string/i);
  }
});

test('detect() - invalid runs (too low)', async () => {
  const result = await detect({
    test: successCommand,
    runs: 0,
  });

  assert.strictEqual(result.ok, false, 'Result should be error');
  if (!result.ok) {
    assert.match(result.error.message, /between 1 and 1000/i);
  }
});

test('detect() - invalid runs (too high)', async () => {
  const result = await detect({
    test: successCommand,
    runs: 1001,
  });

  assert.strictEqual(result.ok, false, 'Result should be error');
  if (!result.ok) {
    assert.match(result.error.message, /between 1 and 1000/i);
  }
});

test('detect() - invalid runs (not a number)', async () => {
  const result = await detect({
    test: successCommand,
    runs: NaN,
  });

  assert.strictEqual(result.ok, false, 'Result should be error');
  if (!result.ok) {
    assert.match(result.error.message, /between 1 and 1000/i);
  }
});

test('detect() - default runs (10)', async () => {
  const result = await detect({
    test: successCommand,
    // runs not specified, should default to 10
  });

  assert(result.ok, 'Result should be ok');
  if (result.ok) {
    assert.strictEqual(result.value.totalRuns, 10, 'Should default to 10 runs');
  }
});

test('detect() - verbose mode', async () => {
  const result = await detect({
    test: successCommand,
    runs: 2,
    verbose: true, // Should not affect result structure
  });

  assert(result.ok, 'Result should be ok');
  if (result.ok) {
    assert.strictEqual(result.value.totalRuns, 2);
    assert.strictEqual(result.value.passedRuns, 2);
  }
});

// ============================================================================
// isFlaky() API Tests
// ============================================================================

test('isFlaky() - returns false for consistent passes', async () => {
  const result = await isFlaky({
    test: successCommand,
    runs: 3,
  });

  assert(result.ok, 'Result should be ok');
  if (result.ok) {
    assert.strictEqual(result.value, false, 'Should not be flaky');
  }
});

test('isFlaky() - returns false for consistent failures', async () => {
  const result = await isFlaky({
    test: failCommand,
    runs: 3,
  });

  assert(result.ok, 'Result should be ok');
  if (result.ok) {
    assert.strictEqual(result.value, false, 'Should not be flaky');
  }
});

test('isFlaky() - returns true for inconsistent results', async () => {
  const flakyCmd = createFlakyCommand();
  const result = await isFlaky({
    test: flakyCmd,
    runs: 4,
  });

  assert(result.ok, 'Result should be ok');
  if (result.ok) {
    assert.strictEqual(result.value, true, 'Should be flaky');
  }
});

test('isFlaky() - default runs (5)', async () => {
  const result = await isFlaky({
    test: successCommand,
    // runs not specified, should default to 5
  });

  assert(result.ok, 'Result should be ok');
  if (result.ok) {
    assert.strictEqual(result.value, false);
  }
});

test('isFlaky() - invalid test command', async () => {
  const result = await isFlaky({
    test: '',
    runs: 3,
  });

  assert.strictEqual(result.ok, false, 'Result should be error');
  if (!result.ok) {
    assert.match(result.error.message, /non-empty string/i);
  }
});

test('isFlaky() - invalid runs (too low)', async () => {
  const result = await isFlaky({
    test: successCommand,
    runs: 1, // Must be at least 2
  });

  assert.strictEqual(result.ok, false, 'Result should be error');
  if (!result.ok) {
    assert.match(result.error.message, /between 2 and 1000/i);
  }
});

// ============================================================================
// compileDetector() API Tests
// ============================================================================

test('compileDetector() - returns CompiledDetector instance', () => {
  const detector = compileDetector({
    test: successCommand,
  });

  assert(typeof detector.run === 'function', 'Should have run method');
  assert(typeof detector.getCommand === 'function', 'Should have getCommand method');
  assert(typeof detector.getOptions === 'function', 'Should have getOptions method');
});

test('compileDetector() - getCommand() returns test command', () => {
  const detector = compileDetector({
    test: successCommand,
  });

  assert.strictEqual(detector.getCommand(), successCommand);
});

test('compileDetector() - getOptions() returns options', () => {
  const detector = compileDetector({
    test: successCommand,
    verbose: true,
  });

  const options = detector.getOptions();
  assert.strictEqual(options.test, successCommand);
  assert.strictEqual(options.verbose, true);
});

test('compileDetector() - run() with consistent passes', async () => {
  const detector = compileDetector({
    test: successCommand,
  });

  const result = await detector.run(3);

  assert(result.ok, 'Result should be ok');
  if (result.ok) {
    assert.strictEqual(result.value.totalRuns, 3);
    assert.strictEqual(result.value.passedRuns, 3);
    assert.strictEqual(result.value.flakyTests.length, 0);
  }
});

test('compileDetector() - run() with flaky test', async () => {
  const flakyCmd = createFlakyCommand();
  const detector = compileDetector({
    test: flakyCmd,
  });

  const result = await detector.run(4);

  assert(result.ok, 'Result should be ok');
  if (result.ok) {
    assert.strictEqual(result.value.totalRuns, 4);
    assert(result.value.passedRuns > 0);
    assert(result.value.failedRuns > 0);
    assert.strictEqual(result.value.flakyTests.length, 1);
  }
});

test('compileDetector() - run() multiple times with different counts', async () => {
  const detector = compileDetector({
    test: successCommand,
  });

  const result1 = await detector.run(2);
  const result2 = await detector.run(5);

  assert(result1.ok, 'First run should be ok');
  assert(result2.ok, 'Second run should be ok');

  if (result1.ok && result2.ok) {
    assert.strictEqual(result1.value.totalRuns, 2);
    assert.strictEqual(result2.value.totalRuns, 5);
  }
});

test('compileDetector() - run() with invalid runs', async () => {
  const detector = compileDetector({
    test: successCommand,
  });

  const result = await detector.run(0);

  assert.strictEqual(result.ok, false, 'Result should be error');
  if (!result.ok) {
    assert.match(result.error.message, /between 1 and 1000/i);
  }
});

test('compileDetector() - throws on invalid test command at compile time', () => {
  assert.throws(
    () => {
      compileDetector({
        test: '',
      });
    },
    /non-empty string/i,
    'Should throw on empty test command'
  );
});

test('compileDetector() - verbose option is preserved', async () => {
  const detector = compileDetector({
    test: successCommand,
    verbose: true,
  });

  const options = detector.getOptions();
  assert.strictEqual(options.verbose, true);

  const result = await detector.run(2);
  assert(result.ok, 'Result should be ok');
});

// ============================================================================
// Result Type Consistency Tests
// ============================================================================

test('Result type - detect() follows Result<T> pattern', async () => {
  const result = await detect({
    test: successCommand,
    runs: 2,
  });

  assert(typeof result === 'object', 'Result should be object');
  assert('ok' in result, 'Result should have ok property');

  if (result.ok) {
    assert('value' in result, 'Success result should have value');
    assert(!('error' in result) || result.error === undefined, 'Success result should not have error');
  } else {
    assert('error' in result, 'Error result should have error');
    assert(result.error instanceof Error, 'Error should be Error instance');
    assert(!('value' in result) || (result as any).value === undefined, 'Error result should not have value');
  }
});

test('Result type - isFlaky() follows Result<boolean> pattern', async () => {
  const result = await isFlaky({
    test: successCommand,
    runs: 2,
  });

  assert(typeof result === 'object');
  assert('ok' in result);

  if (result.ok) {
    assert(typeof result.value === 'boolean', 'Value should be boolean');
  } else {
    assert(result.error instanceof Error);
  }
});

test('Result type - compileDetector().run() follows Result<T> pattern', async () => {
  const detector = compileDetector({
    test: successCommand,
  });

  const result = await detector.run(2);

  assert(typeof result === 'object');
  assert('ok' in result);

  if (result.ok) {
    assert('value' in result);
  } else {
    assert(result.error instanceof Error);
  }
});

// ============================================================================
// Backward Compatibility Tests
// ============================================================================

test('FlakinessReport type alias works (backward compatibility)', async () => {
  // This test ensures the FlakinessReport type still exists
  const result = await detect({
    test: successCommand,
    runs: 2,
  });

  assert(result.ok);
  if (result.ok) {
    // DetectionReport and FlakinessReport should be compatible
    const report = result.value; // Type: DetectionReport (formerly FlakinessReport)
    assert.strictEqual(report.success, true);
  }
});
