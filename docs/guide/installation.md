# Installation

## Prerequisites

- **Node.js 18+** required
- No other dependencies needed

Check your Node version:
```bash
node --version  # Should be v18.0.0 or higher
```

## Installation Methods

### Method 1: Clone from GitHub (Recommended)

```bash
git clone https://github.com/tuulbelt/tuulbelt.git
cd tuulbelt/test-flakiness-detector
npm install
```

### Method 2: Direct Download

Download the source code:
```bash
wget https://github.com/tuulbelt/tuulbelt/archive/refs/heads/main.zip
unzip main.zip
cd tuulbelt-main/test-flakiness-detector
npm install
```

### Method 3: As Submodule (for existing projects)

Add as git submodule:
```bash
git submodule add https://github.com/tuulbelt/tuulbelt.git vendor/tuulbelt
cd vendor/tuulbelt/test-flakiness-detector
npm install
```

## Verify Installation

Test that it works:

```bash
flaky --test "echo 'test passed'" --runs 5
```

You should see JSON output indicating 5 successful runs.

## What Gets Installed

**Zero runtime dependencies** - only dev dependencies for TypeScript:

```json
{
  "devDependencies": {
    "@types/node": "^20.x",
    "tsx": "^4.x",
    "typescript": "^5.x"
  }
}
```

These are only needed for:
- Running with `tsx` (TypeScript execution)
- Building with `tsc` (TypeScript compilation)
- Type definitions (IDE support)

## Build from Source (Optional)

Compile TypeScript to JavaScript:

```bash
npm run build
```

This creates `dist/index.js` that can run without `tsx`:

```bash
node dist/index.js --test "npm test" --runs 10
```

## Uninstall

Simply delete the directory:

```bash
rm -rf test-flakiness-detector
```

No system-wide changes, no registry entries, no configuration files outside the project.

## Troubleshooting

**"tsx: command not found"**
```bash
npm install  # Ensure devDependencies are installed
```

**"Cannot find module @types/node"**
```bash
npm install --save-dev @types/node
```

**Permission errors**
```bash
sudo npm install  # On Linux/Mac if needed
```

## Next Steps

- [Getting Started](/guide/getting-started) - Run your first detection
- [CLI Usage](/guide/cli-usage) - Learn command-line options
