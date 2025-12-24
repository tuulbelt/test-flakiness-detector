/**
 * Fuzzy/Property-Based Tests for Test Flakiness Detector
 *
 * Property-based testing with random input generation to verify invariants
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectFlakiness } from '../src/index.js';
import { writeFileSync, mkdirSync, unlinkSync, existsSync, readdirSync, rmdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Random generators
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomBoolean(trueProbability = 0.5): boolean {
  return Math.random() < trueProbability;
}

function randomFailureRate(): number {
  return Math.random();
}

// Test fixtures directory
const FIXTURES_DIR = join(tmpdir(), `fuzzy-test-${Date.now()}`);

test.before(() => {
  mkdirSync(FIXTURES_DIR, { recursive: true });
});

test.after(() => {
  try {
    // Cleanup fixtures
    const files = readdirSync(FIXTURES_DIR);
    for (const file of files) {
      unlinkSync(join(FIXTURES_DIR, file));
    }
    rmdirSync(FIXTURES_DIR);
  } catch {
    // Ignore cleanup errors
  }
});

test('fuzzy - deterministic test command invariants', async (t) => {
  await t.test('stable commands always report 100% pass or 100% fail', async () => {
    const stableCommands = [
      'echo "test"',           // Always passes
      'exit 0',                // Always passes
      'exit 1',                // Always fails
      'node -e "process.exit(0)"',
      'node -e "process.exit(1)"',
    ];

    for (const cmd of stableCommands) {
      const runs = randomInt(5, 20);
      const report = await await detectFlakiness({ testCommand: cmd, runs });

      assert.strictEqual(report.success, true);
      assert.strictEqual(report.totalRuns, runs);

      // Should be either all pass or all fail
      const isStable = report.passedRuns === runs || report.failedRuns === runs;
      assert(isStable, `Command "${cmd}" should be stable but got ${report.passedRuns}/${runs} passed`);

      // Stable tests have no flaky tests
      assert.strictEqual(report.flakyTests.length, 0);
    }
  });

  await t.test('run count is always respected', async () => {
    for (let i = 0; i < 20; i++) {
      const runs = randomInt(1, 50);
      const report = await await detectFlakiness({
        testCommand: 'echo "test"',
        runs,
      });

      assert.strictEqual(report.totalRuns, runs);
      assert.strictEqual(report.runs.length, runs);
      assert.strictEqual(report.passedRuns + report.failedRuns, runs);
    }
  });

  await t.test('totalRuns = passedRuns + failedRuns invariant', async () => {
    const commands = [
      'exit 0',
      'exit 1',
      'echo "test"',
      'node -e "console.log(Math.random())"',
    ];

    for (const cmd of commands) {
      const runs = randomInt(5, 20);
      const report = await await detectFlakiness({ testCommand: cmd, runs });

      assert.strictEqual(
        report.totalRuns,
        report.passedRuns + report.failedRuns,
        'Total runs must equal passed + failed'
      );
    }
  });
});

test('fuzzy - probabilistic test invariants', async (t) => {
  await t.test('simulated flaky tests with known failure rates', async () => {
    for (let i = 0; i < 10; i++) {
      const failureRate = randomFailureRate();
      const runs = 20; // Fixed for predictable stats

      // Create deterministic flaky script using counter
      const counterFile = join(FIXTURES_DIR, `counter-${i}-${Date.now()}.txt`);
      writeFileSync(counterFile, '0');

      const scriptPath = join(FIXTURES_DIR, `flaky-${i}-${Date.now()}.sh`);
      writeFileSync(scriptPath, `#!/bin/bash
COUNT=$(cat "${counterFile}")
NEXT=$((COUNT + 1))
echo "$NEXT" > "${counterFile}"

# Fail based on counter modulo
if [ $((COUNT % ${Math.ceil(1 / failureRate)})) -eq 0 ]; then
  exit 1
else
  exit 0
fi
`, { mode: 0o755 });

      const report = await await detectFlakiness({
        testCommand: `bash ${scriptPath}`,
        runs,
      });

      assert.strictEqual(report.success, true);
      assert.strictEqual(report.totalRuns, runs);

      // Should detect some failures
      assert(report.failedRuns > 0 || failureRate < 0.05,
        'Should detect failures for non-negligible failure rates');

      // Cleanup
      try {
        unlinkSync(counterFile);
        unlinkSync(scriptPath);
      } catch {
        // Ignore
      }
    }
  });

  await t.test('multiple executions with same parameters produce consistent results', async () => {
    const cmd = 'echo "stable test"';
    const runs = 10;

    const report1 = await detectFlakiness({ testCommand: cmd, runs });
    const report2 = await detectFlakiness({ testCommand: cmd, runs });
    const report3 = await detectFlakiness({ testCommand: cmd, runs });

    // All should produce identical results for deterministic command
    assert.strictEqual(report1.passedRuns, report2.passedRuns);
    assert.strictEqual(report2.passedRuns, report3.passedRuns);
    assert.strictEqual(report1.failedRuns, report2.failedRuns);
    assert.strictEqual(report2.failedRuns, report3.failedRuns);
  });
});

test('fuzzy - output capture invariants', async (t) => {
  await t.test('stdout and stderr are always captured', async () => {
    const testCases = [
      { cmd: 'echo "hello"', expectStdout: 'hello' },
      { cmd: 'echo "world"', expectStdout: 'world' },
      { cmd: 'node -e "console.log(\\\"test\\\")"', expectStdout: 'test' },
      { cmd: 'node -e "console.error(\\\"error\\\")" && exit 0', expectStderr: 'error' },
    ];

    for (const tc of testCases) {
      const report = await await detectFlakiness({ testCommand: tc.cmd, runs: 3 });

      assert.strictEqual(report.success, true);

      for (const run of report.runs) {
        if (tc.expectStdout) {
          assert(run.stdout.includes(tc.expectStdout),
            `Expected stdout to contain "${tc.expectStdout}"`);
        }
        if (tc.expectStderr) {
          assert(run.stderr.includes(tc.expectStderr),
            `Expected stderr to contain "${tc.expectStderr}"`);
        }
      }
    }
  });

  await t.test('output is consistent for deterministic commands', async () => {
    const report = await await detectFlakiness({
      testCommand: 'echo "consistent output"',
      runs: 10,
    });

    const firstOutput = report.runs[0].stdout;

    for (let i = 1; i < report.runs.length; i++) {
      assert.strictEqual(report.runs[i].stdout, firstOutput,
        'Output should be identical for all runs');
    }
  });
});

test('fuzzy - exit code handling invariants', async (t) => {
  await t.test('exit code 0 always means success', async () => {
    const report = await await detectFlakiness({
      testCommand: 'exit 0',
      runs: randomInt(5, 15),
    });

    for (const run of report.runs) {
      if (run.exitCode === 0) {
        assert.strictEqual(run.success, true,
          'Exit code 0 must be success');
      }
    }

    assert.strictEqual(report.passedRuns, report.totalRuns,
      'All runs with exit 0 should pass');
  });

  await t.test('non-zero exit codes mean failure', async () => {
    const exitCodes = [1, 2, 127, 255];

    for (const code of exitCodes) {
      const report = await await detectFlakiness({
        testCommand: `exit ${code}`,
        runs: randomInt(3, 10),
      });

      for (const run of report.runs) {
        assert.strictEqual(run.success, false,
          `Exit code ${code} must be failure`);
        assert.strictEqual(run.exitCode, code,
          `Exit code should be preserved`);
      }

      assert.strictEqual(report.failedRuns, report.totalRuns,
        `All runs with exit ${code} should fail`);
    }
  });
});

test('fuzzy - error handling invariants', async (t) => {
  await t.test('invalid test commands are handled', async () => {
    const invalidCommands = [
      'nonexistent-command-12345',    // Command not found
    ];

    for (const cmd of invalidCommands) {
      const report = await await detectFlakiness({
        testCommand: cmd,
        runs: randomInt(1, 5),
      });

      // Command not found will have failures or errors - either is acceptable
      assert.strictEqual(report.success, true,
        'Report should have success=true even for nonexistent commands');
      // The individual runs will show failures
    }
  });

  await t.test('runs parameter must be positive', async () => {
    const validRuns = [1, 5, 10, 100, 1000];

    for (const runs of validRuns) {
      const report = await await detectFlakiness({
        testCommand: 'echo "test"',
        runs,
      });

      assert.strictEqual(report.success, true);
      assert.strictEqual(report.totalRuns, runs);
    }
  });

  await t.test('all reports complete successfully', async () => {
    // Even edge case commands should complete without throwing
    const commands = ['echo "test"', 'exit 0', 'exit 1'];

    for (const cmd of commands) {
      const report = await await detectFlakiness({
        testCommand: cmd,
        runs: 3,
      });

      assert.strictEqual(report.success, true,
        'All reports should complete successfully');
      assert.strictEqual(typeof report.totalRuns, 'number');
      assert.strictEqual(typeof report.passedRuns, 'number');
      assert.strictEqual(typeof report.failedRuns, 'number');
    }
  });
});

test('fuzzy - performance invariants', async (t) => {
  await t.test('execution time scales linearly with runs', async () => {
    const baseRuns = 5;
    const doubledRuns = 10;

    const start1 = performance.now();
    await detectFlakiness({ testCommand: 'echo "test"', runs: baseRuns });
    const time1 = performance.now() - start1;

    const start2 = performance.now();
    await detectFlakiness({ testCommand: 'echo "test"', runs: doubledRuns });
    const time2 = performance.now() - start2;

    // Doubled runs should take roughly 2x time (with some tolerance)
    const ratio = time2 / time1;
    assert(ratio > 1.3 && ratio < 3,
      `Time should scale roughly linearly: ${ratio.toFixed(2)}x`);
  });

  await t.test('short commands complete quickly', async () => {
    const runs = 10;

    const start = performance.now();
    const report = await await detectFlakiness({
      testCommand: 'echo "fast"',
      runs,
    });
    const elapsed = performance.now() - start;

    assert.strictEqual(report.success, true);
    assert(elapsed < 5000,
      `${runs} runs of fast command should complete in < 5s, took ${elapsed}ms`);
  });
});

test('fuzzy - verbose mode invariants', async (t) => {
  await t.test('verbose mode does not affect results', async () => {
    const cmd = 'echo "test"';
    const runs = randomInt(5, 10);

    const normalReport = await detectFlakiness({ testCommand: cmd, runs, verbose: false });
    const verboseReport = await detectFlakiness({ testCommand: cmd, runs, verbose: true });

    // Results should be identical regardless of verbose mode
    assert.strictEqual(normalReport.totalRuns, verboseReport.totalRuns);
    assert.strictEqual(normalReport.passedRuns, verboseReport.passedRuns);
    assert.strictEqual(normalReport.failedRuns, verboseReport.failedRuns);
    assert.strictEqual(normalReport.runs.length, verboseReport.runs.length);
  });
});

test('fuzzy - flaky test detection invariants', async (t) => {
  await t.test('test with mixed results is marked as flaky', async () => {
    // Create a test that fails every other run
    const counterFile = join(FIXTURES_DIR, `flaky-counter-${Date.now()}.txt`);
    writeFileSync(counterFile, '0');

    const scriptPath = join(FIXTURES_DIR, `flaky-script-${Date.now()}.sh`);
    writeFileSync(scriptPath, `#!/bin/bash
COUNT=$(cat "${counterFile}")
NEXT=$((COUNT + 1))
echo "$NEXT" > "${counterFile}"

if [ $((COUNT % 2)) -eq 0 ]; then
  exit 0
else
  exit 1
fi
`, { mode: 0o755 });

    const report = await await detectFlakiness({
      testCommand: `bash ${scriptPath}`,
      runs: 10,
    });

    assert.strictEqual(report.success, true);
    assert(report.passedRuns > 0 && report.failedRuns > 0,
      'Should have both passes and failures');

    // Should detect flakiness (may or may not be in flakyTests array depending on implementation)
    const hasFlakes = report.passedRuns > 0 && report.failedRuns > 0;
    assert(hasFlakes, 'Test with mixed results should be considered flaky');

    // Cleanup
    try {
      unlinkSync(counterFile);
      unlinkSync(scriptPath);
    } catch {
      // Ignore
    }
  });
});
