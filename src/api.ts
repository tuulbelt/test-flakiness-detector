/**
 * Multi-tier API for Test Flakiness Detector
 * Following Property Validator gold standard pattern
 */

import {
  Result,
  DetectOptions,
  IsFlakyOptions,
  CompileOptions,
  DetectionReport,
  CompiledDetector,
  Config,
} from './types.js';
import { detectFlakiness } from './detector.js';

/**
 * Detect flaky tests with full detailed report
 *
 * This is the primary API for comprehensive flakiness analysis.
 * Returns detailed test run information, pass/fail counts, and flakiness statistics.
 *
 * @param options - Detection configuration
 * @returns Result containing detection report or error
 *
 * @example
 * ```typescript
 * import { detect } from 'test-flakiness-detector';
 *
 * const result = await detect({
 *   test: 'npm test',
 *   runs: 10,
 *   verbose: false
 * });
 *
 * if (result.ok) {
 *   const report = result.value;
 *   console.log(`Found ${report.flakyTests.length} flaky tests`);
 *   report.flakyTests.forEach(test => {
 *     console.log(`${test.testName}: ${test.failureRate}% failure rate`);
 *   });
 * } else {
 *   console.error('Detection failed:', result.error.message);
 * }
 * ```
 */
export async function detect(options: DetectOptions): Promise<Result<DetectionReport>> {
  try {
    // Validate options
    if (!options.test || typeof options.test !== 'string') {
      return {
        ok: false,
        error: new Error('Test command must be a non-empty string'),
      };
    }

    const runs = options.runs ?? 10;
    if (typeof runs !== 'number' || !Number.isFinite(runs) || runs < 1 || runs > 1000) {
      return {
        ok: false,
        error: new Error('Runs must be between 1 and 1000'),
      };
    }

    // Convert to Config format for internal detector
    const config: Config = {
      testCommand: options.test,
      runs,
      verbose: options.verbose ?? false,
      onProgress: options.onProgress,
    };

    const report = await detectFlakiness(config);

    if (!report.success) {
      return {
        ok: false,
        error: new Error(report.error ?? 'Detection failed'),
      };
    }

    return {
      ok: true,
      value: report,
    };
  } catch (error: unknown) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Fast boolean check for flakiness (no detailed report)
 *
 * This is optimized for CI gates where you only need to know if flakiness exists.
 * Runs fewer iterations by default and returns only a boolean result.
 *
 * @param options - Detection configuration (fewer runs recommended)
 * @returns Result containing boolean (true = flaky detected) or error
 *
 * @example
 * ```typescript
 * import { isFlaky } from 'test-flakiness-detector';
 *
 * const result = await isFlaky({
 *   test: 'npm test',
 *   runs: 5
 * });
 *
 * if (result.ok) {
 *   if (result.value) {
 *     console.error('⚠️ Flakiness detected! Tests are unreliable.');
 *     process.exit(1);
 *   } else {
 *     console.log('✓ No flakiness detected.');
 *   }
 * } else {
 *   console.error('Check failed:', result.error.message);
 *   process.exit(2);
 * }
 * ```
 */
export async function isFlaky(options: IsFlakyOptions): Promise<Result<boolean>> {
  try {
    // Validate options
    if (!options.test || typeof options.test !== 'string') {
      return {
        ok: false,
        error: new Error('Test command must be a non-empty string'),
      };
    }

    const runs = options.runs ?? 5; // Fewer runs for faster check
    if (typeof runs !== 'number' || !Number.isFinite(runs) || runs < 2 || runs > 1000) {
      return {
        ok: false,
        error: new Error('Runs must be between 2 and 1000'),
      };
    }

    // Convert to Config format for internal detector
    const config: Config = {
      testCommand: options.test,
      runs,
      verbose: false, // Never verbose for boolean check
      onProgress: options.onProgress,
    };

    const report = await detectFlakiness(config);

    if (!report.success) {
      return {
        ok: false,
        error: new Error(report.error ?? 'Detection failed'),
      };
    }

    // Return true if any flaky tests were found
    const hasFlakiness = report.flakyTests.length > 0;

    return {
      ok: true,
      value: hasFlakiness,
    };
  } catch (error: unknown) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Compile a detector for repeated use with different run counts
 *
 * This pre-compiles the test configuration so you can run detection
 * multiple times with different parameters without reconfiguring.
 *
 * @param options - Compiler configuration
 * @returns CompiledDetector instance
 *
 * @example
 * ```typescript
 * import { compileDetector } from 'test-flakiness-detector';
 *
 * // Compile once
 * const detector = compileDetector({
 *   test: 'npm test',
 *   verbose: true
 * });
 *
 * // Run multiple times with different iteration counts
 * const quick = await detector.run(5);
 * const thorough = await detector.run(20);
 *
 * if (quick.ok) {
 *   console.log('Quick check:', quick.value.flakyTests.length, 'flaky tests');
 * }
 * if (thorough.ok) {
 *   console.log('Thorough check:', thorough.value.flakyTests.length, 'flaky tests');
 * }
 * ```
 */
export function compileDetector(options: CompileOptions): CompiledDetector {
  // Validate options at compile time
  if (!options.test || typeof options.test !== 'string') {
    throw new Error('Test command must be a non-empty string');
  }

  // Create the compiled detector closure
  const detector: CompiledDetector = {
    async run(runs: number): Promise<Result<DetectionReport>> {
      if (typeof runs !== 'number' || !Number.isFinite(runs) || runs < 1 || runs > 1000) {
        return {
          ok: false,
          error: new Error('Runs must be between 1 and 1000'),
        };
      }

      try {
        const config: Config = {
          testCommand: options.test,
          runs,
          verbose: options.verbose ?? false,
          onProgress: options.onProgress,
        };

        const report = await detectFlakiness(config);

        if (!report.success) {
          return {
            ok: false,
            error: new Error(report.error ?? 'Detection failed'),
          };
        }

        return {
          ok: true,
          value: report,
        };
      } catch (error: unknown) {
        return {
          ok: false,
          error: error instanceof Error ? error : new Error(String(error)),
        };
      }
    },

    getCommand(): string {
      return options.test;
    },

    getOptions(): CompileOptions {
      return { ...options };
    },
  };

  return detector;
}
