#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read package.json version
const packageJsonPath = path.join(__dirname, '../../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
const packageVersion = packageJson.version;

// Read src/index.ts VERSION constant
const indexPath = path.join(__dirname, '../../src/index.ts');
const indexContent = fs.readFileSync(indexPath, 'utf-8');
const versionMatch = indexContent.match(/const VERSION = ['"]([^'"]+)['"]/);
const indexVersion = versionMatch ? versionMatch[1] : null;

console.log(`📋 Version Check:`);
console.log(`  package.json: ${packageVersion}`);
console.log(`  src/index.ts: ${indexVersion}`);

if (indexVersion === packageVersion) {
  console.log(`✅ Versions match!\n`);
  process.exit(0);
}

if (!indexVersion) {
  console.error(`❌ VERSION constant not found in src/index.ts\n`);
  process.exit(1);
}

// Auto-fix: Update src/index.ts to match package.json
console.log(`⚠️  Versions don't match. Auto-updating src/index.ts...`);
const updatedContent = indexContent.replace(
  /const VERSION = ['"]([^'"]+)['"]/,
  `const VERSION = '${packageVersion}'`
);

fs.writeFileSync(indexPath, updatedContent, 'utf-8');
console.log(`✅ Updated src/index.ts to version ${packageVersion}`);

// Stage the updated file
try {
  execSync('git add src/index.ts', { stdio: 'inherit' });
  console.log(`✅ Staged updated src/index.ts\n`);
} catch (error) {
  console.error(`❌ Failed to stage src/index.ts`, error);
  process.exit(1);
}
