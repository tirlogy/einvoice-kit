// SPDX-License-Identifier: MIT
import { EInvoiceError } from '../errors';
import { isGermanEInvoiceProfile, profileOf, type Profile, type Syntax } from '../model';
import { parseInvoice, parseXmlInvoice } from '../parse';
import { attr, kids, parseXml, text } from '../xml';
import { isValidIban, plausibility } from './plausibility';

/** The subset of the SaxonJS API used here (Node: `saxon-js`, browser: `SaxonJS2.rt.js`). */
export interface SaxonLike {
  transform(options: Record<string, unknown>, mode: 'async'): Promise<{ principalResult?: unknown }>;
}

export type RuleSet = 'en16931-cii' | 'en16931-ubl' | 'xrechnung-cii' | 'xrechnung-ubl';

export interface ValidateOptions {
  saxon: SaxonLike;
  /** Returns the compiled SEF of a rule set as parsed JSON object. */
  loadRules: (name: RuleSet) => Promise<unknown>;
  /** Apply XRechnung rules: `auto` (default) uses BT-24, `true` always. */
  xrechnung?: boolean | 'auto';
}

export type Severity = 'error' | 'warning' | 'info';

export interface Finding {
  id: string;
  severity: Severity;
  /** Original rule text (English or German as published). */
  message: string;
  /** XPath of the affected element. */
  location?: string;
  source: RuleSet | 'plausibility' | 'profile';
}

export interface ValidationReport {
  valid: boolean;
  syntax: Syntax;
  profile: Profile;
  specification: string;
  /** false for profiles that are not e-invoices under § 14 UStG (MINIMUM, BASIC WL). */
  germanEInvoice: boolean;
  rulesApplied: RuleSet[];
  findings: Finding[];
  counts: Record<Severity, number>;
}

/** KoSIT scenario overrides for XRechnung (validator-configuration-xrechnung). */
const XRECHNUNG_LEVELS: Record<string, Severity> = {
  'BR-CL-23': 'warning',
  'BR-CL-21': 'warning',
  'UBL-CR-646': 'error',
};

const flagToSeverity = (flag: string | undefined): Severity => {
  const f = (flag ?? 'fatal').toLowerCase();
  if (f === 'warning') return 'warning';
  if (f === 'information' || f === 'info') return 'info';
  return 'error';
};

/** Reads failed asserts and successful reports from a SVRL document. */
export function parseSvrl(svrl: string, source: RuleSet): Finding[] {
  const out: Finding[] = [];
  for (const k of kids(parseXml(svrl))) {
    if (k.localName !== 'failed-assert' && k.localName !== 'successful-report') continue;
    const msg = (text(k, 'text') ?? '').replace(/\s+/g, ' ').trim();
    const id = attr(k, 'id') ?? /\[([A-Z]+-[A-Z0-9-]+)\]/.exec(msg)?.[1] ?? 'UNKNOWN';
    out.push({ id, severity: flagToSeverity(attr(k, 'flag')), message: msg, location: attr(k, 'location'), source });
  }
  return out;
}

async function runRules(xml: string, name: RuleSet, opts: ValidateOptions): Promise<Finding[]> {
  let sef: unknown;
  try {
    sef = await opts.loadRules(name);
  } catch (e) {
    throw new EInvoiceError('RULES_UNAVAILABLE', `Rule set ${name} could not be loaded: ${(e as Error).message}`);
  }
  const result = await opts.saxon.transform(
    { stylesheetInternal: sef, sourceText: xml, destination: 'serialized' },
    'async',
  );
  return parseSvrl(String(result.principalResult ?? ''), name);
}

/** Validates CII or UBL XML against EN 16931 (and XRechnung where applicable) plus plausibility checks. */
export async function validateXml(xml: string, opts: ValidateOptions): Promise<ValidationReport> {
  const { invoice, syntax } = parseXmlInvoice(xml);
  const profile = profileOf(invoice.specification);
  const s = syntax === 'CII' ? 'cii' : 'ubl';
  const findings: Finding[] = [];
  const rulesApplied: RuleSet[] = [];
  const german = isGermanEInvoiceProfile(profile);

  if (!german) {
    findings.push({
      id: 'DE-PROFILE',
      severity: 'warning',
      message: `Profile ${profile} carries no line items and is not an invoice under § 14 UStG. It can only serve as a booking aid.`,
      source: 'profile',
    });
  } else {
    rulesApplied.push(`en16931-${s}`);
    const useXr = opts.xrechnung === true || ((opts.xrechnung ?? 'auto') === 'auto' && profile === 'XRECHNUNG');
    if (useXr) rulesApplied.push(`xrechnung-${s}`);
    for (const r of rulesApplied) findings.push(...(await runRules(xml, r, opts)));
    // The browser build of SaxonJS evaluates the long xs:integer in xr:checkIBAN with double
    // precision, so BR-DE-19 can fire for correct IBANs. Our exact mod-97 check decides instead.
    const ibansOk = (invoice.payment?.creditTransfers ?? []).every((ct) => isValidIban(ct.iban));
    if (ibansOk) {
      for (let i = findings.length - 1; i >= 0; i--) if (findings[i]!.id === 'BR-DE-19') findings.splice(i, 1);
    }
    // the extension scenario of KoSIT does not raise UBL-CR-646 (sub invoice lines are allowed there)
    const extension = /extension/i.test(invoice.specification);
    if (useXr) {
      for (const f of findings) {
        const level = XRECHNUNG_LEVELS[f.id];
        if (level && !(extension && f.id === 'UBL-CR-646')) f.severity = level;
      }
    }
    if (profile === 'EXTENDED') {
      findings.push({
        id: 'EXTENDED-SCOPE',
        severity: 'info',
        message: 'EXTENDED profile: the EN 16931 core was checked. Extension specific rules are not part of the public rule sets.',
        source: 'profile',
      });
    }
  }
  findings.push(...plausibility(invoice));

  const counts: Record<Severity, number> = { error: 0, warning: 0, info: 0 };
  for (const f of findings) counts[f.severity]++;
  return {
    valid: counts.error === 0 && german,
    syntax,
    profile,
    specification: invoice.specification,
    germanEInvoice: german,
    rulesApplied,
    findings,
    counts,
  };
}

/** Validates a PDF (ZUGFeRD / Factur-X) or XML (CII / UBL) invoice. */
export async function validateInvoice(input: Uint8Array | ArrayBuffer | string, opts: ValidateOptions): Promise<ValidationReport> {
  const parsed = await parseInvoice(input);
  return validateXml(parsed.xml, opts);
}
