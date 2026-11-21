// SPDX-License-Identifier: MIT
/**
 * Node.js helpers: wires `saxon-js` and the bundled rule files and fonts.
 * Usage: `import { validateFile } from '@tirlogy/einvoice/node'`.
 */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateInvoice, type RuleSet, type ValidateOptions, type ValidationReport } from './validate';

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const cache = new Map<RuleSet, Promise<unknown>>();

export function rulesDir(): string {
  return process.env.EINVOICE_RULES_DIR ?? join(pkgRoot, 'rules');
}

export function loadRulesFromDisk(name: RuleSet): Promise<unknown> {
  let p = cache.get(name);
  if (!p) {
    p = readFile(join(rulesDir(), `${name}.sef.json`), 'utf8').then((t) => JSON.parse(t) as unknown);
    cache.set(name, p);
  }
  return p;
}

export async function nodeValidateOptions(extra: Partial<ValidateOptions> = {}): Promise<ValidateOptions> {
  const saxon = (await import('saxon-js')).default;
  return { saxon, loadRules: loadRulesFromDisk, ...extra };
}

/** Reads the bundled Open Sans fonts (Apache-2.0) for `buildZugferdPdf`. */
export async function loadDefaultFonts(): Promise<{ regular: Uint8Array; bold: Uint8Array }> {
  const [regular, bold] = await Promise.all([
    readFile(join(pkgRoot, 'assets', 'OpenSans-Regular.ttf')),
    readFile(join(pkgRoot, 'assets', 'OpenSans-Bold.ttf')),
  ]);
  return { regular: new Uint8Array(regular), bold: new Uint8Array(bold) };
}

/** Validates an invoice file (PDF or XML) from disk. */
export async function validateFile(path: string, extra: Partial<ValidateOptions> = {}): Promise<ValidationReport> {
  return validateInvoice(new Uint8Array(await readFile(path)), await nodeValidateOptions(extra));
}
