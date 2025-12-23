# Getting Started

## Installation

```bash
git clone https://github.com/tuulbelt/tuulbelt.git
cd tuulbelt/test-flakiness-detector
npm install
```

## Basic Usage

Run your test command 10 times:

```bash
npx tsx src/index.ts --test "npm test"
```

## CLI Options

- `--test <command>` - Test command to run (required)
- `--runs <number>` - Number of times to run (default: 10, max: 1000)
- `--verbose` - Show detailed execution logs
- `--help` - Show help message

## Quick Examples

```bash
# Detect flaky npm tests
npx tsx src/index.ts --test "npm test" --runs 20

# Detect flaky Rust tests
npx tsx src/index.ts --test "cargo test" --runs 15

# Verbose mode
npx tsx src/index.ts --test "npm test" --verbose
```

## Understanding Results

- **All Pass**: No flakiness detected
- **All Fail**: Consistent failure (not flaky)
- **Mixed Results**: ⚠️ Flaky tests detected!

See [Examples](/guide/examples) for detailed scenarios.
