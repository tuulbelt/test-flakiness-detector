/**
 * Parallel Test Suites Examples
 *
 * This file demonstrates how to detect flakiness across multiple test suites,
 * combining results from different test commands, and analyzing patterns.
 */

import { detect, compileDetector, type DetectionReport, type Result } from '../src/index.js';

// =============================================================================
// EXAMPLE 1: Sequential Suite Detection
// =============================================================================

/**
 * Run multiple test suites sequentially and collect results
 */
async function sequentialSuiteDetection() {
  console.log('=== Example 1: Sequential Suite Detection ===\n');

  const suites = [
    { name: 'Unit Tests', command: 'npm run test:unit' },
    { name: 'Integration Tests', command: 'npm run test:integration' },
    { name: 'E2E Tests', command: 'npm run test:e2e' },
  ];

  const results: Array<{ name: string; result: Result<DetectionReport> }> = [];

  for (const suite of suites) {
    console.log(`Testing: ${suite.name}...`);
    const result = await detect({
      test: suite.command,
      runs: 10,
      verbose: false,
    });
    results.push({ name: suite.name, result });
    console.log(`  ✓ Completed\n`);
  }

  // Summary
  console.log('=== Summary ===\n');
  let totalFlaky = 0;

  for (const { name, result } of results) {
    if (result.ok) {
      const flakyCount = result.value.flakyTests.length;
      totalFlaky += flakyCount;

      if (flakyCount > 0) {
        console.log(`❌ ${name}: ${flakyCount} flaky test(s)`);
        result.value.flakyTests.forEach((test) => {
          console.log(`   - ${test.testName}: ${test.failureRate}% failure rate`);
        });
      } else {
        console.log(`✅ ${name}: No flaky tests`);
      }
    } else {
      console.log(`⚠️  ${name}: Detection failed - ${result.error.message}`);
    }
  }

  console.log(`\nTotal flaky tests across all suites: ${totalFlaky}`);
  console.log();
}

// =============================================================================
// EXAMPLE 2: Compiled Detectors for Multiple Suites
// =============================================================================

/**
 * Pre-compile detectors for each suite for efficient reuse
 */
async function compiledMultiSuiteDetection() {
  console.log('=== Example 2: Compiled Multi-Suite Detection ===\n');

  const suites = [
    { name: 'Unit', command: 'npm run test:unit' },
    { name: 'Integration', command: 'npm run test:integration' },
    { name: 'E2E', command: 'npm run test:e2e' },
  ];

  // Compile all detectors upfront
  console.log('Compiling detectors...');
  const detectors = suites.map((suite) => ({
    name: suite.name,
    detector: compileDetector({
      test: suite.command,
      verbose: false,
    }),
  }));
  console.log(`✓ ${detectors.length} detectors compiled\n`);

  // Quick check (5 runs each)
  console.log('Quick check (5 runs per suite)...');
  for (const { name, detector } of detectors) {
    const result = await detector.run(5);
    if (result.ok) {
      const flaky = result.value.flakyTests.length;
      console.log(`  ${name}: ${flaky} flaky test(s)`);
    }
  }

  console.log('\nThorough check (20 runs per suite)...');
  for (const { name, detector } of detectors) {
    const result = await detector.run(20);
    if (result.ok) {
      const flaky = result.value.flakyTests.length;
      console.log(`  ${name}: ${flaky} flaky test(s)`);
    }
  }

  console.log();
}

// =============================================================================
// EXAMPLE 3: Aggregate Statistics
// =============================================================================

/**
 * Collect and aggregate statistics across multiple suites
 */
async function aggregateStatistics() {
  console.log('=== Example 3: Aggregate Statistics ===\n');

  const suites = [
    'npm run test:unit',
    'npm run test:integration',
    'npm run test:e2e',
  ];

  // Collect all reports
  const reports: DetectionReport[] = [];

  for (const suite of suites) {
    const result = await detect({ test: suite, runs: 10, verbose: false });
    if (result.ok) {
      reports.push(result.value);
    }
  }

  // Aggregate statistics
  const totalRuns = reports.reduce((sum, r) => sum + r.totalRuns, 0);
  const totalPassed = reports.reduce((sum, r) => sum + r.passedRuns, 0);
  const totalFailed = reports.reduce((sum, r) => sum + r.failedRuns, 0);
  const totalFlaky = reports.reduce((sum, r) => sum + r.flakyTests.length, 0);

  console.log('Aggregate Statistics:');
  console.log(`  Total test executions: ${totalRuns}`);
  console.log(`  Passed: ${totalPassed} (${((totalPassed / totalRuns) * 100).toFixed(1)}%)`);
  console.log(`  Failed: ${totalFailed} (${((totalFailed / totalRuns) * 100).toFixed(1)}%)`);
  console.log(`  Flaky test suites: ${totalFlaky}`);
  console.log();

  // Find highest failure rate
  let maxFailureRate = 0;
  let maxFailureSuite = '';

  for (const report of reports) {
    if (report.flakyTests.length > 0) {
      const rate = report.flakyTests[0].failureRate;
      if (rate > maxFailureRate) {
        maxFailureRate = rate;
        maxFailureSuite = report.flakyTests[0].testName;
      }
    }
  }

  if (maxFailureRate > 0) {
    console.log(`Most flaky suite: ${maxFailureSuite} (${maxFailureRate}% failure rate)`);
  }

  console.log();
}

// =============================================================================
// EXAMPLE 4: Prioritized Suite Testing
// =============================================================================

/**
 * Test suites in priority order, stop early if critical suite is flaky
 */
async function prioritizedSuiteTesting() {
  console.log('=== Example 4: Prioritized Suite Testing ===\n');

  const suites = [
    { name: 'Critical: Auth', command: 'npm run test:auth', critical: true },
    { name: 'Critical: Payment', command: 'npm run test:payment', critical: true },
    { name: 'Standard: UI', command: 'npm run test:ui', critical: false },
    { name: 'Standard: API', command: 'npm run test:api', critical: false },
  ];

  for (const suite of suites) {
    console.log(`Testing: ${suite.name}...`);
    const result = await detect({
      test: suite.command,
      runs: suite.critical ? 20 : 10,  // More runs for critical suites
      verbose: false,
    });

    if (result.ok === false) {
      console.error(`  ⚠️  Detection failed: ${result.error.message}\n`);
      continue;
    }

    const report = result.value;

    if (report.flakyTests.length > 0) {
      console.log(`  ❌ FLAKY (${report.flakyTests[0].failureRate}% failure rate)`);

      if (suite.critical) {
        console.error('\n🚨 CRITICAL SUITE FAILURE - Stopping further testing\n');
        console.error('Please fix critical test flakiness before testing other suites.');
        return;  // Early exit
      }
    } else {
      console.log(`  ✅ No flakiness detected`);
    }

    console.log();
  }

  console.log('✅ All suites tested successfully');
  console.log();
}

// =============================================================================
// EXAMPLE 5: Comparative Analysis
// =============================================================================

/**
 * Compare flakiness across different environments or configurations
 */
async function comparativeAnalysis() {
  console.log('=== Example 5: Comparative Analysis ===\n');

  const environments = [
    { name: 'Development', command: 'npm test' },
    { name: 'CI', command: 'CI=true npm test' },
    { name: 'Production-like', command: 'NODE_ENV=production npm test' },
  ];

  const results = new Map<string, DetectionReport>();

  for (const env of environments) {
    console.log(`Testing in ${env.name} environment...`);
    const result = await detect({
      test: env.command,
      runs: 15,
      verbose: false,
    });

    if (result.ok) {
      results.set(env.name, result.value);
      console.log(`  ✓ Completed\n`);
    }
  }

  // Compare results
  console.log('=== Comparison ===\n');

  for (const [envName, report] of results) {
    const passRate = ((report.passedRuns / report.totalRuns) * 100).toFixed(1);
    const flakyCount = report.flakyTests.length;

    console.log(`${envName}:`);
    console.log(`  Pass rate: ${passRate}%`);
    console.log(`  Flaky tests: ${flakyCount}`);

    if (flakyCount > 0) {
      console.log(`  Failure rate: ${report.flakyTests[0].failureRate}%`);
    }

    console.log();
  }

  // Find environment-specific flakiness
  const devReport = results.get('Development');
  const ciReport = results.get('CI');

  if (devReport && ciReport) {
    const devFlaky = devReport.flakyTests.length > 0;
    const ciFlaky = ciReport.flakyTests.length > 0;

    if (!devFlaky && ciFlaky) {
      console.log('⚠️  CI-specific flakiness detected (passes locally, fails in CI)');
    } else if (devFlaky && !ciFlaky) {
      console.log('⚠️  Local environment flakiness (fails locally, passes in CI)');
    } else if (devFlaky && ciFlaky) {
      console.log('⚠️  Flakiness in both environments');
    } else {
      console.log('✅ No flakiness in any environment');
    }
  }

  console.log();
}

// =============================================================================
// EXAMPLE 6: Matrix Testing
// =============================================================================

/**
 * Test matrix: Multiple suites × Multiple configurations
 */
async function matrixTesting() {
  console.log('=== Example 6: Matrix Testing ===\n');

  const suites = ['npm run test:unit', 'npm run test:integration'];
  const nodeVersions = ['18', '20', '22'];

  console.log('Testing matrix: 2 suites × 3 Node versions = 6 combinations\n');

  for (const suite of suites) {
    console.log(`Suite: ${suite}`);

    for (const nodeVersion of nodeVersions) {
      // Simulate different Node versions (in real scenario, use nvm or Docker)
      const result = await detect({
        test: suite,
        runs: 10,
        verbose: false,
      });

      if (result.ok) {
        const flaky = result.value.flakyTests.length;
        const status = flaky > 0 ? '❌' : '✅';
        console.log(`  ${status} Node ${nodeVersion}: ${flaky} flaky test(s)`);
      }
    }

    console.log();
  }
}

// =============================================================================
// EXAMPLE 7: Report Generation
// =============================================================================

/**
 * Generate comprehensive report across all suites
 */
async function generateComprehensiveReport() {
  console.log('=== Example 7: Comprehensive Report Generation ===\n');

  const suites = [
    { name: 'Unit Tests', command: 'npm run test:unit', runs: 10 },
    { name: 'Integration Tests', command: 'npm run test:integration', runs: 15 },
    { name: 'E2E Tests', command: 'npm run test:e2e', runs: 20 },
  ];

  interface SuiteReport {
    name: string;
    success: boolean;
    totalRuns: number;
    passRate: number;
    flakyCount: number;
    maxFailureRate: number;
  }

  const suiteReports: SuiteReport[] = [];

  for (const suite of suites) {
    console.log(`Running: ${suite.name} (${suite.runs} runs)...`);
    const result = await detect({
      test: suite.command,
      runs: suite.runs,
      verbose: false,
    });

    if (result.ok) {
      const report = result.value;
      const passRate = (report.passedRuns / report.totalRuns) * 100;
      const maxFailureRate = report.flakyTests.length > 0
        ? Math.max(...report.flakyTests.map((t) => t.failureRate))
        : 0;

      suiteReports.push({
        name: suite.name,
        success: report.success,
        totalRuns: report.totalRuns,
        passRate,
        flakyCount: report.flakyTests.length,
        maxFailureRate,
      });
    }
  }

  // Generate report
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║         Test Flakiness Report                         ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  for (const report of suiteReports) {
    console.log(`Suite: ${report.name}`);
    console.log(`  Total runs: ${report.totalRuns}`);
    console.log(`  Pass rate: ${report.passRate.toFixed(1)}%`);
    console.log(`  Flaky tests: ${report.flakyCount}`);

    if (report.flakyCount > 0) {
      console.log(`  Max failure rate: ${report.maxFailureRate.toFixed(1)}%`);
      console.log(`  Status: ❌ NEEDS ATTENTION`);
    } else {
      console.log(`  Status: ✅ STABLE`);
    }

    console.log();
  }

  // Overall assessment
  const allStable = suiteReports.every((r) => r.flakyCount === 0);
  const totalFlaky = suiteReports.reduce((sum, r) => sum + r.flakyCount, 0);

  console.log('═══════════════════════════════════════════════════════');
  if (allStable) {
    console.log('✅ OVERALL: All test suites are stable');
  } else {
    console.log(`⚠️  OVERALL: ${totalFlaky} flaky test suite(s) require attention`);
  }
  console.log('═══════════════════════════════════════════════════════\n');
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const examples = [
    { name: 'sequential', fn: sequentialSuiteDetection },
    { name: 'compiled', fn: compiledMultiSuiteDetection },
    { name: 'aggregate', fn: aggregateStatistics },
    { name: 'prioritized', fn: prioritizedSuiteTesting },
    { name: 'comparative', fn: comparativeAnalysis },
    { name: 'matrix', fn: matrixTesting },
    { name: 'report', fn: generateComprehensiveReport },
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
