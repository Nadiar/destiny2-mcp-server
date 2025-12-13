#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Get the last commit message
let lastCommit = '';
try {
  lastCommit = execSync('git log -1 --pretty=%B', { encoding: 'utf-8' }).trim();
} catch (e) {
  process.exit(0);
}

// Check if this is a version bump commit
if (!lastCommit.includes('bump version') && !lastCommit.includes('chore: bump')) {
  process.exit(0);
}

// Read the version from package.json
const packageJsonPath = path.join(__dirname, '../../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
const version = packageJson.version;
const tagName = `v${version}`;

console.log(`📦 Version bump detected: ${version}`);
console.log(`🏷️  Creating tag: ${tagName}`);

try {
  // Check if tag already exists
  try {
    execSync(`git rev-parse ${tagName}`, { stdio: 'ignore' });
    console.log(`⚠️  Tag ${tagName} already exists, skipping`);
    process.exit(0);
  } catch (e) {
    // Tag doesn't exist, continue
  }

  // Create the tag with an annotated message
  execSync(`git tag -a ${tagName} -m "Release version ${version}"`, { stdio: 'inherit' });
  console.log(`✅ Tag ${tagName} created successfully`);
  console.log(`📌 Push tags with: git push origin --tags`);
} catch (error) {
  console.error(`⚠️  Failed to create tag (this is non-blocking)`, error.message);
  process.exit(0);
}
