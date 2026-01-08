/**
 * CI/CD Integration Examples
 *
 * This file demonstrates how to integrate Test Flakiness Detector into various CI/CD systems.
 * Each example shows best practices for detecting and reporting flaky tests in automated pipelines.
 */

import { detect, isFlaky } from '../src/index.js';

// =============================================================================
// GITHUB ACTIONS
// =============================================================================

/**
 * GitHub Actions Integration
 *
 * Use isFlaky() for fast CI gates that fail the build if flakiness is detected.
 *
 * Example .github/workflows/test.yml:
 *
 * ```yaml
 * name: Test
 * on: [push, pull_request]
 * jobs:
 *   test:
 *     runs-on: ubuntu-latest
 *     steps:
 *       - uses: actions/checkout@v4
 *       - uses: actions/setup-node@v4
 *         with:
 *           node-version: 20
 *       - run: npm ci
 *       - run: npm test
 *       - name: Check for flaky tests
 *         run: npx tsx examples/ci-integration.ts github-actions
 * ```
 */
async function githubActions() {
  console.log('🔍 GitHub Actions: Checking for flaky tests...');

  const result = await isFlaky({
    test: 'npm test',
    runs: 5,  // Fast: 5 runs for quick feedback
  });

  if (!result.ok) {
    console.error('❌ Flakiness detection failed:', result.error.message);
    process.exit(2);
  }

  if (result.value) {
    console.error('⚠️  FLAKY TESTS DETECTED!');
    console.error('Some tests are non-deterministic and may fail intermittently.');
    console.error('Please investigate and fix before merging.');

    // GitHub Actions will mark this step as failed
    process.exit(1);
  }

  console.log('✅ No flaky tests detected');
  process.exit(0);
}

/**
 * GitHub Actions with Full Report
 *
 * Use detect() for detailed reports that can be saved as artifacts.
 *
 * Example .github/workflows/nightly-flakiness-check.yml:
 *
 * ```yaml
 * name: Nightly Flakiness Check
 * on:
 *   schedule:
 *     - cron: '0 2 * * *'  # 2 AM daily
 * jobs:
 *   flakiness-check:
 *     runs-on: ubuntu-latest
 *     steps:
 *       - uses: actions/checkout@v4
 *       - uses: actions/setup-node@v4
 *       - run: npm ci
 *       - name: Deep flakiness detection
 *         run: npx tsx examples/ci-integration.ts github-actions-full
 *       - name: Upload flakiness report
 *         if: always()
 *         uses: actions/upload-artifact@v4
 *         with:
 *           name: flakiness-report
 *           path: flakiness-report.json
 * ```
 */
async function githubActionsFull() {
  console.log('🔍 GitHub Actions (Full Report): Running comprehensive flakiness check...');

  const result = await detect({
    test: 'npm test',
    runs: 20,  // Thorough: 20 runs for comprehensive detection
    verbose: true,
  });

  if (!result.ok) {
    console.error('❌ Detection failed:', result.error.message);
    process.exit(2);
  }

  const report = result.value;

  // Save report as JSON artifact
  const fs = await import('node:fs');
  fs.writeFileSync('flakiness-report.json', JSON.stringify(report, null, 2));
  console.log('📄 Report saved to flakiness-report.json');

  if (!report.success) {
    console.error(`⚠️  ${report.flakyTests.length} flaky test(s) detected:`);
    report.flakyTests.forEach((test) => {
      console.error(`  - ${test.testName}: ${test.failureRate}% failure rate`);
    });
    process.exit(1);
  }

  console.log('✅ No flaky tests found');
  process.exit(0);
}

// =============================================================================
// GITLAB CI
// =============================================================================

/**
 * GitLab CI Integration
 *
 * Example .gitlab-ci.yml:
 *
 * ```yaml
 * test:
 *   stage: test
 *   script:
 *     - npm ci
 *     - npm test
 *     - npx tsx examples/ci-integration.ts gitlab-ci
 *   artifacts:
 *     when: always
 *     paths:
 *       - flakiness-report.json
 *     reports:
 *       junit: flakiness-report.json
 * ```
 */
async function gitlabCI() {
  console.log('🔍 GitLab CI: Checking for flaky tests...');

  const result = await detect({
    test: 'npm test',
    runs: 10,
    verbose: false,
  });

  if (!result.ok) {
    console.error('❌ Detection failed:', result.error.message);
    process.exit(2);
  }

  const report = result.value;

  // Save as artifact for GitLab
  const fs = await import('node:fs');
  fs.writeFileSync('flakiness-report.json', JSON.stringify(report, null, 2));

  if (!report.success) {
    console.error(`⚠️  ${report.flakyTests.length} flaky test(s) detected`);
    process.exit(1);
  }

  console.log('✅ No flaky tests detected');
  process.exit(0);
}

// =============================================================================
// JENKINS
// =============================================================================

/**
 * Jenkins Pipeline Integration
 *
 * Example Jenkinsfile:
 *
 * ```groovy
 * pipeline {
 *   agent any
 *   stages {
 *     stage('Test') {
 *       steps {
 *         sh 'npm ci'
 *         sh 'npm test'
 *       }
 *     }
 *     stage('Flakiness Check') {
 *       steps {
 *         sh 'npx tsx examples/ci-integration.ts jenkins'
 *         archiveArtifacts artifacts: 'flakiness-report.json', allowEmptyArchive: true
 *       }
 *     }
 *   }
 *   post {
 *     failure {
 *       echo 'Flaky tests detected! Review flakiness-report.json'
 *     }
 *   }
 * }
 * ```
 */
async function jenkins() {
  console.log('🔍 Jenkins: Running flakiness detection...');

  const result = await detect({
    test: 'npm test',
    runs: 15,
    verbose: true,
  });

  if (!result.ok) {
    console.error('❌ Detection failed:', result.error.message);
    process.exit(2);
  }

  const report = result.value;

  // Save report for Jenkins artifact
  const fs = await import('node:fs');
  fs.writeFileSync('flakiness-report.json', JSON.stringify(report, null, 2));
  console.log('📄 Report saved to flakiness-report.json');

  if (!report.success) {
    console.error(`⚠️  Flaky tests detected (${report.flakyTests.length}):`);
    report.flakyTests.forEach((test) => {
      console.error(`  ❌ ${test.testName}`);
      console.error(`     Failure rate: ${test.failureRate}%`);
      console.error(`     Passed: ${test.passedRuns}/${test.totalRuns}`);
    });
    process.exit(1);
  }

  console.log('✅ All tests are deterministic');
  process.exit(0);
}

// =============================================================================
// CIRCLECI
// =============================================================================

/**
 * CircleCI Integration
 *
 * Example .circleci/config.yml:
 *
 * ```yaml
 * version: 2.1
 * jobs:
 *   test:
 *     docker:
 *       - image: cimg/node:20.11
 *     steps:
 *       - checkout
 *       - run: npm ci
 *       - run: npm test
 *       - run:
 *           name: Check for flaky tests
 *           command: npx tsx examples/ci-integration.ts circleci
 *       - store_artifacts:
 *           path: flakiness-report.json
 *           destination: flakiness-report
 * ```
 */
async function circleci() {
  console.log('🔍 CircleCI: Flakiness detection...');

  const result = await isFlaky({
    test: 'npm test',
    runs: 5,
  });

  if (!result.ok) {
    console.error('❌ Error:', result.error.message);
    process.exit(2);
  }

  if (result.value) {
    // Get full report for artifact
    const fullResult = await detect({ test: 'npm test', runs: 10 });
    if (fullResult.ok) {
      const fs = await import('node:fs');
      fs.writeFileSync('flakiness-report.json', JSON.stringify(fullResult.value, null, 2));
    }

    console.error('⚠️  Flaky tests detected!');
    process.exit(1);
  }

  console.log('✅ No flakiness detected');
  process.exit(0);
}

// =============================================================================
// MAIN
// =============================================================================

const args = process.argv.slice(2);
const mode = args[0] || 'github-actions';

switch (mode) {
  case 'github-actions':
    await githubActions();
    break;
  case 'github-actions-full':
    await githubActionsFull();
    break;
  case 'gitlab-ci':
    await gitlabCI();
    break;
  case 'jenkins':
    await jenkins();
    break;
  case 'circleci':
    await circleci();
    break;
  default:
    console.error(`Unknown mode: ${mode}`);
    console.error('Usage: tsx ci-integration.ts <mode>');
    console.error('Modes: github-actions | github-actions-full | gitlab-ci | jenkins | circleci');
    process.exit(2);
}
