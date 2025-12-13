# Git Hooks Documentation

## Overview
This project uses Husky for git hooks automation. Hooks run automatically at key git lifecycle points to ensure code quality and consistency.

## Pre-commit Hook (.husky/pre-commit)

**Location:** `.husky/pre-commit`  
**Script:** `.husky/scripts/pre-commit-tasks.js`  
**Trigger:** Before every commit

### Tasks Executed:
1. **Auto-format code** with Prettier
   - Formats all TypeScript files in `src/` and `tests/`
   - Automatically stages formatting changes
   - Runs: `npm run format`

2. **Validate version consistency**
   - Checks if `package.json` version matches `src/index.ts` VERSION constant
   - Auto-fixes mismatches by updating `src/index.ts`
   - Auto-stages the fixed file

### Behavior:
- ✅ Passes → Commit proceeds normally
- ❌ Fails → Commit is blocked until issues are resolved
- 🔧 Auto-fixes → Formatting and version updates are automatically staged

### Manual Execution:
```bash
node .husky/scripts/pre-commit-tasks.js
```

## Post-commit Hook (.husky/post-commit)

**Location:** `.husky/post-commit`  
**Script:** `.husky/scripts/post-commit-tasks.js`  
**Trigger:** After every commit

### Tasks Executed:
1. **Detect version bump commits**
   - Looks for commit messages containing "bump version" or "chore: bump"
   - Extracts version from `package.json`

2. **Auto-create release tags**
   - Creates annotated git tag (e.g., `v1.2.5`)
   - Skips if tag already exists
   - Non-blocking (won't fail the commit if tagging fails)

### Behavior:
- 🏷️ Version bump detected → Automatic tag created
- ⚠️ Tag exists → Skips tag creation (prevents duplicates)
- 🔵 Non-blocking → Always succeeds without breaking the commit

### Manual Execution:
```bash
node .husky/scripts/post-commit-tasks.js
```

## Version Sync Script (.husky/scripts/validate-versions.js)

**Purpose:** Ensures VERSION constant in code always matches package.json

### How it works:
1. Reads `package.json` version
2. Reads `src/index.ts` VERSION constant
3. Compares versions:
   - ✅ Match → Exit successfully
   - ❌ Mismatch → Auto-fix and stage `src/index.ts`
   - ❌ Missing constant → Error and exit

### Manual Execution:
```bash
node .husky/scripts/validate-versions.js
```

## Workflow Example: Creating a Release

### Scenario: Bumping version from 1.2.5 to 1.2.6

```bash
# 1. Update package.json
npm version patch  # or manually edit to 1.2.6

# 2. Create commit
git add package.json
git commit -m "chore: bump version to 1.2.6"

# What happens automatically:
# ├─ Pre-commit hook runs:
# │  ├─ Auto-formats code
# │  └─ Syncs VERSION constant in src/index.ts
# │
# └─ Post-commit hook runs:
#    └─ Creates tag v1.2.6

# 3. Push everything
git push origin master --tags
```

## Setup on New Machine

When cloning the repo, husky hooks are automatically installed:

```bash
git clone <repo>
cd destiny2-mcp-server
npm install  # Husky installs hooks via prepare script
```

The `prepare` script in `package.json` ensures hooks are set up on install:
```json
{
  "scripts": {
    "prepare": "husky install && npm run build"
  }
}
```

## Troubleshooting

### Hooks not running?
1. Verify husky is installed: `ls -la .husky/`
2. Reinstall hooks: `npm run prepare`

### Hook failed, but I need to commit anyway?
```bash
# Bypass hooks (use carefully!)
git commit --no-verify -m "commit message"
```

### Version mismatch issue?
The pre-commit hook will auto-fix this. Just commit again:
```bash
git commit -m "chore: bump version to X.Y.Z"
```

### Tag already exists?
The post-commit hook skips tag creation if it already exists. This is intentional to prevent errors.

### Manual tag creation:
```bash
git tag -a v1.2.5 -m "Release version 1.2.5"
git push origin v1.2.5
```

## Hook Scripts

### `.husky/scripts/pre-commit-tasks.js`
- Orchestrates formatting and version validation
- Runs before commits
- Stages changes automatically

### `.husky/scripts/post-commit-tasks.js`
- Detects version bumps
- Auto-creates release tags
- Non-blocking (won't break commits)

### `.husky/scripts/validate-versions.js`
- Syncs VERSION constant with package.json
- Can be run independently for debugging

## Best Practices

✅ **DO:**
- Let the hooks auto-format your code (they stage changes)
- Bump versions with clear commit messages
- Push tags after version bumps: `git push origin --tags`
- Use `npm version major/minor/patch` for consistent versioning

❌ **DON'T:**
- Manually edit VERSION constant (hook will overwrite it)
- Skip the pre-commit hook for formatting (causes CI failures)
- Push version bumps without tags
- Create commits with mismatched versions

## Related Files
- `package.json` - Contains version number (source of truth)
- `src/index.ts` - Contains VERSION constant (kept in sync)
- `.husky/` - Git hooks directory
- `.gitignore` - Ignores `.husky/_/` (internal husky files)
