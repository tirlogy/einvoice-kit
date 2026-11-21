// SPDX-License-Identifier: MIT
import Big from 'big.js';
import type { Decimal } from './model';

/** Parses a decimal string; empty or invalid input becomes 0. */
export function dec(value: Decimal | number | undefined | null): Big {
  if (value === undefined || value === null || value === '') return new Big(0);
  try {
    return new Big(typeof value === 'number' ? value : value.trim());
  } catch {
    return new Big(0);
  }
}

/** EN 16931 amounts: two decimals, commercial rounding (half up). */
export function amount(value: Big): Decimal {
  return value.round(2, Big.roundHalfUp).toFixed(2);
}

/** Normalises a decimal string without trailing zeros (for quantities, rates, prices). */
export function plain(value: Decimal | number): Decimal {
  return dec(value).toFixed();
}

export function sum(values: (Decimal | undefined)[]): Big {
  return values.reduce<Big>((acc, v) => acc.plus(dec(v)), new Big(0));
}

export function isZero(value: Decimal | undefined): boolean {
  return dec(value).eq(0);
}

/** Formats an amount for display using Intl (locale aware). */
export function formatMoney(value: Decimal | undefined, currency: string, locale = 'de-DE'): string {
  const n = Number(dec(value).toFixed(2));
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}

export function formatNumber(value: Decimal | undefined, locale = 'de-DE', maxFraction = 4): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: maxFraction }).format(
    Number(dec(value).toString()),
  );
}
