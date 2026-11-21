#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Validates the generated XRechnung files with the official KoSIT validator (Java).
// Prerequisites: `node tools/rules/build.mjs --kosit` and the unit tests (they write .cache/generated).
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../..', import.meta.url).pathname;
const { jar, config } = JSON.parse(readFileSync(join(root, '.cache/kosit.json'), 'utf8'));
const dir = join(root, '.cache/generated/xrechnung');
const files = readdirSync(dir).filter((f) => f.endsWith('.xml')).map((f) => join(dir, f));
if (!files.length) throw new Error('No generated files found. Run the unit tests first.');
const out = join(root, '.cache/kosit-reports');
mkdirSync(out, { recursive: true });
const configDir = readdirSync(config).length === 1 ? join(config, readdirSync(config)[0]) : config;

let failed = 0;
try {
  execFileSync('java', ['-jar', jar, '-s', join(configDir, 'scenarios.xml'), '-r', configDir, '-o', out, ...files], { stdio: 'pipe' });
} catch (e) {
  // the validator exits non-zero when at least one document is rejected; reports tell which
  process.stdout.write(String(e.stdout ?? ''));
}
for (const f of files) {
  const name = f.split('/').pop().replace(/\.xml$/, '');
  const report = readFileSync(join(out, `${name}-report.xml`), 'utf8');
  const accepted = /<rep:assessment>\s*<rep:accept/.test(report) || /<rep:accept>/.test(report);
  console.log(`${accepted ? 'ACCEPT' : 'REJECT'}  ${name}`);
  if (!accepted) failed++;
}
if (failed) {
  console.error(`${failed} document(s) rejected by the KoSIT validator. Reports: ${out}`);
  process.exit(1);
}
console.log(`All ${files.length} documents accepted by the KoSIT validator.`);
