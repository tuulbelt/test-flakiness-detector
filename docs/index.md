---
layout: home

hero:
  name: Test Flakiness Detector
  text: Find Unreliable Tests
  tagline: Detect flaky tests by running them multiple times and tracking failure rates. Zero dependencies, works with any test framework.
  image:
    src: /logo.svg
    alt: Test Flakiness Detector
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/tuulbelt/tuulbelt/tree/main/test-flakiness-detector

features:
  - icon: 🎯
    title: Framework Agnostic
    details: Works with any test command - npm test, cargo test, pytest, Jest, Mocha, and more. Just pass your test command and let it run.

  - icon: 🔍
    title: Detect Flakiness
    details: Runs your tests N times and identifies which ones have intermittent failures. Get detailed failure rates and statistics.

  - icon: 📊
    title: Detailed Reports
    details: Generates comprehensive JSON reports with pass/fail counts, failure rates, and full output capture for debugging.

  - icon: ⚡
    title: Zero Dependencies
    details: Uses only Node.js built-in modules. No npm dependencies to manage, update, or worry about security issues.

  - icon: 🛠️
    title: CLI & Library
    details: Use as a command-line tool for quick checks or integrate as a library in your Node.js projects.

  - icon: 📈
    title: Configurable
    details: Control number of runs (1-1000), enable verbose logging, and customize detection parameters.

  - icon: 🔒
    title: Type Safe
    details: Written in TypeScript with strict mode. Full type definitions for excellent IDE support.

  - icon: 🚀
    title: Production Ready
    details: 107+ tests covering unit, integration, performance, and stress scenarios. Battle-tested and reliable.

  - icon: 📖
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

<div class="vp-card-container">
  <a href="/guide/getting-started" class="vp-card">
    <h3>Getting Started →</h3>
    <p>Learn how to use the tool in 5 minutes</p>
  </a>

  <a href="/guide/examples" class="vp-card">
    <h3>Examples →</h3>
    <p>See real-world usage examples</p>
  </a>

  <a href="/api/reference" class="vp-card">
    <h3>API Reference →</h3>
    <p>Complete API documentation</p>
  </a>
</div>

## Part of Tuulbelt

This tool is part of [Tuulbelt](https://github.com/tuulbelt/tuulbelt) - a collection of focused, zero-dependency tools for modern software development.
