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
import { Config, ProgressEvent } from './types.js';
import { formatReport, OutputFormat } from './formatters.js';

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
  ProgressEvent,
} from './types.js';

// Re-export formatters
export type { OutputFormat } from './formatters.js';
export { formatReport, formatJSON, formatText, formatMinimal } from './formatters.js';

// Re-export multi-tier APIs
export { detect, isFlaky, compileDetector } from './api.js';

// Re-export legacy API for backward compatibility
export { detectFlakiness };

/**
 * CLI-specific configuration extending base Config
 */
interface CLIConfig extends Config {
  format?: OutputFormat;
  stream?: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): { config: CLIConfig; showHelp: boolean } {
  const config: CLIConfig = {
    testCommand: '',
    runs: 10,
    verbose: false,
    format: 'json',
    stream: false,
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
    } else if (arg === '--threshold') {
      const thresholdValue = args[i + 1];
      if (thresholdValue) {
        const thresholdNum = parseFloat(thresholdValue);
        if (!isNaN(thresholdNum)) {
          config.threshold = thresholdNum;
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
    } else if (arg === '--format' || arg === '-f') {
      const formatValue = args[i + 1];
      if (formatValue === 'json' || formatValue === 'text' || formatValue === 'minimal') {
        config.format = formatValue;
        i++; // Skip next arg
      }
    } else if (arg === '--stream' || arg === '-s') {
      config.stream = true;
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
  -t, --test <command>     Test command to execute (required)
  -r, --runs <number>      Number of times to run the test (default: 10)
  --threshold <percent>    Flakiness threshold 0-100 (default: 0, any failure = flaky)
  -f, --format <format>    Output format: json, text, minimal (default: json)
  -s, --stream             Stream progress events as newline-delimited JSON
  -v, --verbose            Enable verbose output
  -h, --help               Show this help message

Output Formats:
  json     - Complete JSON report (default, machine-readable)
  text     - Human-readable text output
  minimal  - Only flaky test names (one per line)

Examples:
  # Run npm test 10 times (JSON output)
  flaky --test "npm test"
  test-flakiness-detector --test "npm test"

  # Human-readable text output
  flaky --test "npm test" --format text

  # Minimal output (only flaky test names)
  flaky --test "npm test" --format minimal

  # Run with 20 iterations
  flaky --test "npm test" --runs 20

  # Only flag tests failing >10% of the time as flaky
  flaky --test "npm test" --threshold 10

  # Stream progress events (NDJSON)
  flaky --test "npm test" --stream

  # Verbose output
  flaky --test "cargo test" --runs 15 --verbose

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

  // Custom output format
  import { formatReport } from 'test-flakiness-detector';
  const output = formatReport(report.value, 'text');

  // Streaming progress events
  const result = await detect({
    test: 'npm test',
    runs: 10,
    onProgress: (event) => {
      if (event.type === 'run-complete') {
        console.log(\`Run \${event.runNumber}: \${event.success ? 'PASS' : 'FAIL'}\`);
      }
    }
  });

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

  // Set up streaming if --stream flag is enabled
  if (config.stream) {
    config.onProgress = (event: ProgressEvent) => {
      // Output progress events as newline-delimited JSON
      console.log(JSON.stringify(event));
    };
  }

  const report = await detectFlakiness(config);

  if (report.success) {
    // Output final report (unless streaming, which already emitted 'complete' event)
    if (!config.stream) {
      const format = config.format ?? 'json';
      const output = formatReport(report, format);
      console.log(output);
    }

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
