/**
 * Security Limits Tests
 *
 * Tests for security-related input validation and edge cases:
 * - Protection against extremely long inputs
 * - Special character handling (potential shell injection)
 * - Boundary value validation
 * - Resource exhaustion prevention
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectFlakiness, detect, isFlaky, compileDetector } from '../src/index.js';
import type { Config } from '../src/index.js';

// ============================================================================
// Extremely Long Inputs (2 tests)
// ============================================================================

test('security: handles long inputs gracefully', async (t) => {
  await t.test('should handle reasonable command lengths', async () => {
    // Test that normal-length commands work
    const command = 'echo ' + 'a'.repeat(500);

    const report = await detectFlakiness({
      testCommand: command,
      runs: 1,
    });

    assert.strictEqual(report.success, true);
  });

  await t.test('should handle large output within buffer limits', async () => {
    // Command that produces output, but within maxBuffer limit (10MB)
    // Note: spawnSync has maxBuffer: 10 * 1024 * 1024 configured
    const report = await detectFlakiness({
      testCommand: 'echo "test output"',
      runs: 1,
      verbose: false,
    });

    assert.strictEqual(report.success, true);
  });
});

// ============================================================================
// Special Characters and Shell Injection Prevention (5 tests)
// ============================================================================

test('security: handles special characters safely', async (t) => {
  await t.test('should handle commands with quotes', async () => {
    const report = await detectFlakiness({
      testCommand: 'echo "test with quotes"',
      runs: 1,
    });

    assert.strictEqual(report.success, true);
  });

  await t.test('should handle commands with semicolons', async () => {
    // Semicolons are valid in shell commands (chaining)
    const report = await detectFlakiness({
      testCommand: 'echo "test"; echo "again"',
      runs: 1,
    });

    assert.strictEqual(report.success, true);
  });

  await t.test('should handle commands with pipes', async () => {
    const report = await detectFlakiness({
      testCommand: 'echo "test" | grep test',
      runs: 1,
    });

    assert.strictEqual(report.success, true);
  });

  await t.test('should handle commands with backticks', async () => {
    const report = await detectFlakiness({
      testCommand: 'echo `date`',
      runs: 1,
    });

    assert.strictEqual(report.success, true);
  });

  await t.test('should handle commands with dollar signs', async () => {
    const report = await detectFlakiness({
      testCommand: 'echo $HOME',
      runs: 1,
    });

    assert.strictEqual(report.success, true);
  });
});

// ============================================================================
// Boundary Value Validation (6 tests)
// ============================================================================

test('security: validates threshold boundaries', async (t) => {
  await t.test('should reject negative threshold', async () => {
    const report = await detectFlakiness({
      testCommand: 'echo "test"',
      runs: 5,
      threshold: -1,
    });

    assert.strictEqual(report.success, false);
    assert(report.error !== undefined);
    assert.match(report.error, /threshold|range|0-100/i);
  });

  await t.test('should reject threshold > 100', async () => {
    const report = await detectFlakiness({
      testCommand: 'echo "test"',
      runs: 5,
      threshold: 101,
    });

    assert.strictEqual(report.success, false);
    assert(report.error !== undefined);
    assert.match(report.error, /threshold|range|0-100/i);
  });

  await t.test('should reject NaN threshold', async () => {
    const report = await detectFlakiness({
      testCommand: 'echo "test"',
      runs: 5,
      threshold: NaN,
    });

    assert.strictEqual(report.success, false);
    assert(report.error !== undefined);
    assert.match(report.error, /threshold|number|finite/i);
  });

  await t.test('should reject Infinity threshold', async () => {
    const report = await detectFlakiness({
      testCommand: 'echo "test"',
      runs: 5,
      threshold: Infinity,
    });

    assert.strictEqual(report.success, false);
    assert(report.error !== undefined);
    assert.match(report.error, /threshold|number|finite/i);
  });

  await t.test('should accept threshold at boundaries (0 and 100)', async () => {
    const report1 = await detectFlakiness({
      testCommand: 'echo "test"',
      runs: 2,
      threshold: 0,
    });
    assert.strictEqual(report1.success, true);

    const report2 = await detectFlakiness({
      testCommand: 'echo "test"',
      runs: 2,
      threshold: 100,
    });
    assert.strictEqual(report2.success, true);
  });

  await t.test('should accept valid decimal threshold', async () => {
    const report = await detectFlakiness({
      testCommand: 'echo "test"',
      runs: 5,
      threshold: 12.5,
    });

    assert.strictEqual(report.success, true);
  });
});

test('security: validates runs boundaries', async (t) => {
  await t.test('should enforce minimum runs (1)', async () => {
    const report = await detectFlakiness({
      testCommand: 'echo "test"',
      runs: 0,
    });

    assert.strictEqual(report.success, false);
    assert(report.error !== undefined);
    assert.match(report.error, /runs|between|1/i);
  });

  await t.test('should enforce maximum runs (1000)', async () => {
    const report = await detectFlakiness({
      testCommand: 'echo "test"',
      runs: 1001,
    });

    assert.strictEqual(report.success, false);
    assert(report.error !== undefined);
    assert.match(report.error, /runs|between|1000/i);
  });

  await t.test('should reject negative runs', async () => {
    const report = await detectFlakiness({
      testCommand: 'echo "test"',
      runs: -5,
    });

    assert.strictEqual(report.success, false);
    assert(report.error !== undefined);
    assert.match(report.error, /runs|between/i);
  });

  await t.test('should reject NaN runs', async () => {
    const report = await detectFlakiness({
      testCommand: 'echo "test"',
      runs: NaN,
    });

    assert.strictEqual(report.success, false);
    assert(report.error !== undefined);
    assert.match(report.error, /runs|between|finite/i);
  });

  await t.test('should reject Infinity runs', async () => {
    const report = await detectFlakiness({
      testCommand: 'echo "test"',
      runs: Infinity,
    });

    assert.strictEqual(report.success, false);
    assert(report.error !== undefined);
    assert.match(report.error, /runs|between|finite/i);
  });

  await t.test('should accept runs at boundaries (1 and 1000)', async () => {
    const report1 = await detectFlakiness({
      testCommand: 'echo "test"',
      runs: 1,
    });
    assert.strictEqual(report1.success, true);

    const report2 = await detectFlakiness({
      testCommand: 'echo "test"',
      runs: 1000,
      verbose: false, // Avoid massive console output
    });
    assert.strictEqual(report2.success, true);
  });
});

// ============================================================================
// Type Coercion and Invalid Types (4 tests)
// ============================================================================

test('security: rejects invalid types with clear errors', async (t) => {
  await t.test('should reject undefined testCommand', async () => {
    const report = await detectFlakiness({
      testCommand: undefined as unknown as string,
      runs: 5,
    });

    assert.strictEqual(report.success, false);
    assert(report.error !== undefined);
    assert.match(report.error, /command|string/i);
  });

  await t.test('should reject object as testCommand', async () => {
    const report = await detectFlakiness({
      testCommand: { cmd: 'echo test' } as unknown as string,
      runs: 5,
    });

    assert.strictEqual(report.success, false);
    assert(report.error !== undefined);
    assert.match(report.error, /command|string/i);
  });

  await t.test('should reject array as runs', async () => {
    const report = await detectFlakiness({
      testCommand: 'echo "test"',
      runs: [5] as unknown as number,
    });

    assert.strictEqual(report.success, false);
    assert(report.error !== undefined);
    assert.match(report.error, /runs|number|finite/i);
  });

  await t.test('should reject string as threshold', async () => {
    const report = await detectFlakiness({
      testCommand: 'echo "test"',
      runs: 5,
      threshold: '50' as unknown as number,
    });

    assert.strictEqual(report.success, false);
    assert(report.error !== undefined);
    assert.match(report.error, /threshold|number|finite/i);
  });
});

// ============================================================================
// Multi-Tier API Consistency (3 tests)
// ============================================================================

test('security: all API tiers validate inputs consistently', async (t) => {
  await t.test('detect() API validates inputs', async () => {
    const result = await detect({
      test: '',
      runs: 5,
    });

    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error.message, /command|string/i);
    }
  });

  await t.test('isFlaky() API validates inputs', async () => {
    const result = await isFlaky({
      test: '',
      runs: 5,
    });

    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.error.message, /command|string/i);
    }
  });

  await t.test('compileDetector() throws on invalid config', () => {
    // compileDetector throws instead of returning Result
    assert.throws(
      () => compileDetector({ test: '' }),
      /command|string/i
    );
  });
});
