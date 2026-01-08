/**
 * Tests for output formatters
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatJSON, formatText, formatMinimal, formatReport } from '../src/formatters.js';
import { DetectionReport } from '../src/types.js';

// Test fixtures
const createNoFlakyReport = (): DetectionReport => ({
  success: true,
  totalRuns: 10,
  passedRuns: 10,
  failedRuns: 0,
  flakyTests: [],
  runs: Array(10).fill({
    success: true,
    exitCode: 0,
    stdout: 'All tests passed',
    stderr: '',
  }),
});

const createConsistentFailureReport = (): DetectionReport => ({
  success: true,
  totalRuns: 10,
  passedRuns: 0,
  failedRuns: 10,
  flakyTests: [],
  runs: Array(10).fill({
    success: false,
    exitCode: 1,
    stdout: '',
    stderr: 'Test failed',
  }),
});

const createFlakyReport = (): DetectionReport => ({
  success: true,
  totalRuns: 10,
  passedRuns: 7,
  failedRuns: 3,
  flakyTests: [
    {
      testName: 'Test Suite',
      passed: 7,
      failed: 3,
      totalRuns: 10,
      failureRate: 30.0,
    },
  ],
  runs: [
    ...Array(7).fill({ success: true, exitCode: 0, stdout: 'Passed', stderr: '' }),
    ...Array(3).fill({ success: false, exitCode: 1, stdout: '', stderr: 'Failed' }),
  ],
});

const createMultipleFlakyReport = (): DetectionReport => ({
  success: true,
  totalRuns: 20,
  passedRuns: 15,
  failedRuns: 5,
  flakyTests: [
    {
      testName: 'Suite A',
      passed: 8,
      failed: 2,
      totalRuns: 10,
      failureRate: 20.0,
    },
    {
      testName: 'Suite B',
      passed: 7,
      failed: 3,
      totalRuns: 10,
      failureRate: 30.0,
    },
  ],
  runs: Array(20).fill({ success: true, exitCode: 0, stdout: '', stderr: '' }),
});

const createErrorReport = (): DetectionReport => ({
  success: false,
  totalRuns: 0,
  passedRuns: 0,
  failedRuns: 0,
  flakyTests: [],
  runs: [],
  error: 'Test command must be a non-empty string',
});

test('formatJSON', async (t) => {
  await t.test('formats report as JSON', () => {
    const report = createNoFlakyReport();
    const json = formatJSON(report);

    // Should be valid JSON
    const parsed = JSON.parse(json);
    assert.deepEqual(parsed, report);
  });

  await t.test('formats with pretty printing', () => {
    const report = createNoFlakyReport();
    const json = formatJSON(report);

    // Should have indentation (2 spaces)
    assert(json.includes('  '));
    assert(json.includes('\n'));
  });

  await t.test('includes all report fields', () => {
    const report = createFlakyReport();
    const json = formatJSON(report);
    const parsed = JSON.parse(json);

    assert.strictEqual(parsed.success, true);
    assert.strictEqual(parsed.totalRuns, 10);
    assert.strictEqual(parsed.passedRuns, 7);
    assert.strictEqual(parsed.failedRuns, 3);
    assert.strictEqual(parsed.flakyTests.length, 1);
    assert.strictEqual(parsed.runs.length, 10);
  });

  await t.test('formats error reports with error field', () => {
    const report = createErrorReport();
    const json = formatJSON(report);
    const parsed = JSON.parse(json);

    assert.strictEqual(parsed.success, false);
    assert.strictEqual(parsed.error, 'Test command must be a non-empty string');
    assert.strictEqual(parsed.totalRuns, 0);
  });
});

test('formatText', async (t) => {
  await t.test('formats report with no flakiness', () => {
    const report = createNoFlakyReport();
    const text = formatText(report);

    // Should include summary
    assert(text.includes('Total Runs: 10'));
    assert(text.includes('Passed: 10'));
    assert(text.includes('Failed: 0'));

    // Should indicate no flakiness
    assert(text.includes('No flakiness detected'));
    assert(text.includes('all tests passed'));
  });

  await t.test('formats report with consistent failures', () => {
    const report = createConsistentFailureReport();
    const text = formatText(report);

    // Should indicate consistent failure (not flaky)
    assert(text.includes('No flakiness detected'));
    assert(text.includes('all tests failed consistently'));
  });

  await t.test('formats report with flaky tests', () => {
    const report = createFlakyReport();
    const text = formatText(report);

    // Should indicate flakiness detected
    assert(text.includes('Flaky Tests Detected'));

    // Should list flaky tests
    assert(text.includes('Test Suite'));
    assert(text.includes('Passed: 7/10'));
    assert(text.includes('Failed: 3/10'));
    assert(text.includes('30.0%'));
  });

  await t.test('formats report with multiple flaky tests', () => {
    const report = createMultipleFlakyReport();
    const text = formatText(report);

    // Should list all flaky tests
    assert(text.includes('Suite A'));
    assert(text.includes('Suite B'));
    assert(text.includes('20.0%'));
    assert(text.includes('30.0%'));
  });

  await t.test('includes visual separators', () => {
    const report = createNoFlakyReport();
    const text = formatText(report);

    // Should have title and separator
    assert(text.includes('Test Flakiness Detection Report'));
    assert(text.includes('═'.repeat(50)));
  });

  await t.test('includes emoji indicators', () => {
    const noFlakyReport = createNoFlakyReport();
    const noFlakyText = formatText(noFlakyReport);
    assert(noFlakyText.includes('✅'));

    const flakyReport = createFlakyReport();
    const flakyText = formatText(flakyReport);
    assert(flakyText.includes('⚠️'));
  });

  await t.test('formats error reports with error message', () => {
    const report = createErrorReport();
    const text = formatText(report);

    // Should show error, not success message
    assert(text.includes('❌ Error'));
    assert(text.includes('Test command must be a non-empty string'));
    assert(!text.includes('✅'));
    assert(!text.includes('No flakiness detected'));
  });

  await t.test('error reports do not show summary', () => {
    const report = createErrorReport();
    const text = formatText(report);

    // Should not include summary section for errors
    assert(!text.includes('📊 Summary'));
    assert(!text.includes('Total Runs'));
  });
});

test('formatMinimal', async (t) => {
  await t.test('returns empty string for no flaky tests', () => {
    const report = createNoFlakyReport();
    const minimal = formatMinimal(report);

    assert.strictEqual(minimal, '');
  });

  await t.test('returns empty string for consistent failures', () => {
    const report = createConsistentFailureReport();
    const minimal = formatMinimal(report);

    assert.strictEqual(minimal, '');
  });

  await t.test('returns flaky test names one per line', () => {
    const report = createFlakyReport();
    const minimal = formatMinimal(report);

    assert.strictEqual(minimal, 'Test Suite');
  });

  await t.test('returns multiple flaky test names', () => {
    const report = createMultipleFlakyReport();
    const minimal = formatMinimal(report);

    const lines = minimal.split('\n');
    assert.strictEqual(lines.length, 2);
    assert.strictEqual(lines[0], 'Suite A');
    assert.strictEqual(lines[1], 'Suite B');
  });

  await t.test('minimal format suitable for piping', () => {
    const report = createMultipleFlakyReport();
    const minimal = formatMinimal(report);

    // Should be plain test names, no decorations
    assert(!minimal.includes('✅'));
    assert(!minimal.includes('⚠️'));
    assert(!minimal.includes('Passed:'));
    assert(!minimal.includes('Failed:'));
    assert(!minimal.includes('%'));
  });

  await t.test('returns empty string for error reports', () => {
    const report = createErrorReport();
    const minimal = formatMinimal(report);

    // Errors have no flaky tests to list
    assert.strictEqual(minimal, '');
  });
});

test('formatReport', async (t) => {
  await t.test('formats as JSON when format is json', () => {
    const report = createFlakyReport();
    const output = formatReport(report, 'json');

    // Should be valid JSON
    const parsed = JSON.parse(output);
    assert.deepEqual(parsed, report);
  });

  await t.test('formats as text when format is text', () => {
    const report = createFlakyReport();
    const output = formatReport(report, 'text');

    // Should be human-readable text
    assert(output.includes('Test Flakiness Detection Report'));
    assert(output.includes('Flaky Tests Detected'));
  });

  await t.test('formats as minimal when format is minimal', () => {
    const report = createFlakyReport();
    const output = formatReport(report, 'minimal');

    // Should be just test name
    assert.strictEqual(output, 'Test Suite');
  });

  await t.test('throws for unknown format', () => {
    const report = createFlakyReport();

    // TypeScript should prevent this at compile time, but test runtime behavior
    assert.throws(() => {
      // @ts-expect-error Testing runtime behavior with invalid format
      formatReport(report, 'invalid');
    }, /Unknown format/);
  });
});

test('format consistency', async (t) => {
  await t.test('JSON format roundtrips correctly', () => {
    const report = createFlakyReport();
    const json = formatJSON(report);
    const parsed = JSON.parse(json);

    assert.deepEqual(parsed, report);
  });

  await t.test('all formats handle empty flaky tests array', () => {
    const report = createNoFlakyReport();

    const json = formatJSON(report);
    const parsed = JSON.parse(json);
    assert.deepEqual(parsed.flakyTests, []);

    const text = formatText(report);
    assert(text.includes('No flakiness detected'));

    const minimal = formatMinimal(report);
    assert.strictEqual(minimal, '');
  });

  await t.test('all formats preserve failure rate precision', () => {
    const report: DetectionReport = {
      success: true,
      totalRuns: 100,
      passedRuns: 67,
      failedRuns: 33,
      flakyTests: [
        {
          testName: 'Precise Test',
          passed: 67,
          failed: 33,
          totalRuns: 100,
          failureRate: 33.33,
        },
      ],
      runs: [],
    };

    const json = formatJSON(report);
    const parsed = JSON.parse(json);
    assert.strictEqual(parsed.flakyTests[0].failureRate, 33.33);

    const text = formatText(report);
    assert(text.includes('33.3%'));
  });
});
