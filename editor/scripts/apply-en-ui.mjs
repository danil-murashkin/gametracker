#!/usr/bin/env node
// Apply zh->en UI translations to src .ts and .tsx files.
// Replaces longest strings first to avoid partial matches.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const MAP_FILE = path.join(__dirname, 'en-ui-translations.json');

/** Files/patterns to skip (codegen internal comments, tests unless user-visible) */
const SKIP_FILES = new Set([
  path.normalize('src/codegen/__tests__/ui_logic.c.test.ts'),
]);

const SKIP_PATH_PATTERNS = [
  /[/\\]__tests__[/\\]/,
];

function shouldProcess(relPath) {
  const norm = relPath.replace(/\\/g, '/');
  if (SKIP_FILES.has(norm)) return false;
  for (const p of SKIP_PATH_PATTERNS) {
    if (p.test(norm)) return false;
  }
  return true;
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

function loadTranslations() {
  const raw = fs.readFileSync(MAP_FILE, 'utf8');
  const map = JSON.parse(raw);
  // Sort by key length descending (longest first)
  const entries = Object.entries(map).sort((a, b) => b[0].length - a[0].length);
  return entries;
}

function applyTranslations(content, entries) {
  let result = content;
  for (const [zh, en] of entries) {
    if (result.includes(zh)) {
      result = result.split(zh).join(en);
    }
  }
  return result;
}

function main() {
  const entries = loadTranslations();
  const files = walk(SRC);
  let changedCount = 0;
  const changedFiles = [];

  for (const file of files) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    if (!shouldProcess(rel)) continue;

    const original = fs.readFileSync(file, 'utf8');
    const updated = applyTranslations(original, entries);

    if (updated !== original) {
      fs.writeFileSync(file, updated, 'utf8');
      changedCount++;
      changedFiles.push(rel);
    }
  }

  console.log(`Applied ${entries.length} translation pairs`);
  console.log(`Changed ${changedCount} file(s):`);
  for (const f of changedFiles.sort()) {
    console.log(`  ${f}`);
  }
}

main();
