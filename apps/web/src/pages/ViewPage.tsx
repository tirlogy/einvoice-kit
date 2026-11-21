// SPDX-License-Identifier: MIT
import type { ParseResult, ValidationReport as Report } from '@core/index';
import { useState } from 'react';
import { FileDrop } from '../components/FileDrop';
import { InvoiceView } from '../components/InvoiceView';
import { ValidationReport } from '../components/ValidationReport';
import { useI18n } from '../i18n';
import type { StringKey } from '../i18n/strings';
import { downloadFile, MAX_FILE, readFile } from '../lib/download';
import { core, errorKey, loadFonts, validate } from '../lib/engine';
import { today } from '../lib/form';

type Sample = 'valid' | 'invalid' | 'pdf';

export function ViewPage() {
  const { t, lang } = useI18n();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [doc, setDoc] = useState<{ name: string; parsed: ParseResult; bytes: Uint8Array | string } | null>(null);
  const [report, setReport] = useState<Report | null>(null);

  async function open(name: string, bytes: Uint8Array | string) {
    setError(null);
    setReport(null);
    setDoc(null);
    setBusy(t('loading'));
    try {
      const c = await core();
      const parsed = await c.parseInvoice(bytes);
      setDoc({ name, parsed, bytes });
      setBusy(t('validating'));
      setReport(await validate(parsed.xml));
    } catch (e) {
      const { key, message } = errorKey(e);
      setError(t(key as StringKey, { message }));
    } finally {
      setBusy(null);
    }
  }

  async function onFile(f: File) {
    if (f.size > MAX_FILE) {
      setError(t('errTooLarge'));
      return;
    }
    await open(f.name, await readFile(f));
  }

  async function sample(kind: Sample) {
    const c = await core();
    if (kind === 'valid') {
      return open('beispiel-xrechnung.xml', c.buildCii(c.finalize(c.exampleDraft('public-sector', today()))));
    }
    if (kind === 'invalid') {
      const inv = c.finalize(c.exampleDraft('standard', today()));
      inv.buyerReference = undefined;
      inv.totals.taxInclusive = '1300.00';
      inv.seller.contact = { name: inv.seller.contact?.name };
      return open('beispiel-fehlerhaft.xml', c.buildUbl(inv));
    }
    setBusy(t('loading'));
    const inv = c.finalize({ ...c.exampleDraft('allowances', today()), specification: c.SPEC.EN16931 });
    const pdf = await c.buildZugferdPdf(inv, { fonts: await loadFonts(), lang, layout: 'modern' });
    return open('beispiel-zugferd.pdf', pdf);
  }

  async function checkXRechnung() {
    if (!doc) return;
    setBusy(t('validating'));
    try {
      setReport(await validate(doc.parsed.xml, true));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="page">
      <h1>{t('navView')}</h1>
      <p className="lead">{t('tagline')}</p>
      <FileDrop onFile={onFile} />
      <div className="samples">
        <span>{t('samples')}</span>
        <button type="button" className="secondary" onClick={() => sample('valid')}>
          {t('sampleValid')}
        </button>
        <button type="button" className="secondary" onClick={() => sample('invalid')}>
          {t('sampleInvalid')}
        </button>
        <button type="button" className="secondary" onClick={() => sample('pdf')}>
          {t('samplePdf')}
        </button>
      </div>
      {busy && (
        <p className="busy" role="status">
          <span className="spinner" aria-hidden="true" /> {busy}
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {doc && (
        <>
          <div className="toolbar">
            <p className="muted" data-testid="file-info">
              {t('fileInfo', { name: doc.name, syntax: doc.parsed.syntax, profile: doc.parsed.profile })}
            </p>
            <div className="actions">
              <button type="button" className="secondary" onClick={() => window.print()}>
                {t('print')}
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => downloadFile(doc.parsed.xml, doc.parsed.attachmentName ?? doc.name.replace(/\.\w+$/, '.xml'), 'application/xml')}
              >
                {t('downloadXml')}
              </button>
            </div>
          </div>
          <div className="two-col">
            <InvoiceView invoice={doc.parsed.invoice} />
            <div className="side no-print">{report && <ValidationReport report={report} onCheckXRechnung={checkXRechnung} />}</div>
          </div>
        </>
      )}
    </div>
  );
}
