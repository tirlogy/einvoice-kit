// SPDX-License-Identifier: MIT
export type EInvoiceErrorCode =
  | 'NOT_XML'
  | 'UNKNOWN_FORMAT'
  | 'PDF_INVALID'
  | 'NO_EMBEDDED_XML'
  | 'RULES_UNAVAILABLE';

/** Error with a stable code so that UIs can show translated messages. */
export class EInvoiceError extends Error {
  constructor(
    public readonly code: EInvoiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'EInvoiceError';
  }
}
