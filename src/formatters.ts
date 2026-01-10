/**
 * Output formatters for Test Flakiness Detector
 *
 * Supports multiple output formats:
 * - json: Complete DetectionReport in JSON format
 * - text: Human-readable text output
 * - minimal: Only flaky test names (one per line)
 */

import { DetectionReport } from './types.js';

/**
 * Output format options
 */
export type OutputFormat = 'json' | 'text' | 'minimal';

/**
 * Format detection report as JSON
 *
 * @param report - The detection report to format
 * @returns JSON-formatted string (pretty-printed)
 *
 * @example
 * ```typescript
 * const report = await detect({ test: 'npm test', runs: 10 });
 * if (report.ok) {
 *   const json = formatJSON(report.value);
 *   console.log(json);
 * }
 * ```
 */
export function formatJSON(report: DetectionReport): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Format detection report as human-readable text
 *
 * @param report - The detection report to format
 * @returns Multi-line human-readable text
 *
 * @example
 * ```typescript
 * const report = await detect({ test: 'npm test', runs: 10 });
 * if (report.ok) {
 *   const text = formatText(report.value);
 *   console.log(text);
 * }
 * ```
 */
export function formatText(report: DetectionReport): string {
  const lines: string[] = [];

  lines.push('🔍 Test Flakiness Detection Report');
  lines.push('═'.repeat(50));
  lines.push('');

  // Check for errors first
  if (!report.success && report.error) {
    lines.push('❌ Error');
    lines.push(`  ${report.error}`);
    return lines.join('\n');
  }

  // Summary
  lines.push('📊 Summary');
  lines.push(`  Total Runs: ${report.totalRuns}`);
  lines.push(`  Passed: ${report.passedRuns}`);
  lines.push(`  Failed: ${report.failedRuns}`);
  lines.push('');

  // Flakiness detection result
  if (report.flakyTests.length === 0) {
    if (report.passedRuns === report.totalRuns) {
      lines.push('✅ No flakiness detected (all tests passed)');
    } else if (report.failedRuns === report.totalRuns) {
      lines.push('✅ No flakiness detected (all tests failed consistently)');
    } else {
      lines.push('✅ No flakiness detected');
    }
  } else {
    lines.push('⚠️  Flaky Tests Detected');
    lines.push('');
    lines.push('Flaky Tests:');

    for (const test of report.flakyTests) {
      lines.push(`  • ${test.testName}`);
      lines.push(`    Passed: ${test.passed}/${test.totalRuns} (${(100 - test.failureRate).toFixed(1)}%)`);
      lines.push(`    Failed: ${test.failed}/${test.totalRuns} (${test.failureRate.toFixed(1)}%)`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Format detection report as minimal output (only flaky test names)
 *
 * @param report - The detection report to format
 * @returns Flaky test names, one per line (empty if no flaky tests)
 *
 * @example
 * ```typescript
 * const report = await detect({ test: 'npm test', runs: 10 });
 * if (report.ok) {
 *   const minimal = formatMinimal(report.value);
 *   if (minimal) {
 *     console.log('Flaky tests:');
 *     console.log(minimal);
 *   }
 * }
 * ```
 */
export function formatMinimal(report: DetectionReport): string {
  // Return empty string for errors or no flaky tests
  // (minimal format is designed for piping - errors have no test names to output)
  if (!report.success || report.flakyTests.length === 0) {
    return '';
  }

  return report.flakyTests.map((test) => test.testName).join('\n');
}

/**
 * Format detection report using the specified output format
 *
 * @param report - The detection report to format
 * @param format - Output format (json, text, or minimal)
 * @returns Formatted string
 *
 * @example
 * ```typescript
 * const report = await detect({ test: 'npm test', runs: 10 });
 * if (report.ok) {
 *   const output = formatReport(report.value, 'text');
 *   console.log(output);
 * }
 * ```
 */
export function formatReport(report: DetectionReport, format: OutputFormat): string {
  switch (format) {
    case 'json':
      return formatJSON(report);
    case 'text':
      return formatText(report);
    case 'minimal':
      return formatMinimal(report);
    default:
      // Exhaustiveness check - should never happen with correct types
      const _exhaustive: never = format;
      throw new Error(`Unknown format: ${_exhaustive}`);
  }
}
