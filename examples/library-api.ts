/**
 * Library API Usage Examples
 *
 * This file demonstrates the three-tier API design for Test Flakiness Detector:
 * 1. detect() - Full detection with detailed report
 * 2. isFlaky() - Fast boolean check for CI gates
 * 3. compileDetector() - Pre-compiled detector for repeated use
 *
 * Each API follows the Result<T> pattern for non-throwing error handling.
 */

import { detect, isFlaky, compileDetector } from '../src/index.js';

// =============================================================================
// API 1: detect() - Full Detection
// =============================================================================

/**
 * detect() provides comprehensive flakiness detection with detailed reports.
 *
 * Use when you need:
 * - Detailed statistics (pass/fail counts, failure rates)
 * - Individual run results
 * - Full report for analysis or logging
 */
async function detectExample() {
  console.log('=== API 1: detect() - Full Detection ===\n');

  // Basic usage with defaults
  const result = await detect({
    test: 'npm test',
    // runs: 10 (default)
    // verbose: false (default)
    // threshold: 0.01 (default)
  });

  // Result type pattern: check .ok before accessing .value
  if (!result.ok) {
    console.error('❌ Detection failed:', result.error.message);
    return;
  }

  // Access report safely after checking .ok
  const report = result.value;

  console.log(`Total runs: ${report.totalRuns}`);
  console.log(`Passed: ${report.passedRuns}`);
  console.log(`Failed: ${report.failedRuns}`);
  console.log();

  if (report.flakyTests.length > 0) {
    console.log('⚠️  Flaky tests detected:');
    report.flakyTests.forEach((test) => {
      console.log(`  - ${test.testName}`);
      console.log(`    Failure rate: ${test.failureRate}%`);
      console.log(`    Passed: ${test.passedRuns}/${test.totalRuns}`);
    });
  } else {
    console.log('✅ No flaky tests detected');
  }

  console.log();
}

/**
 * detect() with custom configuration
 */
async function detectCustomConfig() {
  console.log('=== detect() with Custom Config ===\n');

  const result = await detect({
    test: 'npm test',
    runs: 20,           // More runs for higher confidence
    verbose: true,      // Show progress during execution
    threshold: 5.0,     // Only flag if ≥5% failure rate
  });

  if (!result.ok) {
    console.error('Error:', result.error.message);
    return;
  }

  const report = result.value;

  if (report.flakyTests.length > 0) {
    console.log(`\nDetected ${report.flakyTests.length} flaky test(s) above 5% threshold`);
  } else {
    console.log('\n✅ No tests with ≥5% failure rate');
  }

  console.log();
}

// =============================================================================
// API 2: isFlaky() - Fast Boolean Check
// =============================================================================

/**
 * isFlaky() provides a quick boolean answer optimized for CI gates.
 *
 * Use when you need:
 * - Fast feedback (fewer runs by default)
 * - Simple yes/no answer
 * - CI pipeline gates
 */
async function isFlakyExample() {
  console.log('=== API 2: isFlaky() - Fast Boolean Check ===\n');

  // Quick check with defaults (5 runs)
  const result = await isFlaky({
    test: 'npm test',
    // runs: 5 (default - faster than detect's 10)
  });

  if (!result.ok) {
    console.error('❌ Check failed:', result.error.message);
    return;
  }

  // Simple boolean result
  if (result.value) {
    console.error('⚠️  Flakiness detected! Tests are non-deterministic.');
    // In CI: process.exit(1);
  } else {
    console.log('✅ No flakiness detected. Tests appear deterministic.');
    // In CI: process.exit(0);
  }

  console.log();
}

/**
 * isFlaky() as a CI gate
 */
async function isFlakyAsCIGate() {
  console.log('=== isFlaky() as CI Gate ===\n');

  console.log('Running quick flakiness check (5 runs)...');
  const result = await isFlaky({ test: 'npm test', runs: 5 });

  if (!result.ok) {
    console.error('Error:', result.error.message);
    process.exitCode = 2;  // Set exit code without exiting immediately
    return;
  }

  if (result.value) {
    console.error('\n❌ CI GATE FAILED: Flaky tests detected');
    console.error('Please fix non-deterministic tests before merging.');
    process.exitCode = 1;
  } else {
    console.log('\n✅ CI GATE PASSED: No flaky tests');
    process.exitCode = 0;
  }

  console.log();
}

// =============================================================================
// API 3: compileDetector() - Pre-compiled Detector
// =============================================================================

/**
 * compileDetector() pre-compiles detector configuration for reuse.
 *
 * Use when you need:
 * - Multiple runs with same test command
 * - Avoid repeated validation overhead
 * - Progressive detection strategies
 */
async function compileDetectorExample() {
  console.log('=== API 3: compileDetector() - Pre-compiled Detector ===\n');

  // Compile once
  const detector = compileDetector({
    test: 'npm test',
    verbose: false,
    threshold: 0.01,
  });

  console.log(`Compiled detector for: "${detector.getCommand()}"`);
  console.log();

  // Reuse with different run counts
  console.log('Quick check (5 runs)...');
  const quick = await detector.run(5);
  if (quick.ok) {
    console.log(`  Result: ${quick.value.flakyTests.length} flaky tests`);
  }

  console.log('Standard check (10 runs)...');
  const standard = await detector.run(10);
  if (standard.ok) {
    console.log(`  Result: ${standard.value.flakyTests.length} flaky tests`);
  }

  console.log('Thorough check (20 runs)...');
  const thorough = await detector.run(20);
  if (thorough.ok) {
    console.log(`  Result: ${thorough.value.flakyTests.length} flaky tests`);
  }

  console.log();
}

// =============================================================================
// PATTERN: Error Handling with Result Type
// =============================================================================

/**
 * The Result<T> pattern provides non-throwing error handling.
 * Always check .ok before accessing .value.
 */
async function resultTypePattern() {
  console.log('=== Result Type Pattern ===\n');

  // Example: Invalid input (empty test command)
  const invalidResult = await detect({ test: '', runs: 10 });

  if (!invalidResult.ok) {
    // Error case: access .error
    console.log('✓ Caught validation error:');
    console.log(`  Message: ${invalidResult.error.message}`);
    console.log(`  Type: ${invalidResult.error.constructor.name}`);
  } else {
    // Success case: access .value
    const report = invalidResult.value;
    console.log(`Success: ${report.totalRuns} runs`);
  }

  console.log();

  // Example: Valid input
  const validResult = await detect({ test: 'echo "test"', runs: 5 });

  if (validResult.ok) {
    // Success case
    console.log('✓ Detection successful:');
    console.log(`  Runs: ${validResult.value.totalRuns}`);
    console.log(`  Flaky: ${validResult.value.flakyTests.length}`);
  } else {
    // Error case
    console.error(`Error: ${validResult.error.message}`);
  }

  console.log();
}

// =============================================================================
// PATTERN: API Selection Guide
// =============================================================================

function apiSelectionGuide() {
  console.log('=== API Selection Guide ===\n');

  console.log('Choose the right API for your use case:\n');

  console.log('📊 detect() - Use when:');
  console.log('  • You need detailed statistics');
  console.log('  • Analyzing flakiness patterns');
  console.log('  • Generating reports');
  console.log('  • Debugging test failures');
  console.log('  • Default: 10 runs\n');

  console.log('🚦 isFlaky() - Use when:');
  console.log('  • Quick CI pipeline gates');
  console.log('  • Simple pass/fail decision');
  console.log('  • Speed is critical');
  console.log('  • Don\'t need detailed reports');
  console.log('  • Default: 5 runs (faster)\n');

  console.log('📦 compileDetector() - Use when:');
  console.log('  • Running same test multiple times');
  console.log('  • Progressive detection strategies');
  console.log('  • Caching test configuration');
  console.log('  • Avoiding repeated validation\n');

  console.log('💡 All APIs use Result<T> pattern for error handling\n');
}

// =============================================================================
// COMPLETE EXAMPLE: Multi-Tier Detection Strategy
// =============================================================================

/**
 * Real-world example: Use all three APIs together
 */
async function multiTierStrategy() {
  console.log('=== Multi-Tier Detection Strategy ===\n');

  // Stage 1: Quick gate with isFlaky()
  console.log('Stage 1: Quick flakiness gate...');
  const quickCheck = await isFlaky({ test: 'npm test', runs: 5 });

  if (!quickCheck.ok) {
    console.error('Error in quick check:', quickCheck.error.message);
    return;
  }

  if (!quickCheck.value) {
    console.log('✅ Quick check passed (no flakiness in 5 runs)');
    return;
  }

  console.log('⚠️  Quick check detected possible flakiness');

  // Stage 2: Detailed analysis with detect()
  console.log('\nStage 2: Detailed analysis...');
  const detailedCheck = await detect({ test: 'npm test', runs: 20, verbose: true });

  if (!detailedCheck.ok) {
    console.error('Error in detailed check:', detailedCheck.error.message);
    return;
  }

  const report = detailedCheck.value;

  if (report.flakyTests.length > 0) {
    console.log(`\n⚠️  Confirmed: ${report.flakyTests[0].failureRate}% failure rate over 20 runs`);

    // Stage 3: Compile detector for further investigation
    console.log('\nStage 3: Compiling detector for deep analysis...');
    const detector = compileDetector({ test: 'npm test', verbose: false });

    console.log('Running 50-run deep analysis...');
    const deepCheck = await detector.run(50);

    if (deepCheck.ok && deepCheck.value.flakyTests.length > 0) {
      console.log(`⚠️  Deep analysis: ${deepCheck.value.flakyTests[0].failureRate}% failure rate (50 runs)`);
    }
  } else {
    console.log('\n✅ No flakiness confirmed in 20 runs (may have been transient)');
  }

  console.log();
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const examples = [
    { name: 'detect', fn: detectExample },
    { name: 'detect-custom', fn: detectCustomConfig },
    { name: 'isflaky', fn: isFlakyExample },
    { name: 'isflaky-ci', fn: isFlakyAsCIGate },
    { name: 'compile', fn: compileDetectorExample },
    { name: 'result-type', fn: resultTypePattern },
    { name: 'guide', fn: apiSelectionGuide },
    { name: 'multi-tier', fn: multiTierStrategy },
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
      console.error(`Available: ${examples.map((e) => e.name).join(', ')}, all`);
      process.exit(1);
    }
    await example.fn();
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
