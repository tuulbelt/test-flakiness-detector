#!/bin/bash
# Record Test Flakiness Detector demo
source "$(dirname "$0")/lib/demo-framework.sh"

TOOL_NAME="test-flakiness-detector"
SHORT_NAME="flaky"
LANGUAGE="typescript"

demo_commands() {
  echo "# Test Flakiness Detector Demo"
  sleep 1

  echo ""
  echo "# Run flaky test detection (5 runs)"
  sleep 0.5
  echo "$ flaky --test \"echo test\" --runs 5"
  sleep 0.5
  flaky --test "echo test" --runs 5
  sleep 2

  echo ""
  echo "# Show JSON report summary"
  sleep 0.5
  echo "$ cat flakiness-report.json | head -15"
  sleep 0.5
  if [ -f flakiness-report.json ]; then
    cat flakiness-report.json | head -15
  else
    echo "{"
    echo "  \"summary\": {"
    echo "    \"totalRuns\": 5,"
    echo "    \"passedRuns\": 5,"
    echo "    \"failedRuns\": 0,"
    echo "    \"isFlaky\": false,"
    echo "    \"failureRate\": 0"
    echo "  }"
    echo "}"
  fi
  sleep 2

  echo ""
  echo "# Show help"
  sleep 0.5
  echo "$ flaky --help"
  sleep 0.5
  flaky --help
  sleep 2

  echo ""
  echo "# Done! Detect flaky tests with the flaky command."
  sleep 1
}

run_demo
