---
layout: home

hero:
  name: Test Flakiness Detector
  text: Find Unreliable Tests
  tagline: Detect flaky tests by running them multiple times and tracking failure rates. Zero dependencies, works with any test framework.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/tuulbelt/tuulbelt/tree/main/test-flakiness-detector

features:
  - icon:
      src: /icons/target.svg
    title: Framework Agnostic
    details: Works with any test command - npm test, cargo test, pytest, Jest, Mocha, and more. Just pass your test command and let it run.

  - icon:
      src: /icons/search.svg
    title: Detect Flakiness
    details: Runs your tests N times and identifies which ones have intermittent failures. Get detailed failure rates and statistics.

  - icon:
      src: /icons/chart.svg
    title: Detailed Reports
    details: Generates comprehensive JSON reports with pass/fail counts, failure rates, and full output capture for debugging.

  - icon:
      src: /icons/zap.svg
    title: Zero Dependencies
    details: Uses only Node.js built-in modules. No npm dependencies to manage, update, or worry about security issues.

  - icon:
      src: /icons/tool.svg
    title: CLI & Library
    details: Use as a command-line tool for quick checks or integrate as a library in your Node.js projects.

  - icon:
      src: /icons/settings.svg
    title: Configurable
    details: Control number of runs (1-1000), enable verbose logging, and customize detection parameters.

  - icon:
      src: /icons/shield.svg
    title: Type Safe
    details: Written in TypeScript with strict mode. Full type definitions for excellent IDE support.

  - icon:
      src: /icons/rocket.svg
    title: Production Ready
    details: 107+ tests covering unit, integration, performance, and stress scenarios. Battle-tested and reliable.

  - icon:
      src: /icons/book.svg
    title: Well Documented
    details: Comprehensive documentation, examples, and specifications. Know exactly what you're getting.
---

## Quick Example

Detect flaky tests in just one command:

```bash
npx tsx src/index.ts --test "npm test" --runs 10
```

Get a detailed JSON report:

```json
{
  "success": true,
  "totalRuns": 10,
  "passedRuns": 7,
  "failedRuns": 3,
  "flakyTests": [
    {
      "testName": "Test Suite",
      "failureRate": 30.0,
      "passed": 7,
      "failed": 3
    }
  ]
}
```

## Why Test Flakiness Detector?

**The Problem:** Flaky tests waste time and erode confidence in your test suite. They pass sometimes and fail sometimes, causing:
- False alarms in CI/CD pipelines
- Wasted developer time investigating
- Reduced trust in your test suite

**The Solution:** Systematic detection through repeated execution. Run your tests many times and get statistical confidence about which tests are truly flaky.

## Installation

```bash
git clone https://github.com/tuulbelt/tuulbelt/tree/main/test-flakiness-detector.git
cd test-flakiness-detector
npm install
```

No runtime dependencies. Just Node.js 18+.

## Next Steps

::: tip Getting Started
[Learn how to use the tool in 5 minutes →](/guide/getting-started)
:::

::: tip Examples
[See real-world usage examples →](/guide/examples)
:::

::: tip API Reference
[Complete API documentation →](/api/reference)
:::

## Dogfooding: Tools Working Together

This tool demonstrates the power of composability by both USING and VALIDATING other Tuulbelt tools:

### Uses CLI Progress Reporting (Library Integration)

When running ≥5 iterations, the flakiness detector integrates [CLI Progress Reporting](/tools/cli-progress-reporting/) to show real-time progress updates:

```bash
npx tsx src/index.ts --test "npm test" --runs 20 --verbose
# [INFO] Progress tracking enabled (dogfooding cli-progress-reporting)
# [INFO] Run 1/20
# [INFO] Run 2/20 passed (2 passed, 0 failed)
```

This provides live run counts and pass/fail status during long detection runs, with graceful fallback when cloned standalone.

### High-Value Composition Scripts

**[Output Diffing Utility](/tools/output-diffing-utility/)** — Find ROOT CAUSE of flaky tests:
```bash
./scripts/dogfood-diff.sh "npm test"
# Compares outputs between runs to see WHAT changes
# Helps identify: timestamps, random data, race conditions
```

**[Cross-Platform Path Normalizer](/tools/cross-platform-path-normalizer/)** — Validate path handling reliability:
```bash
./scripts/dogfood-paths.sh 10
# ✅ NO FLAKINESS DETECTED
# 145 tests × 10 runs = 1,450 executions
```

**[CLI Progress Reporting](/tools/cli-progress-reporting/)** — Bidirectional validation:
```bash
./scripts/dogfood-progress.sh 20
# Validates the tool we USE (bidirectional relationship)
# 125 tests × 20 runs = 2,500 executions
```

**Complete Phase 1 Validation Pipeline** — Validate all tools:
```bash
./scripts/dogfood-pipeline.sh 10
# Validates all 5 Phase 1 tools
# 602 tests × 10 runs = 6,020 total test executions
```

This creates a **bidirectional validation network** where tools prove their reliability by using each other in production workflows.

See `DOGFOODING_STRATEGY.md` in the repository for implementation details.

## Demo

See the tool in action detecting flaky tests in real-time.

<div style="margin: 20px 0;">
  <span style="display: inline-block; vertical-align: middle; margin-right: 8px;">
    <strong>Try it online:</strong>
  </span>
  <a href="https://stackblitz.com/github/tuulbelt/tuulbelt/tree/main/test-flakiness-detector" style="display: inline-block; vertical-align: middle;">
    <img src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt="Open in StackBlitz" style="vertical-align: middle;">
  </a>
</div>

Run the detector directly in your browser with zero setup. Test different commands, adjust run counts, and explore flakiness detection patterns.

## Part of Tuulbelt

This tool is part of [Tuulbelt](https://github.com/tuulbelt/tuulbelt) - a collection of focused, zero-dependency tools for modern software development.
