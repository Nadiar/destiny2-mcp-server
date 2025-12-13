#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔧 Running pre-commit tasks...\n');

// 1. Auto-format code with prettier
console.log('1️⃣  Formatting code with Prettier...');
try {
  execSync('npm run format', { stdio: 'inherit' });
  // Check if there are any formatting changes and stage them
  try {
    execSync('git add src/ tests/', { stdio: 'inherit' });
  } catch (e) {
    // No changes to stage is fine
  }
  console.log('✅ Formatting complete\n');
} catch (error) {
  console.error('❌ Formatting failed');
  process.exit(1);
}

// 2. Validate and sync versions
console.log('2️⃣  Validating version consistency...');
try {
  const validateScript = path.join(__dirname, 'validate-versions.js');
  execSync(`node ${validateScript}`, { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Version validation failed');
  process.exit(1);
}

console.log('✅ All pre-commit tasks passed!\n');
