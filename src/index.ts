#!/usr/bin/env -S npx tsx
/**
 * Test Flakiness Detector
 *
 * Detect unreliable tests by running them multiple times and tracking failure rates.
 *
 * Dogfooding: Uses cli-progress-reporting for progress tracking (when available in monorepo).
 */

import { spawnSync } from 'child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Configuration options for flakiness detection
 */
export interface Config {
  /** Number of times to run the test command */
  runs?: number;
  /** Test command to execute */
  testCommand: string;
  /** Enable verbose output */
  verbose?: boolean;
}

/**
 * Result of a single test run
 */
export interface TestRunResult {
  /** Whether the test command succeeded */
  success: boolean;
  /** Exit code from the test command */
  exitCode: number;
  /** Standard output from the test command */
  stdout: string;
  /** Standard error from the test command */
  stderr: string;
}

/**
 * Flakiness statistics for a single test
 */
export interface TestFlakiness {
  /** Name or identifier of the test */
  testName: string;
  /** Number of times the test passed */
  passed: number;
  /** Number of times the test failed */
  failed: number;
  /** Total number of runs */
  totalRuns: number;
  /** Failure rate as a percentage (0-100) */
  failureRate: number;
}

/**
 * Complete flakiness detection report
 */
export interface FlakinessReport {
  /** Whether the detection completed successfully */
  success: boolean;
  /** Total number of test runs performed */
  totalRuns: number;
  /** Number of runs that passed */
  passedRuns: number;
  /** Number of runs that failed */
  failedRuns: number;
  /** List of flaky tests (tests with 0 < failure rate < 100) */
  flakyTests: TestFlakiness[];
  /** All test run results */
  runs: TestRunResult[];
  /** Error message if detection failed */
  error?: string;
}

/**
 * Try to load cli-progress-reporting (dogfooding - optional in monorepo)
 * Returns null if not available (e.g., tool cloned independently)
 */
async function loadProgressReporting(): Promise<any | null> {
  try {
    // Try to import from sibling directory (monorepo context)
    const progressPath = join(process.cwd(), '..', 'cli-progress-reporting', 'src', 'index.ts');
    if (!existsSync(progressPath)) {
      return null; // Not in monorepo, that's fine
    }

    const module = await import(`file://${progressPath}`);
    return module;
  } catch {
    return null; // Import failed, that's fine - progress reporting is optional
  }
}

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
export async function detectFlakiness(config: Config): Promise<FlakinessReport> {
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

  // Try to load progress reporting (dogfooding - optional)
  const progress = await loadProgressReporting();
  const progressId = `flakiness-${Date.now()}`;

  if (progress && runs >= 5) {
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
    if (progress && runs >= 5) {
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
  if (progress && runs >= 5) {
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
  if (progress && runs >= 5) {
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

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): { config: Config; showHelp: boolean } {
  const config: Config = {
    testCommand: '',
    runs: 10,
    verbose: false,
  };
  let showHelp = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--runs' || arg === '-r') {
      const runsValue = args[i + 1];
      if (runsValue) {
        const runsNum = parseInt(runsValue, 10);
        if (!isNaN(runsNum)) {
          config.runs = runsNum;
          i++; // Skip next arg
        }
      }
    } else if (arg === '--test' || arg === '-t') {
      const testValue = args[i + 1];
      if (testValue) {
        config.testCommand = testValue;
        i++; // Skip next arg
      }
    } else if (arg === '--verbose' || arg === '-v') {
      config.verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      showHelp = true;
    }
  }

  return { config, showHelp };
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`Test Flakiness Detector

Detect unreliable tests by running them multiple times and tracking failure rates.

Usage: test-flakiness-detector [options]

Options:
  -t, --test <command>   Test command to execute (required)
  -r, --runs <number>    Number of times to run the test (default: 10)
  -v, --verbose          Enable verbose output
  -h, --help             Show this help message

Examples:
  # Run npm test 10 times
  test-flakiness-detector --test "npm test"

  # Run with 20 iterations
  test-flakiness-detector --test "npm test" --runs 20

  # Verbose output
  test-flakiness-detector --test "cargo test" --runs 15 --verbose

Output:
  JSON report containing:
  - Total runs, passed runs, failed runs
  - List of flaky tests with failure rates
  - All test run results

Exit Codes:
  0 - Detection completed successfully
  1 - Invalid arguments or execution error`);
}

// CLI entry point - only runs when executed directly
async function main(): Promise<void> {
  const args = globalThis.process?.argv?.slice(2) ?? [];
  const { config, showHelp } = parseArgs(args);

  if (showHelp) {
    printHelp();
    return;
  }

  if (!config.testCommand) {
    console.error('Error: Test command is required');
    console.error('Use --test <command> to specify the test command');
    console.error('Use --help for more information');
    globalThis.process?.exit(1);
    return;
  }

  const report = await detectFlakiness(config);

  if (report.success) {
    // Output JSON report
    console.log(JSON.stringify(report, null, 2));

    // Exit with code 1 if flaky tests were found
    if (report.flakyTests.length > 0) {
      globalThis.process?.exit(1);
    }
  } else {
    console.error(`Error: ${report.error}`);
    globalThis.process?.exit(1);
  }
}

// Check if this module is being run directly
const argv1 = globalThis.process?.argv?.[1];
if (argv1 && import.meta.url === `file://${argv1}`) {
  main();
}
