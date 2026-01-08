#!/usr/bin/env -S npx tsx
/**
 * Test Flakiness Detector
 *
 * Detect unreliable tests by running them multiple times and tracking failure rates.
 *
 * Dogfooding: Uses cli-progress-reporting for progress tracking.
 */

import { realpathSync } from 'node:fs';
import { detectFlakiness } from './detector.js';
import { Config } from './types.js';

// Re-export types
export type {
  Result,
  Config,
  DetectOptions,
  IsFlakyOptions,
  CompileOptions,
  TestRunResult,
  TestFlakiness,
  DetectionReport,
  FlakinessReport,
  CompiledDetector,
} from './types.js';

// Re-export multi-tier APIs
export { detect, isFlaky, compileDetector } from './api.js';

// Re-export legacy API for backward compatibility
export { detectFlakiness };

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
       flaky [options]

Options:
  -t, --test <command>   Test command to execute (required)
  -r, --runs <number>    Number of times to run the test (default: 10)
  -v, --verbose          Enable verbose output
  -h, --help             Show this help message

Examples:
  # Run npm test 10 times
  flaky --test "npm test"
  test-flakiness-detector --test "npm test"

  # Run with 20 iterations
  flaky --test "npm test" --runs 20

  # Verbose output
  flaky --test "cargo test" --runs 15 --verbose

Output:
  JSON report containing:
  - Total runs, passed runs, failed runs
  - List of flaky tests with failure rates
  - All test run results

Exit Codes:
  0 - Detection completed successfully, no flakiness found
  1 - Flakiness detected (tests failed inconsistently)
  2 - Invalid arguments or execution error

Library Usage:
  import { detect, isFlaky, compileDetector } from 'test-flakiness-detector';

  // Full report
  const result = await detect({ test: 'npm test', runs: 10 });

  // Boolean check
  const hasFlaky = await isFlaky({ test: 'npm test', runs: 5 });

  // Pre-compiled detector
  const detector = compileDetector({ test: 'npm test' });
  const report = await detector.run(10);

See README.md for complete API documentation.`);
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
    globalThis.process?.exit(2);
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
    globalThis.process?.exit(2);
  }
}

// Check if this module is being run directly
// Must resolve symlinks for npm link support (argv1 may be symlink path)
const argv1 = globalThis.process?.argv?.[1];
if (argv1) {
  try {
    const realPath = realpathSync(argv1);
    if (import.meta.url === `file://${realPath}`) {
      main();
    }
  } catch {
    // Fallback for non-existent paths
    if (import.meta.url === `file://${argv1}`) {
      main();
    }
  }
}
