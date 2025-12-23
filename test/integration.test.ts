/**
 * Integration Tests for Test Flakiness Detector
 *
 * Tests with real-world scenarios and test framework integration
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectFlakiness } from '../src/index.js';
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

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
  await t.test('should detect flaky Node.js tests', () => {
    // Create a fixture test file with a flaky test
    const testFile = join(FIXTURES_DIR, 'flaky-node-test.js');
    writeFileSync(testFile, `
      import { test } from 'node:test';
      import assert from 'node:assert/strict';

      test('flaky test', () => {
        // Fails 50% of the time
        const shouldPass = Math.random() > 0.5;
        assert.strictEqual(shouldPass, true);
      });
    `);

    const report = detectFlakiness({
      testCommand: `node --test ${testFile}`,
      runs: 50, // Increased from 20 to reduce statistical edge cases (p < 10^-15 for all same)
      verbose: false,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.totalRuns, 50);

    // Should have both passes and failures (statistically)
    assert(report.passedRuns > 0, 'Should have some passed runs');
    assert(report.failedRuns > 0, 'Should have some failed runs');
    assert.strictEqual(report.flakyTests.length, 1);
  });

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

test('integration - Shell scripts', async (t) => {
  await t.test('should detect flaky shell scripts', () => {
    const scriptFile = join(FIXTURES_DIR, 'flaky-script.sh');
    writeFileSync(scriptFile, `#!/bin/bash
# Flaky script that randomly exits with 0 or 1
[ $RANDOM -gt 16384 ] && exit 0 || exit 1
`, { mode: 0o755 });

    const report = detectFlakiness({
      testCommand: `bash ${scriptFile}`,
      runs: 30,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.totalRuns, 30);

    // Should detect flakiness
    if (report.passedRuns > 0 && report.failedRuns > 0) {
      assert.strictEqual(report.flakyTests.length, 1);
      assert(report.flakyTests[0].failureRate > 0);
      assert(report.flakyTests[0].failureRate < 100);
    }
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

test('integration - Timing-based flakiness', async (t) => {
  await t.test('should detect timing-dependent failures', () => {
    // Create a test that fails based on timing
    const scriptFile = join(FIXTURES_DIR, 'timing-test.sh');
    writeFileSync(scriptFile, `#!/bin/bash
# Fails if milliseconds are even
MILLIS=$(date +%N | cut -c1-3)
[ $((MILLIS % 2)) -eq 0 ] && exit 1 || exit 0
`, { mode: 0o755 });

    const report = detectFlakiness({
      testCommand: `bash ${scriptFile}`,
      runs: 20,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.totalRuns, 20);

    // Timing-based test should show flakiness
    if (report.passedRuns > 0 && report.failedRuns > 0) {
      assert.strictEqual(report.flakyTests.length, 1);
    }
  });
});

test('integration - Environment-based flakiness', async (t) => {
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

test('integration - File system race conditions', async (t) => {
  await t.test('should detect file creation race conditions', () => {
    const scriptFile = join(FIXTURES_DIR, 'file-race.sh');
    const lockFile = join(FIXTURES_DIR, 'test.lock');

    writeFileSync(scriptFile, `#!/bin/bash
LOCK_FILE="${lockFile}"

# Try to create lock file
if [ -f "$LOCK_FILE" ]; then
  # Lock file exists, fail
  exit 1
else
  # Create lock file
  touch "$LOCK_FILE"
  sleep 0.01
  rm "$LOCK_FILE"
  exit 0
fi
`, { mode: 0o755 });

    // Clean up lock file before test
    try {
      rmSync(lockFile);
    } catch (err) {
      // Ignore if doesn't exist
    }

    const report = detectFlakiness({
      testCommand: `bash ${scriptFile}`,
      runs: 5,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.totalRuns, 5);

    // File should be cleaned up between runs, so all should pass
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

  await t.test('should handle test with retry logic', () => {
    const scriptFile = join(FIXTURES_DIR, 'test-with-retry.sh');
    writeFileSync(scriptFile, `#!/bin/bash
# Test with built-in retry (should always succeed after retries)
MAX_RETRIES=3
COUNT=0

while [ $COUNT -lt $MAX_RETRIES ]; do
  # Simulate flaky operation
  if [ $RANDOM -gt 16384 ]; then
    echo "Success"
    exit 0
  fi
  COUNT=$((COUNT + 1))
  sleep 0.01
done

echo "Failed after $MAX_RETRIES retries"
exit 1
`, { mode: 0o755 });

    const report = detectFlakiness({
      testCommand: `bash ${scriptFile}`,
      runs: 10,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.totalRuns, 10);

    // With retry logic, most should pass, but some might still fail
    assert(report.passedRuns >= 5); // At least half should pass
  });
});

test('integration - Concurrent execution simulation', async (t) => {
  await t.test('should handle multiple runs independently', () => {
    let runCount = 0;
    const scriptFile = join(FIXTURES_DIR, 'concurrent-test.sh');

    writeFileSync(scriptFile, `#!/bin/bash
# Each run is independent
RANDOM_NUM=$RANDOM
echo "Run with random number: $RANDOM_NUM"

# Pass if random number is even
if [ $((RANDOM_NUM % 2)) -eq 0 ]; then
  exit 0
else
  exit 1
fi
`, { mode: 0o755 });

    const report = detectFlakiness({
      testCommand: `bash ${scriptFile}`,
      runs: 20,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.totalRuns, 20);
    assert.strictEqual(report.runs.length, 20);

    // Each run should be independent
    for (const run of report.runs) {
      assert(run.stdout.includes('Run with random number'));
    }
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
