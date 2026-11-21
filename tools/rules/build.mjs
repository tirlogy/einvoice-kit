#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Downloads the pinned official rule sets (EN 16931, XRechnung), verifies their SHA-256,
// compiles the Schematron XSLT to SaxonJS SEF and prepares test fixtures.
//
//   node tools/rules/build.mjs                  compile rules + fixtures
//   node tools/rules/build.mjs --kosit          also fetch KoSIT validator + config (CI)
//   node tools/rules/build.mjs --check-updates  compare pinned versions with latest GitHub releases
//   node tools/rules/build.mjs --pin            recompute sha256 in versions.json after editing URLs
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, copyFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { unzipSync } from 'fflate';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(import.meta.url);
const versionsPath = join(root, 'tools/rules/versions.json');
const versions = JSON.parse(readFileSync(versionsPath, 'utf8'));
const cache = join(root, '.cache');
const dl = join(cache, 'downloads');
const rulesOut = join(root, 'packages/einvoice/rules');
const fixturesOut = join(cache, 'fixtures');
const args = new Set(process.argv.slice(2));

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const log = (...a) => console.log('[rules]', ...a);

async function fetchBytes(url, attempt = 1) {
  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) throw new Error(`Download failed ${res.status}: ${url}`);
    return Buffer.from(await res.arrayBuffer());
  } catch (e) {
    if (attempt >= 4) throw e;
    log(`retry ${attempt} after error: ${e.message}`);
    await new Promise((r) => setTimeout(r, 2000 * attempt));
    return fetchBytes(url, attempt + 1);
  }
}

async function download(name) {
  const a = versions.artifacts[name];
  const file = join(dl, `${name}-${a.version}${a.url.endsWith('.jar') ? '.jar' : '.zip'}`);
  if (existsSync(file) && sha256(readFileSync(file)) === a.sha256) return file;
  log('download', a.url);
  const buf = await fetchBytes(a.url);
  const hash = sha256(buf);
  if (hash !== a.sha256) throw new Error(`SHA-256 mismatch for ${name}: got ${hash}`);
  mkdirSync(dl, { recursive: true });
  writeFileSync(file, buf);
  return file;
}

function extract(zipFile, dest) {
  if (existsSync(dest)) return dest;
  const files = unzipSync(readFileSync(zipFile));
  for (const [path, data] of Object.entries(files)) {
    if (path.endsWith('/')) continue;
    const target = join(dest, path);
    if (!target.startsWith(dest)) throw new Error(`Unsafe zip path: ${path}`);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, data);
  }
  return dest;
}

function find(dir, predicate, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) find(p, predicate, out);
    else if (predicate(p)) out.push(p);
  }
  return out;
}

function compile(xsl, sef) {
  log('compile', relative(root, xsl), '->', relative(root, sef));
  const cli = require.resolve('xslt3/xslt3.js');
  execFileSync(process.execPath, [cli, `-xsl:${xsl}`, `-export:${sef}`, '-nogo', '-relocate:on'], {
    stdio: 'inherit',
  });
}

async function buildRules() {
  const manifestPath = join(rulesOut, 'manifest.json');
  const manifest = {
    en16931: versions.artifacts['en16931-cii'].version,
    xrechnungSchematron: versions.artifacts['xrechnung-schematron'].version,
    xrechnung: versions.artifacts['xrechnung-schematron'].xrechnung,
  };
  const ex = {};
  for (const name of ['en16931-cii', 'en16931-ubl', 'xrechnung-schematron']) {
    ex[name] = extract(await download(name), join(cache, 'extracted', `${name}-${versions.artifacts[name].version}`));
  }
  if (existsSync(manifestPath) && readFileSync(manifestPath, 'utf8') === JSON.stringify(manifest, null, 2)) {
    log('rules up to date', manifest);
  } else {
    mkdirSync(rulesOut, { recursive: true });
    const pick = (dir, re) => {
      const hit = find(dir, (p) => re.test(p));
      if (hit.length !== 1) throw new Error(`Expected one match for ${re} in ${dir}, got ${hit.length}`);
      return hit[0];
    };
    compile(pick(ex['en16931-cii'], /xslt\/EN16931-CII-validation\.xslt$/), join(rulesOut, 'en16931-cii.sef.json'));
    compile(pick(ex['en16931-ubl'], /xslt\/EN16931-UBL-validation\.xslt$/), join(rulesOut, 'en16931-ubl.sef.json'));
    compile(pick(ex['xrechnung-schematron'], /cii\/XRechnung-CII-validation\.xsl$/), join(rulesOut, 'xrechnung-cii.sef.json'));
    compile(pick(ex['xrechnung-schematron'], /ubl\/XRechnung-UBL-validation\.xsl$/), join(rulesOut, 'xrechnung-ubl.sef.json'));
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  }

  // fixtures: official examples for tests
  const copyAll = (files, dest, withParent = false) => {
    mkdirSync(dest, { recursive: true });
    for (const f of files) {
      const parts = f.split(/[\\/]/);
      copyFileSync(f, join(dest, (withParent ? `${parts.at(-2)}__` : '') + parts.at(-1)));
    }
  };
  copyAll(find(ex['en16931-cii'], (p) => /examples[\\/].*\.xml$/i.test(p)), join(fixturesOut, 'en16931-cii'));
  copyAll(find(ex['en16931-ubl'], (p) => /examples[\\/].*\.xml$/i.test(p)), join(fixturesOut, 'en16931-ubl'));
  const ts = extract(await download('xrechnung-testsuite'), join(cache, 'extracted', 'testsuite'));
  copyAll(find(ts, (p) => /instances[\\/].*\.xml$/i.test(p)), join(fixturesOut, 'kosit'), true);

  // SaxonJS browser runtime for the web app (lazy loaded, same origin)
  const sx = extract(await download('saxonjs-browser'), join(cache, 'extracted', 'saxonjs'));
  const webPublic = join(root, 'apps/web/public/vendor');
  mkdirSync(webPublic, { recursive: true });
  copyFileSync(find(sx, (p) => p.endsWith('SaxonJS2.rt.js'))[0], join(webPublic, 'SaxonJS2.rt.js'));
  copyFileSync(find(sx, (p) => p.endsWith('LICENSE.txt'))[0], join(webPublic, 'SaxonJS-LICENSE.txt'));

  // official ZUGFeRD sample PDFs (tests only)
  const z = versions.zugferdSamples;
  const zDir = join(fixturesOut, 'zugferd');
  mkdirSync(zDir, { recursive: true });
  for (const f of z.files) {
    const target = join(zDir, f.split('/').pop());
    if (existsSync(target)) continue;
    const url = `https://raw.githubusercontent.com/${z.repo}/${z.commit}/${encodeURI(`${z.base}/${f}`)}`;
    log('download', f);
    writeFileSync(target, await fetchBytes(url));
  }
}

async function fetchKosit() {
  const jar = await download('kosit-validator');
  const cfg = extract(await download('kosit-config'), join(cache, 'kosit-config'));
  writeFileSync(join(cache, 'kosit.json'), JSON.stringify({ jar, config: cfg }, null, 2));
  log('KoSIT validator ready', jar);
}

async function checkUpdates() {
  const repos = {
    'en16931-cii': 'ConnectingEurope/eInvoicing-EN16931',
    'xrechnung-schematron': 'itplr-kosit/xrechnung-schematron',
    'xrechnung-testsuite': 'itplr-kosit/xrechnung-testsuite',
    'kosit-validator': 'itplr-kosit/validator',
    'kosit-config': 'itplr-kosit/validator-configuration-xrechnung',
  };
  for (const [name, repo] of Object.entries(repos)) {
    const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`);
    const latest = res.ok ? (await res.json()).tag_name : `HTTP ${res.status}`;
    console.log(`${name.padEnd(22)} pinned ${versions.artifacts[name].version.padEnd(12)} latest ${latest}`);
  }
}

async function pin() {
  for (const [name, a] of Object.entries(versions.artifacts)) {
    a.sha256 = sha256(await fetchBytes(a.url));
    log('pinned', name, a.sha256);
  }
  writeFileSync(versionsPath, JSON.stringify(versions, null, 2) + '\n');
}

if (args.has('--check-updates')) await checkUpdates();
else if (args.has('--pin')) await pin();
else {
  await buildRules();
  if (args.has('--kosit')) await fetchKosit();
}
