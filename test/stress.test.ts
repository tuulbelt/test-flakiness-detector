/**
 * Stress Tests for Test Flakiness Detector
 *
 * Edge cases, fuzzing, and stress testing
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectFlakiness } from '../src/index.js';

test('stress - extreme inputs', async (t) => {
  await t.test('should handle very long command strings', () => {
    const longCommand = 'echo ' + '"x"'.repeat(100) + ' | grep x';

    const report = detectFlakiness({
      testCommand: longCommand,
      runs: 3,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.passedRuns, 3);
  });

  await t.test('should handle commands with special characters', () => {
    const commands = [
      'echo "test with spaces"',
      'echo "test\twith\ttabs"',
      'echo "test\nwith\nnewlines"',
      'echo "test\'with\'quotes"',
      'echo "test\\"with\\"escaped\\"quotes"',
      'echo "test|with|pipes"',
      'echo "test&with&ampersands"',
      'echo "test;with;semicolons"',
      'echo "test$with$dollars"',
    ];

    for (const cmd of commands) {
      const report = detectFlakiness({
        testCommand: cmd,
        runs: 2,
      });

      assert.strictEqual(report.success, true);
    }
  });

  await t.test('should handle unicode in commands', () => {
    const report = detectFlakiness({
      testCommand: 'echo "测试 тест テスト 🎉"',
      runs: 3,
    });

    assert.strictEqual(report.success, true);
    assert(report.runs[0].stdout.includes('🎉'));
  });
});

test('stress - boundary conditions', async (t) => {
  await t.test('should handle exactly 1 run', () => {
    const report = detectFlakiness({
      testCommand: 'echo "test"',
      runs: 1,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.totalRuns, 1);
    assert.strictEqual(report.flakyTests.length, 0); // Cannot be flaky with 1 run
  });

  await t.test('should handle exactly 1000 runs (maximum)', () => {
    const report = detectFlakiness({
      testCommand: 'true',
      runs: 1000,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.totalRuns, 1000);
    assert.strictEqual(report.runs.length, 1000);
  });

  await t.test('should reject 0 runs', () => {
    const report = detectFlakiness({
      testCommand: 'echo "test"',
      runs: 0,
    });

    assert.strictEqual(report.success, false);
    assert(report.error?.includes('Runs must be between 1 and 1000'));
  });

  await t.test('should reject 1001 runs', () => {
    const report = detectFlakiness({
      testCommand: 'echo "test"',
      runs: 1001,
    });

    assert.strictEqual(report.success, false);
    assert(report.error?.includes('Runs must be between 1 and 1000'));
  });

  await t.test('should reject negative runs', () => {
    const report = detectFlakiness({
      testCommand: 'echo "test"',
      runs: -5,
    });

    assert.strictEqual(report.success, false);
  });
});

test('stress - malformed inputs', async (t) => {
  await t.test('should handle fractional runs', () => {
    const report = detectFlakiness({
      testCommand: 'echo "test"',
      runs: 5.7, // Should be treated as 5 (parseInt behavior)
    });

    assert.strictEqual(report.success, true);
  });

  await t.test('should reject NaN runs', () => {
    const report = detectFlakiness({
      testCommand: 'echo "test"',
      runs: NaN,
    });

    assert.strictEqual(report.success, false);
  });

  await t.test('should reject Infinity runs', () => {
    const report = detectFlakiness({
      testCommand: 'echo "test"',
      runs: Infinity,
    });

    assert.strictEqual(report.success, false);
  });

  await t.test('should handle null command', () => {
    const report = detectFlakiness({
      testCommand: null as unknown as string,
      runs: 5,
    });

    assert.strictEqual(report.success, false);
    assert(report.error?.includes('Test command must be a non-empty string'));
  });

  await t.test('should handle undefined command', () => {
    const report = detectFlakiness({
      testCommand: undefined as unknown as string,
      runs: 5,
    });

    assert.strictEqual(report.success, false);
  });

  await t.test('should handle whitespace-only command', () => {
    const report = detectFlakiness({
      testCommand: '   ',
      runs: 2,
    });

    // Whitespace command should execute (shell will handle it)
    assert.strictEqual(report.success, true);
  });
});

test('stress - command failure modes', async (t) => {
  await t.test('should handle commands that do not exist', () => {
    const report = detectFlakiness({
      testCommand: 'nonexistent-command-xyz-12345',
      runs: 3,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.failedRuns, 3);
    assert.strictEqual(report.flakyTests.length, 0); // All fail = not flaky
  });

  await t.test('should handle commands with syntax errors', () => {
    const report = detectFlakiness({
      testCommand: 'echo "unclosed quote',
      runs: 2,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.failedRuns, 2);
  });

  await t.test('should handle commands that segfault', () => {
    // This might not actually segfault in all environments, but tests the concept
    const report = detectFlakiness({
      testCommand: 'sh -c "kill -11 $$"', // Send SIGSEGV to self
      runs: 2,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.failedRuns, 2);
  });

  await t.test('should handle commands with various exit codes', () => {
    for (const exitCode of [1, 2, 42, 127, 255]) {
      const report = detectFlakiness({
        testCommand: `exit ${exitCode}`,
        runs: 2,
      });

      assert.strictEqual(report.success, true);
      assert.strictEqual(report.failedRuns, 2);
      assert.strictEqual(report.runs[0].exitCode, exitCode);
    }
  });
});

test('stress - fuzzing', async (t) => {
  await t.test('should never crash on random command strings', () => {
    const randomStrings = [
      '',
      ' ',
      '\n',
      '\t',
      '\\',
      '|',
      '&',
      ';',
      '$',
      '`',
      '"',
      "'",
      '><',
      '||',
      '&&',
      ';;',
      '\x00',
      '12345',
      'true; false; true',
      'echo $(echo nested)',
      '$(whoami)',
    ];

    for (const randomCmd of randomStrings) {
      const report = detectFlakiness({
        testCommand: randomCmd || 'true', // Use 'true' for empty string
        runs: 1,
      });

      // Should always return a valid report, never throw
      assert(typeof report.success === 'boolean');
      assert(typeof report.totalRuns === 'number');
      assert(Array.isArray(report.flakyTests));
      assert(Array.isArray(report.runs));
    }
  });

  await t.test('should never crash on random runs values', () => {
    const randomRuns = [
      0,
      1,
      -1,
      -100,
      1.5,
      999,
      1000,
      1001,
      10000,
      Number.MAX_SAFE_INTEGER,
      Number.MIN_SAFE_INTEGER,
    ];

    for (const runs of randomRuns) {
      const report = detectFlakiness({
        testCommand: 'true',
        runs,
      });

      // Should always return a valid report
      assert(typeof report.success === 'boolean');
    }
  });

  await t.test('should handle random combinations of inputs', () => {
    const commands = ['true', 'false', 'echo test', 'exit 1', ''];
    const runsCounts = [1, 5, 10, 0, -1, 1001];

    for (let i = 0; i < 50; i++) {
      const cmd = commands[Math.floor(Math.random() * commands.length)];
      const runs = runsCounts[Math.floor(Math.random() * runsCounts.length)];

      const report = detectFlakiness({
        testCommand: cmd || 'true',
        runs,
      });

      // Should always return a report
      assert(report !== null);
      assert(typeof report === 'object');
    }
  });
});

test('stress - concurrent-like scenarios', async (t) => {
  await t.test('should handle rapid successive calls', () => {
    const reports = [];

    for (let i = 0; i < 10; i++) {
      const report = detectFlakiness({
        testCommand: 'echo "test"',
        runs: 5,
      });
      reports.push(report);
    }

    // All should succeed
    reports.forEach((report) => {
      assert.strictEqual(report.success, true);
      assert.strictEqual(report.totalRuns, 5);
    });
  });

  await t.test('should maintain isolated state between calls', () => {
    const report1 = detectFlakiness({
      testCommand: 'echo "first"',
      runs: 3,
    });

    const report2 = detectFlakiness({
      testCommand: 'echo "second"',
      runs: 5,
    });

    // Reports should be independent
    assert.strictEqual(report1.totalRuns, 3);
    assert.strictEqual(report2.totalRuns, 5);
    assert(report1.runs[0].stdout.includes('first'));
    assert(report2.runs[0].stdout.includes('second'));
  });
});

test('stress - output edge cases', async (t) => {
  await t.test('should handle binary output', () => {
    const report = detectFlakiness({
      testCommand: 'echo -e "\\x00\\x01\\x02\\xFF"',
      runs: 2,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.passedRuns, 2);
  });

  await t.test('should handle extremely long single line', () => {
    // Generate a very long single line (1MB)
    const report = detectFlakiness({
      testCommand: 'node -e "process.stdout.write(\\'x\\'.repeat(1024 * 1024))"',
      runs: 2,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.passedRuns, 2);
    assert(report.runs[0].stdout.length > 1000000);
  });

  await t.test('should handle many small lines', () => {
    const report = detectFlakiness({
      testCommand: 'node -e "for(let i=0; i<100000; i++) console.log(i)"',
      runs: 2,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.passedRuns, 2);
    assert(report.runs[0].stdout.split('\n').length > 90000);
  });

  await t.test('should handle no output at all', () => {
    const report = detectFlakiness({
      testCommand: 'true',
      runs: 3,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.passedRuns, 3);
    assert.strictEqual(report.runs[0].stdout, '');
    assert.strictEqual(report.runs[0].stderr, '');
  });

  await t.test('should handle only stderr output', () => {
    const report = detectFlakiness({
      testCommand: 'node -e "console.error(\\'error message\\')"',
      runs: 2,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.passedRuns, 2);
    assert(report.runs[0].stderr.includes('error message'));
  });

  await t.test('should handle mixed stdout and stderr', () => {
    const report = detectFlakiness({
      testCommand: 'node -e "console.log(\\'out\\'); console.error(\\'err\\')"',
      runs: 2,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.passedRuns, 2);
    assert(report.runs[0].stdout.includes('out'));
    assert(report.runs[0].stderr.includes('err'));
  });
});

test('stress - statistical edge cases', async (t) => {
  await t.test('should handle all-pass scenario', () => {
    const report = detectFlakiness({
      testCommand: 'true',
      runs: 50,
    });

    assert.strictEqual(report.passedRuns, 50);
    assert.strictEqual(report.failedRuns, 0);
    assert.strictEqual(report.flakyTests.length, 0);
  });

  await t.test('should handle all-fail scenario', () => {
    const report = detectFlakiness({
      testCommand: 'false',
      runs: 50,
    });

    assert.strictEqual(report.passedRuns, 0);
    assert.strictEqual(report.failedRuns, 50);
    assert.strictEqual(report.flakyTests.length, 0);
  });

  await t.test('should calculate correct failure rate for extreme flakiness', () => {
    // Test that fails 99% of the time (using random with bias)
    const report = detectFlakiness({
      testCommand: 'node -e "process.exit(Math.random() > 0.99 ? 0 : 1)"',
      runs: 100,
    });

    if (report.flakyTests.length > 0) {
      // Should have very high failure rate
      assert(report.flakyTests[0].failureRate > 90);
    }
  });

  await t.test('should calculate correct failure rate for rare flakiness', () => {
    // Test that fails 1% of the time
    const report = detectFlakiness({
      testCommand: 'node -e "process.exit(Math.random() > 0.01 ? 1 : 0)"',
      runs: 100,
    });

    if (report.flakyTests.length > 0) {
      // Should have very low failure rate (but >0)
      assert(report.flakyTests[0].failureRate < 10);
      assert(report.flakyTests[0].failureRate > 0);
    }
  });
});

test('stress - resource exhaustion prevention', async (t) => {
  await t.test('should not allow runs > 1000', () => {
    const report = detectFlakiness({
      testCommand: 'true',
      runs: 10000,
    });

    assert.strictEqual(report.success, false);
    assert(report.error?.includes('Runs must be between 1 and 1000'));
  });

  await t.test('should handle buffer limit gracefully', () => {
    // Try to generate more than 10MB (should be truncated by execSync)
    const report = detectFlakiness({
      testCommand: 'node -e "console.log(\\'x\\'.repeat(20 * 1024 * 1024))"',
      runs: 1,
    });

    // Should either succeed (with truncated output) or fail gracefully
    assert.strictEqual(report.success, true);
  });
});

test('stress - verbose mode', async (t) => {
  await t.test('should not crash in verbose mode with many runs', () => {
    const report = detectFlakiness({
      testCommand: 'echo "test"',
      runs: 50,
      verbose: true,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.totalRuns, 50);
  });

  await t.test('should handle verbose mode with failures', () => {
    const report = detectFlakiness({
      testCommand: 'exit 1',
      runs: 5,
      verbose: true,
    });

    assert.strictEqual(report.success, true);
    assert.strictEqual(report.failedRuns, 5);
  });
});
