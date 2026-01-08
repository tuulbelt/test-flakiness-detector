/**
 * Core flakiness detection logic
 */

import { spawnSync } from 'child_process';
import * as progress from '@tuulbelt/cli-progress-reporting';
import { Config, TestRunResult, DetectionReport, TestFlakiness } from './types.js';

/**
 * Run a test command once and capture the result
 *
 * @param command - The test command to execute
 * @param verbose - Whether to log verbose output
 * @returns The test run result
 */
function runTestOnce(command: string, verbose: boolean): TestRunResult {
  if (verbose) {
    console.error(`[RUN] Executing: ${command}`);
  }

  try {
    const result = spawnSync(command, {
      encoding: 'utf-8',
      shell: true,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    return {
      success: result.status === 0,
      exitCode: result.status ?? 1,
      stdout: result.stdout || '',
      stderr: result.stderr || '',
    };
  } catch (error: unknown) {
    // Handle cases where spawnSync throws (e.g., null bytes in command)
    const err = error as Error;
    return {
      success: false,
      exitCode: 1,
      stdout: '',
      stderr: err.message || 'Command execution failed',
    };
  }
}

/**
 * Detect flaky tests by running the test command multiple times
 *
 * @param config - Configuration for flakiness detection
 * @returns Flakiness detection report
 *
 * @example
 * ```typescript
 * const report = await detectFlakiness({
 *   testCommand: 'npm test',
 *   runs: 10,
 *   verbose: false
 * });
 *
 * if (report.success) {
 *   console.log(`Found ${report.flakyTests.length} flaky tests`);
 *   report.flakyTests.forEach(test => {
 *     console.log(`${test.testName}: ${test.failureRate}% failure rate`);
 *   });
 * }
 * ```
 */
export async function detectFlakiness(config: Config): Promise<DetectionReport> {
  const { testCommand, runs = 10, verbose = false } = config;

  if (!testCommand || typeof testCommand !== 'string') {
    return {
      success: false,
      totalRuns: 0,
      passedRuns: 0,
      failedRuns: 0,
      flakyTests: [],
      runs: [],
      error: 'Test command must be a non-empty string',
    };
  }

  if (typeof runs !== 'number' || !Number.isFinite(runs) || runs < 1 || runs > 1000) {
    return {
      success: false,
      totalRuns: 0,
      passedRuns: 0,
      failedRuns: 0,
      flakyTests: [],
      runs: [],
      error: 'Runs must be between 1 and 1000',
    };
  }

  // Initialize progress reporting (dogfooding cli-progress-reporting)
  const progressId = `flakiness-${Date.now()}`;

  if (runs >= 5) {
    // Only use progress reporting for 5+ runs (makes sense for longer operations)
    const initResult = progress.init(runs, 'Detecting flakiness...', { id: progressId });
    if (initResult.ok && verbose) {
      console.error(`[INFO] Progress tracking enabled (dogfooding cli-progress-reporting)`);
    }
  }

  if (verbose) {
    console.error(`[INFO] Running test command ${runs} times: ${testCommand}`);
  }

  const results: TestRunResult[] = [];
  let passedRuns = 0;
  let failedRuns = 0;

  // Run the test command multiple times
  for (let i = 0; i < runs; i++) {
    if (verbose) {
      console.error(`[INFO] Run ${i + 1}/${runs}`);
    }

    const result = runTestOnce(testCommand, verbose);
    results.push(result);

    if (result.success) {
      passedRuns++;
    } else {
      failedRuns++;
    }

    // Update progress after each run
    if (runs >= 5) {
      const status = result.success ? 'passed' : 'failed';
      progress.increment(1, `Run ${i + 1}/${runs} ${status} (${passedRuns} passed, ${failedRuns} failed)`, { id: progressId });
    }
  }

  // Calculate flakiness: if some runs passed and some failed, the test is flaky
  const flakyTests: TestFlakiness[] = [];

  if (passedRuns > 0 && failedRuns > 0) {
    // The entire test suite is flaky
    flakyTests.push({
      testName: 'Test Suite',
      passed: passedRuns,
      failed: failedRuns,
      totalRuns: runs,
      failureRate: (failedRuns / runs) * 100,
    });
  }

  // Mark progress as complete
  if (runs >= 5) {
    const summary = flakyTests.length > 0
      ? `Flakiness detected: ${flakyTests[0]!.failureRate.toFixed(1)}% failure rate`
      : 'No flakiness detected';
    progress.finish(summary, { id: progressId });
  }

  if (verbose) {
    console.error(`[INFO] Completed ${runs} runs: ${passedRuns} passed, ${failedRuns} failed`);
    if (flakyTests.length > 0) {
      console.error(`[WARN] Detected flaky tests!`);
    }
  }

  // Clean up progress file
  if (runs >= 5) {
    progress.clear({ id: progressId });
  }

  return {
    success: true,
    totalRuns: runs,
    passedRuns,
    failedRuns,
    flakyTests,
    runs: results,
  };
}
