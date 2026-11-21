// SPDX-License-Identifier: MIT
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const FIXTURES = join(__dirname, '..', '..', '..', '.cache', 'fixtures');

export function fixtureFiles(dir: string, ext = /\.xml$/i): string[] {
  const d = join(FIXTURES, dir);
  if (!existsSync(d)) throw new Error(`Fixtures missing in ${d}. Run "pnpm rules" first.`);
  return readdirSync(d).filter((f) => ext.test(f)).sort().map((f) => join(d, f));
}

export const read = (p: string) => new Uint8Array(readFileSync(p));
