// SPDX-License-Identifier: MIT
/**
 * Lazy loading of the heavy parts (pdf-lib, SaxonJS, rule files, fonts).
 * Everything is served from the same origin; nothing leaves the browser.
 */
import type { RuleSet, SaxonLike, ValidationReport } from '@core/index';

type Core = typeof import('@core/index');
let corePromise: Promise<Core> | undefined;
export const core = (): Promise<Core> => (corePromise ??= import('@core/index'));

let saxonPromise: Promise<SaxonLike> | undefined;
export function loadSaxon(): Promise<SaxonLike> {
  saxonPromise ??= new Promise<SaxonLike>((resolve, reject) => {
    const w = window as unknown as { SaxonJS?: SaxonLike };
    if (w.SaxonJS) return resolve(w.SaxonJS);
    const s = document.createElement('script');
    s.src = `${import.meta.env.BASE_URL}vendor/SaxonJS2.rt.js`;
    s.async = true;
    s.onload = () => (w.SaxonJS ? resolve(w.SaxonJS) : reject(new Error('SaxonJS not available')));
    s.onerror = () => {
      saxonPromise = undefined;
      reject(new Error('SaxonJS could not be loaded'));
    };
    document.head.appendChild(s);
  });
  return saxonPromise;
}

const sefCache = new Map<RuleSet, Promise<unknown>>();
async function loadRules(name: RuleSet): Promise<unknown> {
  let p = sefCache.get(name);
  if (!p) {
    p = import('./assetUrls').then(async ({ RULE_URLS }) => {
      const res = await fetch(RULE_URLS[name]);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<unknown>;
    });
    p.catch(() => sefCache.delete(name));
    sefCache.set(name, p);
  }
  return p;
}

export async function validate(input: Uint8Array | string, xrechnung: boolean | 'auto' = 'auto'): Promise<ValidationReport> {
  const [c, saxon] = await Promise.all([core(), loadSaxon()]);
  // let the browser paint the loading state before the synchronous parts of SaxonJS run
  await new Promise((r) => setTimeout(r, 30));
  return c.validateInvoice(input, { saxon, loadRules, xrechnung });
}

let fontsPromise: Promise<{ regular: Uint8Array; bold: Uint8Array }> | undefined;
export function loadFonts() {
  fontsPromise ??= import('./assetUrls').then(async ({ FONT_URLS }) => {
    const [regular, bold] = await Promise.all(
      [FONT_URLS.regular, FONT_URLS.bold].map(async (u) => new Uint8Array(await (await fetch(u)).arrayBuffer())),
    );
    return { regular: regular!, bold: bold! };
  });
  return fontsPromise;
}

export function errorKey(e: unknown): { key: string; message: string } {
  const code = (e as { code?: string })?.code;
  return { key: code ? `err${code}` : 'errGeneric', message: (e as Error)?.message ?? String(e) };
}
