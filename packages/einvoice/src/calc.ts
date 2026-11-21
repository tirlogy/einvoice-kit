// SPDX-License-Identifier: MIT
import { amount, dec, plain, sum } from './decimal';
import type {
  AllowanceCharge,
  Decimal,
  Invoice,
  Line,
  VatBreakdown,
  VatCategory,
} from './model';

/** Default VAT exemption reasons (BT-120 / BT-121) for German use cases. */
export const EXEMPTION_DEFAULTS: Partial<Record<VatCategory, { reason: string; code?: string }>> = {
  E: { reason: 'Kein Ausweis von Umsatzsteuer, da Kleinunternehmer gemäß § 19 UStG' },
  AE: { reason: 'Steuerschuldnerschaft des Leistungsempfängers (§ 13b UStG)', code: 'VATEX-EU-AE' },
  K: { reason: 'Steuerfreie innergemeinschaftliche Lieferung (§ 4 Nr. 1b UStG)', code: 'VATEX-EU-IC' },
  G: { reason: 'Steuerfreie Ausfuhrlieferung (§ 4 Nr. 1a UStG)', code: 'VATEX-EU-G' },
  O: { reason: 'Nicht im Inland steuerbare Leistung', code: 'VATEX-EU-O' },
};

/** Categories that always carry 0 % (or no rate for O). */
export const ZERO_RATED: VatCategory[] = ['Z', 'E', 'AE', 'K', 'G', 'O'];

export type LineDraft = Omit<Line, 'netAmount' | 'allowances' | 'charges'> & {
  netAmount?: Decimal;
  allowances?: AllowanceCharge[];
  charges?: AllowanceCharge[];
};

export type InvoiceDraft = Omit<Invoice, 'totals' | 'vatBreakdown' | 'lines'> & {
  lines: LineDraft[];
  /** BT-113, already paid amount (e.g. prepayments on a final invoice). */
  prepaid?: Decimal;
  /** BT-114 */
  rounding?: Decimal;
  /** Overrides for BT-120/121 by category. */
  exemptions?: Partial<Record<VatCategory, { reason: string; code?: string }>>;
};

/** Resolves percentage based allowances/charges to an amount. */
function resolveAc(ac: AllowanceCharge): AllowanceCharge {
  if (ac.percentage && ac.baseAmount && (ac.amount === undefined || ac.amount === '')) {
    return { ...ac, amount: amount(dec(ac.baseAmount).times(dec(ac.percentage)).div(100)) };
  }
  return { ...ac, amount: amount(dec(ac.amount)) };
}

/** BT-131 = quantity × (net price / base quantity) + charges − allowances. */
export function computeLine(line: LineDraft): Line {
  const base = line.price.baseQuantity ? dec(line.price.baseQuantity) : dec(1);
  const gross = dec(line.quantity).times(dec(line.price.net)).div(base.eq(0) ? dec(1) : base);
  const fillBase = (ac: AllowanceCharge) =>
    ac.percentage && !ac.baseAmount ? { ...ac, baseAmount: amount(gross) } : ac;
  const allowances = (line.allowances ?? []).map(fillBase).map(resolveAc);
  const charges = (line.charges ?? []).map(fillBase).map(resolveAc);
  const net = gross.plus(sum(charges.map((c) => c.amount))).minus(sum(allowances.map((a) => a.amount)));
  const vat = ZERO_RATED.includes(line.vat.category)
    ? { category: line.vat.category, ...(line.vat.category === 'O' ? {} : { rate: '0' }) }
    : { category: line.vat.category, rate: plain(line.vat.rate ?? '0') };
  return { ...line, allowances, charges, netAmount: amount(net), vat };
}

const key = (category: VatCategory, rate: Decimal | undefined) =>
  `${category}|${category === 'O' ? '' : plain(rate ?? '0')}`;

/** Computes BG-23 and BG-22 from lines and document level allowances/charges. */
export function finalize(draft: InvoiceDraft): Invoice {
  const lines = draft.lines.map(computeLine);
  const docAc = (ac: AllowanceCharge): AllowanceCharge => {
    const resolved = resolveAc(ac);
    const cat = resolved.vatCategory ?? 'S';
    return {
      ...resolved,
      vatCategory: cat,
      ...(cat === 'O' ? { vatRate: undefined } : { vatRate: plain(ZERO_RATED.includes(cat) ? '0' : (resolved.vatRate ?? '0')) }),
    };
  };
  const allowances = draft.allowances.map(docAc);
  const charges = draft.charges.map(docAc);

  const groups = new Map<string, { category: VatCategory; rate?: Decimal; taxable: ReturnType<typeof dec> }>();
  const add = (category: VatCategory, rate: Decimal | undefined, value: ReturnType<typeof dec>) => {
    const k = key(category, rate);
    const g = groups.get(k) ?? {
      category,
      ...(category === 'O' ? {} : { rate: plain(rate ?? '0') }),
      taxable: dec(0),
    };
    g.taxable = g.taxable.plus(value);
    groups.set(k, g);
  };
  for (const l of lines) add(l.vat.category, l.vat.rate, dec(l.netAmount));
  for (const a of allowances) add(a.vatCategory!, a.vatRate, dec(a.amount).neg());
  for (const c of charges) add(c.vatCategory!, c.vatRate, dec(c.amount));

  const exemptions = { ...EXEMPTION_DEFAULTS, ...draft.exemptions };
  const vatBreakdown: VatBreakdown[] = [...groups.values()].map((g) => {
    const taxAmount = g.category === 'S' || g.category === 'L' || g.category === 'M'
      ? amount(g.taxable.times(dec(g.rate)).div(100))
      : '0.00';
    const ex = exemptions[g.category];
    return {
      category: g.category,
      ...(g.rate !== undefined ? { rate: g.rate } : {}),
      taxableAmount: amount(g.taxable),
      taxAmount,
      ...(ex && !['S', 'L', 'M'].includes(g.category)
        ? { exemptionReason: ex.reason, ...(ex.code ? { exemptionReasonCode: ex.code } : {}) }
        : {}),
    };
  });

  const lineNet = sum(lines.map((l) => l.netAmount));
  const allowanceTotal = sum(allowances.map((a) => a.amount));
  const chargeTotal = sum(charges.map((c) => c.amount));
  const taxExclusive = lineNet.minus(allowanceTotal).plus(chargeTotal);
  const tax = sum(vatBreakdown.map((v) => v.taxAmount));
  const taxInclusive = taxExclusive.plus(tax);
  const prepaid = dec(draft.prepaid);
  const rounding = dec(draft.rounding);
  const payable = taxInclusive.minus(prepaid).plus(rounding);

  const { prepaid: _p, rounding: _r, exemptions: _e, ...rest } = draft;
  void _p;
  void _r;
  void _e;
  return {
    ...rest,
    lines,
    allowances,
    charges,
    vatBreakdown,
    totals: {
      lineNet: amount(lineNet),
      ...(allowances.length ? { allowances: amount(allowanceTotal) } : {}),
      ...(charges.length ? { charges: amount(chargeTotal) } : {}),
      taxExclusive: amount(taxExclusive),
      tax: amount(tax),
      taxInclusive: amount(taxInclusive),
      ...(draft.prepaid && !prepaid.eq(0) ? { prepaid: amount(prepaid) } : {}),
      ...(draft.rounding && !rounding.eq(0) ? { rounding: amount(rounding) } : {}),
      payable: amount(payable),
    },
  };
}
