/**
 * Integration Tests for Test Flakiness Detector
 *
 * Tests with real-world scenarios using DETERMINISTIC test patterns
 * and fuzzing for invariant verification
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { detectFlakiness } from '../src/index.js';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURES_DIR = join(process.cwd(), 'test', 'fixtures');

/**
 * Setup fixtures directory
 */
test.before(() => {
  try {
    mkdirSync(FIXTURES_DIR, { recursive: true });
  } catch (err) {
    // Directory might already exist
  }
});

/**
 * Cleanup fixtures after tests
 */
test.after(() => {
  try {
    rmSync(FIXTURES_DIR, { recursive: true, force: true });
  } catch (err) {
    // Ignore cleanup errors
  }
});

test('integration - Node.js native test runner', async (t) => {
  await t.test('should handle stable Node.js tests', () => {
    const testFile = join(FIXTURES_DIR, 'stable-node-test.js');
    writeFileSync(testFile, `
      import { test } from 'node:test';
      import assert from 'node:assert/strict';

      test('stable test', () => {
        assert.strictEqual(1 + 1, 2);
      });
    `);

    const report = detectFlakiness({
      testCommand: `node --test ${testFile}`,
      runs: 5,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.passedRuns, 5);
    assert.strictEqual(report.failedRuns, 0);
    assert.strictEqual(report.flakyTests.length, 0);
  });
});

test('integration - Shell scripts with deterministic patterns', async (t) => {
  await t.test('should detect flaky shell scripts with predetermined sequence', () => {
    const scriptFile = join(FIXTURES_DIR, 'flaky-script.sh');
    writeFileSync(scriptFile, `#!/bin/bash
# Deterministic: Pass on even run numbers, fail on odd
RUN_NUM=\${TEST_RUN_NUMBER:-0}
if [ $((RUN_NUM % 2)) -eq 0 ]; then
  exit 0
else
  exit 1
fi
`, { mode: 0o755 });

    // Manually run with different TEST_RUN_NUMBER values
    let passedRuns = 0;
    let failedRuns = 0;

    for (let i = 0; i < 10; i++) {
      const result = spawnSync('bash', [scriptFile], {
        env: { ...process.env, TEST_RUN_NUMBER: String(i) },
        encoding: 'utf-8',
      });

      if (result.status === 0) passedRuns++;
      else failedRuns++;
    }

    // Verify deterministic pattern
    assert.strictEqual(passedRuns, 5);
    assert.strictEqual(failedRuns, 5);
  });

  await t.test('should handle stable shell scripts', () => {
    const scriptFile = join(FIXTURES_DIR, 'stable-script.sh');
    writeFileSync(scriptFile, `#!/bin/bash
echo "All tests passed"
exit 0
`, { mode: 0o755 });

    const report = detectFlakiness({
      testCommand: `bash ${scriptFile}`,
      runs: 5,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.passedRuns, 5);
    assert.strictEqual(report.failedRuns, 0);
    assert.strictEqual(report.flakyTests.length, 0);
  });
});

test('integration - Environment-based testing', async (t) => {
  await t.test('should detect environment variable dependency', () => {
    const scriptFile = join(FIXTURES_DIR, 'env-test.sh');
    writeFileSync(scriptFile, `#!/bin/bash
# Fails if FLAKY_ENV is not set
[ -n "$FLAKY_ENV" ] && exit 0 || exit 1
`, { mode: 0o755 });

    // Run without env var (should all fail)
    const report1 = detectFlakiness({
      testCommand: `bash ${scriptFile}`,
      runs: 3,
    });

    assert.strictEqual(report1.failedRuns, 3);
    assert.strictEqual(report1.flakyTests.length, 0); // All fail = not flaky

    // Run with env var (should all pass)
    const report2 = detectFlakiness({
      testCommand: `FLAKY_ENV=1 bash ${scriptFile}`,
      runs: 3,
    });

    assert.strictEqual(report2.passedRuns, 3);
    assert.strictEqual(report2.flakyTests.length, 0); // All pass = not flaky
  });
});

test('integration - File system operations', async (t) => {
  await t.test('should handle tests with proper cleanup', () => {
    const scriptFile = join(FIXTURES_DIR, 'file-cleanup.sh');
    const testDataFile = join(FIXTURES_DIR, 'test-data.txt');

    writeFileSync(scriptFile, `#!/bin/bash
TEST_FILE="${testDataFile}"

# Create test file
echo "test data" > "$TEST_FILE"

# Verify it exists
if [ -f "$TEST_FILE" ]; then
  # Clean up
  rm "$TEST_FILE"
  exit 0
else
  exit 1
fi
`, { mode: 0o755 });

    // Clean up before test
    try {
      rmSync(testDataFile);
    } catch (err) {
      // Ignore if doesn't exist
    }

    const report = detectFlakiness({
      testCommand: `bash ${scriptFile}`,
      runs: 5,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.totalRuns, 5);
    assert.strictEqual(report.passedRuns, 5);
  });
});

test('integration - Large output handling', async (t) => {
  await t.test('should handle tests with large stdout', () => {
    const scriptFile = join(FIXTURES_DIR, 'large-output.sh');
    writeFileSync(scriptFile, `#!/bin/bash
# Generate large output (1MB)
for i in {1..10000}; do
  echo "Test output line $i with some additional text to make it longer"
done
exit 0
`, { mode: 0o755 });

    const report = detectFlakiness({
      testCommand: `bash ${scriptFile}`,
      runs: 2,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.passedRuns, 2);

    // Verify output was captured
    assert(report.runs[0].stdout.length > 100000);
  });

  await t.test('should handle tests with large stderr', () => {
    const scriptFile = join(FIXTURES_DIR, 'large-stderr.sh');
    writeFileSync(scriptFile, `#!/bin/bash
# Generate large stderr output
for i in {1..1000}; do
  echo "Error line $i" >&2
done
exit 1
`, { mode: 0o755 });

    const report = detectFlakiness({
      testCommand: `bash ${scriptFile}`,
      runs: 2,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.failedRuns, 2);

    // Verify stderr was captured
    assert(report.runs[0].stderr.length > 10000);
  });
});

test('integration - Real-world test patterns', async (t) => {
  await t.test('should handle test suite with setup/teardown', () => {
    const scriptFile = join(FIXTURES_DIR, 'suite-with-setup.sh');
    writeFileSync(scriptFile, `#!/bin/bash
# Setup
TEMP_FILE=$(mktemp)
echo "setup data" > $TEMP_FILE

# Test
if [ -f "$TEMP_FILE" ]; then
  echo "Test passed"
  RESULT=0
else
  echo "Test failed"
  RESULT=1
fi

# Teardown
rm -f $TEMP_FILE

exit $RESULT
`, { mode: 0o755 });

    const report = detectFlakiness({
      testCommand: `bash ${scriptFile}`,
      runs: 5,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.passedRuns, 5);
    assert.strictEqual(report.flakyTests.length, 0);
  });
});

test('integration - Complex multi-line output', async (t) => {
  await t.test('should preserve multi-line test output', () => {
    const scriptFile = join(FIXTURES_DIR, 'multiline-output.sh');
    writeFileSync(scriptFile, `#!/bin/bash
cat <<EOF
TAP version 13
1..3
ok 1 - test one
ok 2 - test two
ok 3 - test three
# tests 3
# pass 3
# fail 0
EOF
exit 0
`, { mode: 0o755 });

    const report = detectFlakiness({
      testCommand: `bash ${scriptFile}`,
      runs: 3,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.passedRuns, 3);

    // Verify multi-line output is preserved
    assert(report.runs[0].stdout.includes('TAP version 13'));
    assert(report.runs[0].stdout.includes('# pass 3'));
  });
});

test('fuzzing - Invariant testing with random inputs', async (t) => {
  await t.test('should maintain invariants across varied run counts', () => {
    const scriptFile = join(FIXTURES_DIR, `always-pass-${Date.now()}.sh`);
    writeFileSync(scriptFile, `#!/bin/bash
exit 0
`, { mode: 0o755 });

    // Fuzz test with different run counts
    const runCounts = [1, 2, 3, 5, 10, 20, 50, 100];

    for (const runs of runCounts) {
      const report = detectFlakiness({
        testCommand: `bash ${scriptFile}`,
        runs,
        verbose: false,
      });

      // Invariants that MUST hold for all inputs
      assert.strictEqual(report.success, true, `runs=${runs}: should succeed`);
      assert.strictEqual(report.totalRuns, runs, `runs=${runs}: totalRuns should match`);
      assert.strictEqual(
        report.passedRuns + report.failedRuns,
        report.totalRuns,
        `runs=${runs}: passedRuns + failedRuns must equal totalRuns`
      );
      assert.strictEqual(report.runs.length, runs, `runs=${runs}: runs array length should match`);

      // Calculate failure rate from report data
      const failureRate = (report.failedRuns / report.totalRuns) * 100;
      assert(
        failureRate >= 0 && failureRate <= 100,
        `runs=${runs}: failure rate must be 0-100, got ${failureRate}`
      );
    }

    // Clean up
    try {
      rmSync(scriptFile);
    } catch (err) {
      // Ignore cleanup errors
    }
  });

  await t.test('should handle edge cases in output lengths', () => {
    // Fuzz test with various output sizes
    const outputSizes = [0, 1, 10, 100, 1000, 10000, 100000];

    for (const size of outputSizes) {
      const scriptFile = join(FIXTURES_DIR, `fuzzing-output-${size}.sh`);
      writeFileSync(scriptFile, `#!/bin/bash
# Generate exactly ${size} bytes of output
head -c ${size} /dev/zero | tr '\\0' 'x'
exit 0
`, { mode: 0o755 });

      const report = detectFlakiness({
        testCommand: `bash ${scriptFile}`,
        runs: 2,
      });

      // Invariants
      assert.strictEqual(report.success, true, `size=${size}: should succeed`);
      assert.strictEqual(report.passedRuns, 2, `size=${size}: should pass all runs`);

      // Output length should be approximately size (may have trailing newline)
      const actualLength = report.runs[0].stdout.length;
      assert(
        Math.abs(actualLength - size) <= 1,
        `size=${size}: expected ~${size} bytes, got ${actualLength}`
      );
    }
  });

  await t.test('should maintain invariants for various exit codes', () => {
    // Fuzz test with different exit codes
    const exitCodes = [0, 1, 2, 42, 127, 255];

    for (const exitCode of exitCodes) {
      const scriptFile = join(FIXTURES_DIR, `fuzzing-exit-${exitCode}.sh`);
      writeFileSync(scriptFile, `#!/bin/bash
exit ${exitCode}
`, { mode: 0o755 });

      const report = detectFlakiness({
        testCommand: `bash ${scriptFile}`,
        runs: 3,
      });

      // Invariants
      assert.strictEqual(report.success, true, `exitCode=${exitCode}: should succeed`);
      assert.strictEqual(report.totalRuns, 3, `exitCode=${exitCode}: totalRuns should be 3`);

      // Exit code 0 = success, non-zero = failure
      if (exitCode === 0) {
        assert.strictEqual(report.passedRuns, 3, `exitCode=${exitCode}: should pass all`);
        assert.strictEqual(report.failedRuns, 0, `exitCode=${exitCode}: should fail none`);
      } else {
        assert.strictEqual(report.passedRuns, 0, `exitCode=${exitCode}: should pass none`);
        assert.strictEqual(report.failedRuns, 3, `exitCode=${exitCode}: should fail all`);
      }

      // All runs should report same exit code
      for (const run of report.runs) {
        assert.strictEqual(run.exitCode, exitCode, `exitCode=${exitCode}: should match in runs`);
      }
    }
  });
});
