/**
 * Type definitions for Test Flakiness Detector
 */

/**
 * Result type for non-throwing error handling
 * Following Property Validator gold standard pattern
 */
export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: Error };

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
 * Options for detect() API
 */
export interface DetectOptions {
  /** Test command to execute */
  test: string;
  /** Number of times to run the test (default: 10) */
  runs?: number;
  /** Enable verbose output (default: false) */
  verbose?: boolean;
  /** Custom flakiness threshold percentage (default: 0, any failure = flaky) */
  threshold?: number;
}

/**
 * Options for isFlaky() API
 */
export interface IsFlakyOptions {
  /** Test command to execute */
  test: string;
  /** Number of times to run the test (default: 5) */
  runs?: number;
  /** Custom flakiness threshold percentage (default: 0) */
  threshold?: number;
}

/**
 * Options for compileDetector() API
 */
export interface CompileOptions {
  /** Test command to execute */
  test: string;
  /** Enable verbose output (default: false) */
  verbose?: boolean;
  /** Custom flakiness threshold percentage (default: 0) */
  threshold?: number;
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
export interface DetectionReport {
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
 * Legacy type alias for backward compatibility
 * @deprecated Use DetectionReport instead
 */
export type FlakinessReport = DetectionReport;

/**
 * Compiled detector interface for pre-compiled test execution
 */
export interface CompiledDetector {
  /** Run the detector with specified number of runs */
  run(runs: number): Promise<Result<DetectionReport>>;

  /** Get the test command being detected */
  getCommand(): string;

  /** Get the configuration options */
  getOptions(): CompileOptions;
}
