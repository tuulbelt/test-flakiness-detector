/**
 * Pre-compiled Detector Examples
 *
 * This file demonstrates how to use compileDetector() to pre-compile
 * detector configuration for repeated use with different run counts.
 *
 * This is useful when you want to:
 * - Cache detector configuration for multiple runs
 * - Reuse the same test command with different strategies
 * - Avoid validation overhead on repeated calls
 */

import { compileDetector, type CompiledDetector } from '../src/index.js';

// =============================================================================
// EXAMPLE 1: Basic Compiled Detector Usage
// =============================================================================

async function basicCompiledDetector() {
  console.log('=== Example 1: Basic Compiled Detector ===\n');

  // Compile detector once with test command
  const detector = compileDetector({
    test: 'npm test',
    verbose: false,
  });

  console.log(`Compiled detector for: ${detector.getCommand()}`);
  console.log();

  // Run with different counts
  console.log('Quick check (5 runs)...');
  const quickResult = await detector.run(5);
  if (quickResult.ok) {
    console.log(`✓ Quick check: ${quickResult.value.flakyTests.length} flaky tests`);
  }

  console.log('\nThorough check (20 runs)...');
  const thoroughResult = await detector.run(20);
  if (thoroughResult.ok) {
    console.log(`✓ Thorough check: ${thoroughResult.value.flakyTests.length} flaky tests`);
  }
}

// =============================================================================
// EXAMPLE 2: Progressive Flakiness Detection
// =============================================================================

/**
 * Progressive detection strategy:
 * - Start with quick check (5 runs)
 * - If suspicious, run more tests progressively
 * - Stop early if definitive result found
 */
async function progressiveDetection() {
  console.log('\n=== Example 2: Progressive Detection Strategy ===\n');

  const detector = compileDetector({
    test: 'npm test',
    verbose: true,
  });

  // Stage 1: Quick check
  console.log('Stage 1: Quick check (5 runs)...');
  const stage1 = await detector.run(5);

  if (!stage1.ok) {
    console.error('Detection failed:', stage1.error.message);
    return;
  }

  if (stage1.value.flakyTests.length === 0 && stage1.value.failedRuns === 0) {
    console.log('✅ Stage 1: All tests passed. Looks good!');
    return;
  }

  // Stage 2: Medium check if suspicious
  console.log('\nStage 2: Medium check (15 runs)...');
  const stage2 = await detector.run(15);

  if (!stage2.ok) {
    console.error('Detection failed:', stage2.error.message);
    return;
  }

  if (stage2.value.flakyTests.length > 0) {
    console.log(`⚠️  Stage 2: Flakiness confirmed (${stage2.value.flakyTests[0].failureRate}% failure rate)`);
    return;
  }

  // Stage 3: Deep check for edge cases
  console.log('\nStage 3: Deep check (50 runs)...');
  const stage3 = await detector.run(50);

  if (!stage3.ok) {
    console.error('Detection failed:', stage3.error.message);
    return;
  }

  if (stage3.value.flakyTests.length > 0) {
    console.log(`⚠️  Stage 3: Rare flakiness detected (${stage3.value.flakyTests[0].failureRate}% failure rate)`);
  } else {
    console.log('✅ Stage 3: Tests appear deterministic (no flakiness in 50 runs)');
  }
}

// =============================================================================
// EXAMPLE 3: Cached Detector Pool
// =============================================================================

/**
 * Maintain a pool of pre-compiled detectors for different test suites
 */
class DetectorPool {
  private detectors: Map<string, CompiledDetector> = new Map();

  getOrCreate(testCommand: string, options: { verbose?: boolean; threshold?: number } = {}): CompiledDetector {
    const key = `${testCommand}:${JSON.stringify(options)}`;

    if (!this.detectors.has(key)) {
      console.log(`📦 Creating new detector for: ${testCommand}`);
      const detector = compileDetector({
        test: testCommand,
        ...options,
      });
      this.detectors.set(key, detector);
    }

    return this.detectors.get(key)!;
  }

  size(): number {
    return this.detectors.size;
  }
}

async function detectorPoolExample() {
  console.log('\n=== Example 3: Detector Pool ===\n');

  const pool = new DetectorPool();

  // Run multiple test suites
  const suites = [
    'npm run test:unit',
    'npm run test:integration',
    'npm run test:e2e',
  ];

  for (const suite of suites) {
    console.log(`Running: ${suite}`);
    const detector = pool.getOrCreate(suite, { verbose: false });
    const result = await detector.run(10);

    if (result.ok) {
      const report = result.value;
      console.log(`  ✓ Completed: ${report.passedRuns}/${report.totalRuns} passed`);
      if (report.flakyTests.length > 0) {
        console.log(`  ⚠️  Flaky tests: ${report.flakyTests.length}`);
      }
    }
    console.log();
  }

  console.log(`Total detectors in pool: ${pool.size()}`);
}

// =============================================================================
// EXAMPLE 4: Adaptive Run Count
// =============================================================================

/**
 * Adaptive strategy:
 * - Adjust run count based on previous failure rate
 * - More runs for tests with low failure rates
 * - Fewer runs for obvious failures
 */
async function adaptiveRunCount() {
  console.log('\n=== Example 4: Adaptive Run Count ===\n');

  const detector = compileDetector({
    test: 'npm test',
    verbose: false,
  });

  // Start with baseline
  console.log('Baseline check (10 runs)...');
  const baseline = await detector.run(10);

  if (!baseline.ok) {
    console.error('Detection failed:', baseline.error.message);
    return;
  }

  const baselineReport = baseline.value;

  if (baselineReport.flakyTests.length === 0) {
    console.log('✅ No flakiness detected in baseline');
    return;
  }

  // Adaptive run count based on failure rate
  const failureRate = baselineReport.flakyTests[0].failureRate;
  let adaptiveRuns: number;

  if (failureRate > 20) {
    // High failure rate: fewer runs needed
    adaptiveRuns = 15;
    console.log(`\nHigh failure rate (${failureRate}%), using ${adaptiveRuns} runs`);
  } else if (failureRate > 5) {
    // Medium failure rate: moderate runs
    adaptiveRuns = 30;
    console.log(`\nMedium failure rate (${failureRate}%), using ${adaptiveRuns} runs`);
  } else {
    // Low failure rate: more runs for confidence
    adaptiveRuns = 100;
    console.log(`\nLow failure rate (${failureRate}%), using ${adaptiveRuns} runs for confidence`);
  }

  console.log('Running adaptive check...');
  const adaptiveResult = await detector.run(adaptiveRuns);

  if (adaptiveResult.ok) {
    const report = adaptiveResult.value;
    if (report.flakyTests.length > 0) {
      console.log(`⚠️  Confirmed flakiness: ${report.flakyTests[0].failureRate}% failure rate over ${adaptiveRuns} runs`);
    }
  }
}

// =============================================================================
// EXAMPLE 5: Detector Introspection
// =============================================================================

/**
 * Inspect compiled detector configuration
 */
function detectorIntrospection() {
  console.log('\n=== Example 5: Detector Introspection ===\n');

  const detector = compileDetector({
    test: 'npm test',
    verbose: true,
    threshold: 5.0,
  });

  // Inspect configuration
  const command = detector.getCommand();
  const options = detector.getOptions();

  console.log('Detector Configuration:');
  console.log(`  Command: ${command}`);
  console.log(`  Verbose: ${options.verbose}`);
  console.log(`  Threshold: ${options.threshold}%`);
  console.log();

  console.log('This detector can be reused with different run counts:');
  console.log('  await detector.run(5)   // Quick check');
  console.log('  await detector.run(20)  // Standard check');
  console.log('  await detector.run(100) // Comprehensive check');
}

// =============================================================================
// EXAMPLE 6: Error Handling with Compiled Detectors
// =============================================================================

async function errorHandling() {
  console.log('\n=== Example 6: Error Handling ===\n');

  try {
    // This will throw at compile time (validation happens immediately)
    const detector = compileDetector({
      test: '',  // Invalid: empty command
    });

    // This won't be reached
    await detector.run(10);
  } catch (error) {
    console.log('✓ Caught compile-time error:', (error as Error).message);
  }

  // Valid detector but invalid run count
  const detector = compileDetector({ test: 'npm test' });

  const result = await detector.run(0);  // Invalid: runs must be >= 1
  if (result.ok === false) {
    console.log('✓ Caught runtime error:', result.error.message);
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const examples = [
    { name: 'basic', fn: basicCompiledDetector },
    { name: 'progressive', fn: progressiveDetection },
    { name: 'pool', fn: detectorPoolExample },
    { name: 'adaptive', fn: adaptiveRunCount },
    { name: 'introspection', fn: detectorIntrospection },
    { name: 'error-handling', fn: errorHandling },
  ];

  const args = process.argv.slice(2);
  const exampleName = args[0];

  if (!exampleName || exampleName === 'all') {
    // Run all examples
    for (const example of examples) {
      await example.fn();
    }
  } else {
    // Run specific example
    const example = examples.find((e) => e.name === exampleName);
    if (!example) {
      console.error(`Unknown example: ${exampleName}`);
      console.error(`Available: ${examples.map((e) => e.name).join(', ')}`);
      process.exit(1);
    }
    await example.fn();
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
