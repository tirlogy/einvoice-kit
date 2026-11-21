// SPDX-License-Identifier: MIT
import { finalize } from '@core/calc';
import { EXAMPLE_KINDS, type ExampleKind } from '@core/examples';
import { UNITS } from '@core/labels';
import type { Invoice } from '@core/model';
import type { ValidationReport as Report } from '@core/validate';
import { useEffect, useMemo, useState } from 'react';
import { Field, Select, TextArea } from '../components/Field';
import { InvoiceView } from '../components/InvoiceView';
import { ValidationReport } from '../components/ValidationReport';
import { useI18n } from '../i18n';
import type { StringKey } from '../i18n/strings';
import { downloadFile } from '../lib/download';
import { core, errorKey, loadFonts, validate } from '../lib/engine';
import {
  DOC_TYPES,
  emptyForm,
  emptyLine,
  formFromExample,
  key,
  num,
  TAX_CASES,
  toDraft,
  type FormAc,
  type FormLine,
  type FormState,
  type OutputFormat,
} from '../lib/form';
import { loadAll, uid, upsert, type MasterData, type PartyData } from '../lib/storage';

const DRAFT_KEY = 'create-form';

function initialForm(): FormState {
  try {
    const saved = sessionStorage.getItem(DRAFT_KEY);
    if (saved) return { ...emptyForm(), ...(JSON.parse(saved) as FormState) };
  } catch {
    /* ignore */
  }
  return formFromExample('standard', emptyForm());
}

function PartyFields({ value, onChange, seller }: { value: PartyData; onChange: (p: PartyData) => void; seller: boolean }) {
  const { t } = useI18n();
  const set = (k: keyof PartyData) => (v: string) => onChange({ ...value, [k]: v });
  return (
    <div className="grid-fields">
      <Field label={t('name')} value={value.name} onChange={set('name')} required wide autoComplete="organization" />
      <Field label={t('street')} value={value.street} onChange={set('street')} wide autoComplete="street-address" />
      <Field label={t('postcode')} value={value.postcode} onChange={set('postcode')} autoComplete="postal-code" />
      <Field label={t('city')} value={value.city} onChange={set('city')} autoComplete="address-level2" />
      <Field label={t('country')} value={value.country} onChange={set('country')} maxLength={2} required />
      <Field label={t('vatId')} value={value.vatId} onChange={set('vatId')} />
      {seller && <Field label={t('taxNumber')} value={value.taxNumber} onChange={set('taxNumber')} />}
      {seller && <Field label={t('registration')} value={value.registration} onChange={set('registration')} />}
      <Field label={seller ? t('sellerId') : t('customerNumber')} value={value.identifier} onChange={set('identifier')} />
      <Field label={t('contactName')} value={value.contactName} onChange={set('contactName')} />
      <Field label={t('phone')} value={value.phone} onChange={set('phone')} type="tel" autoComplete="tel" />
      <Field label={t('email')} value={value.email} onChange={set('email')} type="email" autoComplete="email" />
      <Field label={t('eAddress')} value={value.eAddress} onChange={set('eAddress')} type="email" />
    </div>
  );
}

function LineRow({ line, index, onChange, onRemove, showVat, onSave }: { line: FormLine; index: number; onChange: (l: FormLine) => void; onRemove: () => void; showVat: boolean; onSave: () => void }) {
  const { t, lang } = useI18n();
  const set = (k: keyof FormLine) => (v: string) => onChange({ ...line, [k]: v });
  return (
    <fieldset className="line">
      <legend>
        {t('lineName')} {index + 1}
      </legend>
      <div className="grid-fields">
        <Field label={t('lineName')} value={line.name} onChange={set('name')} wide required />
        <Field label={t('lineDescription')} value={line.description} onChange={set('description')} wide />
        <Field label={t('lineQty')} value={line.quantity} onChange={set('quantity')} inputMode="decimal" />
        <Select label={t('lineUnit')} value={line.unitCode} onChange={set('unitCode')}>
          {Object.entries(UNITS)
            .filter(([c]) => !['H87', 'XPP'].includes(c))
            .map(([code, names]) => (
              <option key={code} value={code}>
                {names[lang]} ({code})
              </option>
            ))}
        </Select>
        <Field label={t('linePrice')} value={line.price} onChange={set('price')} inputMode="decimal" required />
        {showVat && (
          <Select label={t('lineVat')} value={line.vatRate} onChange={set('vatRate')}>
            <option value="19">19 %</option>
            <option value="7">7 %</option>
            <option value="0">0 %</option>
          </Select>
        )}
        <Field label={t('lineDiscount')} value={line.discountPct} onChange={set('discountPct')} inputMode="decimal" />
      </div>
      <div className="row-actions">
        <button type="button" className="link" onClick={onSave}>
          {t('saveArticle')}
        </button>
        <button type="button" className="link danger" onClick={onRemove} aria-label={t('lineRemove', { n: index + 1 })}>
          {t('delete')}
        </button>
      </div>
    </fieldset>
  );
}

function AcRow({ ac, onChange, onRemove, showVat }: { ac: FormAc; onChange: (a: FormAc) => void; onRemove: () => void; showVat: boolean }) {
  const { t } = useI18n();
  const set = (k: keyof FormAc) => (v: string) => onChange({ ...ac, [k]: v } as FormAc);
  return (
    <div className="grid-fields ac">
      <Select label={t('acKind')} value={ac.kind} onChange={set('kind')}>
        <option value="allowance">{t('acAllowance')}</option>
        <option value="charge">{t('acCharge')}</option>
      </Select>
      <Field label={t('acReason')} value={ac.reason} onChange={set('reason')} />
      <Field label={t('acAmount')} value={ac.amount} onChange={set('amount')} inputMode="decimal" />
      {showVat && (
        <Select label={t('lineVat')} value={ac.vatRate} onChange={set('vatRate')}>
          <option value="19">19 %</option>
          <option value="7">7 %</option>
        </Select>
      )}
      <button type="button" className="link danger" onClick={onRemove}>
        {t('acRemove')}
      </button>
    </div>
  );
}

export function CreatePage() {
  const { t, lang } = useI18n();
  const [form, setForm] = useState<FormState>(initialForm);
  const [data, setData] = useState<MasterData>({ senders: [], customers: [], articles: [] });
  // the report belongs to the form state it was made for; edits hide it again
  const [checked, setChecked] = useState<{ form: FormState; report: Report } | null>(null);
  const report = checked?.form === form ? checked.report : null;
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAll().then(setData).catch(() => undefined);
  }, []);
  useEffect(() => {
    try {
      // per-tab convenience only: the form survives a reload but is gone when the tab closes
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    } catch {
      /* ignore */
    }
  }, [form]);

  const update = <K extends keyof FormState>(k: K) => (v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));
  const str = <K extends keyof FormState>(k: K) => update(k) as unknown as (v: string) => void;

  // the preview follows the form with a short delay: the first paint is not one long task
  // and typing stays responsive on slow devices
  const [deferredForm, setDeferredForm] = useState<FormState | null>(null);
  useEffect(() => {
    const id = window.setTimeout(() => setDeferredForm(form), 120);
    return () => window.clearTimeout(id);
  }, [form]);
  const preview = useMemo<{ inv?: Invoice; error?: string } | null>(() => {
    if (!deferredForm) return null;
    try {
      return { inv: finalize(toDraft(deferredForm)) };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [deferredForm]);

  const flash = (m: string) => {
    setMessage(m);
    setTimeout(() => setMessage(null), 2500);
  };

  async function build(): Promise<{ data: Uint8Array | string; filename: string; mime: string; xml: string }> {
    const c = await core();
    const inv = c.finalize(toDraft(form));
    const base = (inv.number || 'rechnung').replace(/[^\w.-]+/g, '_');
    if (form.output === 'zugferd') {
      const xml = c.buildCii(inv);
      const logo = form.logo ? dataUrlBytes(form.logo) : undefined;
      const pdf = await c.buildZugferdPdf(inv, {
        fonts: await loadFonts(),
        xml,
        layout: form.layout,
        accentColor: form.accent,
        logo,
        lang: form.pdfLang,
        cancellation: form.docType === 'cancellation',
      });
      return { data: pdf, filename: `${base}.pdf`, mime: 'application/pdf', xml };
    }
    const xml = form.output === 'xrechnung-cii' ? c.buildCii(inv) : c.buildUbl(inv);
    return { data: xml, filename: `${base}-${form.output}.xml`, mime: 'application/xml', xml };
  }

  async function onDownload() {
    setError(null);
    setBusy(t('creating'));
    try {
      const f = await build();
      downloadFile(f.data, f.filename, f.mime);
    } catch (e) {
      const { key: k, message: m } = errorKey(e);
      setError(t(k as StringKey, { message: m }));
    } finally {
      setBusy(null);
    }
  }

  async function onCheck() {
    setError(null);
    setBusy(t('validating'));
    try {
      const f = await build();
      setChecked({ form, report: await validate(f.xml) });
    } catch (e) {
      const { key: k, message: m } = errorKey(e);
      setError(t(k as StringKey, { message: m }));
    } finally {
      setBusy(null);
    }
  }

  async function saveSender() {
    const s = { id: uid(), party: form.seller, iban: form.iban, bic: form.bic, accountName: form.accountName, logo: form.logo, accent: form.accent, layout: form.layout };
    const existing = data.senders.find((x) => x.party.name === form.seller.name);
    setData(await upsert('senders', existing ? { ...s, id: existing.id } : s));
    flash(t('saved'));
  }
  async function saveCustomer() {
    const c = { id: uid(), party: form.buyer, buyerReference: form.buyerReference };
    const existing = data.customers.find((x) => x.party.name === form.buyer.name);
    setData(await upsert('customers', existing ? { ...c, id: existing.id } : c));
    flash(t('saved'));
  }
  async function saveArticle(l: FormLine) {
    const a = { id: uid(), name: l.name, description: l.description, unitCode: l.unitCode, price: num(l.price), vatRate: l.vatRate };
    const existing = data.articles.find((x) => x.name === l.name);
    setData(await upsert('articles', existing ? { ...a, id: existing.id } : a));
    flash(t('saved'));
  }

  function onLogo(file: File | undefined) {
    if (!file) return;
    if (file.size > 1024 * 1024 || !/^image\/(png|jpeg)$/.test(file.type)) {
      setError(t('logo'));
      return;
    }
    const r = new FileReader();
    r.onload = () => update('logo')(String(r.result));
    r.readAsDataURL(file);
  }

  const showVat = form.taxCase === 'standard';
  const needsPreceding = ['final', 'credit', 'cancellation', 'corrected'].includes(form.docType);

  return (
    <div className="page">
      <h1>{t('createTitle')}</h1>
      <p className="lead">{t('createIntro')}</p>
      <div className="toolbar">
        <Select
          label={t('example')}
          value=""
          onChange={(v) => v && setForm((f) => formFromExample(v as ExampleKind, f))}
        >
          <option value="">{t('exampleNone')}</option>
          {EXAMPLE_KINDS.map((k) => (
            <option key={k} value={k}>
              {t(`ex_${k}` as StringKey)}
            </option>
          ))}
        </Select>
        <button type="button" className="secondary" onClick={() => setForm(emptyForm())}>
          {t('clearForm')}
        </button>
      </div>

      <div className="two-col create">
        <form className="form" onSubmit={(e) => e.preventDefault()} noValidate>
          <fieldset>
            <legend>{t('secDocument')}</legend>
            <div className="grid-fields">
              <Select label={t('docType')} value={form.docType} onChange={str('docType')}>
                {DOC_TYPES.map((d) => (
                  <option key={d.id} value={d.id}>
                    {t(`dt_${d.id}` as StringKey)} ({d.code})
                  </option>
                ))}
              </Select>
              <Field label={t('number')} value={form.number} onChange={str('number')} required />
              <Field label={t('issueDate')} value={form.issueDate} onChange={str('issueDate')} type="date" required />
              <Field label={t('dueDate')} value={form.dueDate} onChange={str('dueDate')} type="date" />
              <Field label={t('deliveryDate')} value={form.deliveryDate} onChange={str('deliveryDate')} type="date" />
              <Field label={t('periodStart')} value={form.periodStart} onChange={str('periodStart')} type="date" />
              <Field label={t('periodEnd')} value={form.periodEnd} onChange={str('periodEnd')} type="date" />
              <Field label={t('currency')} value={form.currency} onChange={str('currency')} maxLength={3} />
              <Field
                label={t('buyerReference')}
                value={form.buyerReference}
                onChange={str('buyerReference')}
                hint={t('buyerReferenceHint')}
                wide
                required={form.output !== 'zugferd'}
              />
              <Field label={t('orderReference')} value={form.orderReference} onChange={str('orderReference')} />
              {needsPreceding && (
                <>
                  <Field label={t('precedingNumber')} value={form.precedingNumber} onChange={str('precedingNumber')} required={form.docType !== 'final'} />
                  <Field label={t('precedingDate')} value={form.precedingDate} onChange={str('precedingDate')} type="date" />
                </>
              )}
              {form.docType === 'final' && <Field label={t('prepaid')} value={form.prepaid} onChange={str('prepaid')} inputMode="decimal" />}
              <TextArea label={t('note')} value={form.note} onChange={str('note')} />
            </div>
          </fieldset>

          <fieldset>
            <legend>{t('secTax')}</legend>
            <div className="radios">
              {TAX_CASES.map((c) => (
                <label key={c} className="radio">
                  <input type="radio" name="taxCase" value={c} checked={form.taxCase === c} onChange={() => update('taxCase')(c)} />
                  {t(`tax_${c}` as StringKey)}
                </label>
              ))}
            </div>
            {form.taxCase !== 'standard' && <p className="hint">{t(`taxHint_${form.taxCase}` as StringKey)}</p>}
          </fieldset>

          <fieldset>
            <legend>{t('secSeller')}</legend>
            {data.senders.length > 0 && (
              <Select
                label={t('pickSender')}
                value=""
                onChange={(id) => {
                  const s = data.senders.find((x) => x.id === id);
                  if (s) setForm((f) => ({ ...f, seller: s.party, iban: s.iban, bic: s.bic, accountName: s.accountName, logo: s.logo ?? f.logo, accent: s.accent ?? f.accent, layout: s.layout ?? f.layout }));
                }}
              >
                <option value="">{t('pickSender')}</option>
                {data.senders.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.party.name}
                  </option>
                ))}
              </Select>
            )}
            <PartyFields value={form.seller} onChange={update('seller')} seller />
            <div className="grid-fields">
              <Field label={t('iban')} value={form.iban} onChange={str('iban')} autoComplete="off" />
              <Field label={t('bic')} value={form.bic} onChange={str('bic')} autoComplete="off" />
              <Field label={t('accountName')} value={form.accountName} onChange={str('accountName')} />
            </div>
            <button type="button" className="secondary" onClick={saveSender}>
              {t('saveSender')}
            </button>
          </fieldset>

          <fieldset>
            <legend>{t('secBuyer')}</legend>
            {data.customers.length > 0 && (
              <Select
                label={t('pickCustomer')}
                value=""
                onChange={(id) => {
                  const c = data.customers.find((x) => x.id === id);
                  if (c) setForm((f) => ({ ...f, buyer: c.party, buyerReference: c.buyerReference || f.buyerReference }));
                }}
              >
                <option value="">{t('pickCustomer')}</option>
                {data.customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.party.name}
                  </option>
                ))}
              </Select>
            )}
            <PartyFields value={form.buyer} onChange={update('buyer')} seller={false} />
            <button type="button" className="secondary" onClick={saveCustomer}>
              {t('saveCustomer')}
            </button>
          </fieldset>

          <fieldset>
            <legend>{t('secLines')}</legend>
            {data.articles.length > 0 && (
              <Select
                label={t('pickArticle')}
                value=""
                onChange={(id) => {
                  const a = data.articles.find((x) => x.id === id);
                  if (a)
                    setForm((f) => ({
                      ...f,
                      lines: [...f.lines.filter((l) => l.name || l.price), { ...emptyLine(), name: a.name, description: a.description, unitCode: a.unitCode, price: a.price, vatRate: a.vatRate }],
                    }));
                }}
              >
                <option value="">{t('pickArticle')}</option>
                {data.articles.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            )}
            {form.lines.map((l, i) => (
              <LineRow
                key={l.key}
                line={l}
                index={i}
                showVat={showVat}
                onChange={(nl) => setForm((f) => ({ ...f, lines: f.lines.map((x) => (x.key === l.key ? nl : x)) }))}
                onRemove={() => setForm((f) => ({ ...f, lines: f.lines.filter((x) => x.key !== l.key) }))}
                onSave={() => saveArticle(l)}
              />
            ))}
            <button type="button" className="secondary" onClick={() => setForm((f) => ({ ...f, lines: [...f.lines, emptyLine()] }))}>
              + {t('addLine')}
            </button>
          </fieldset>

          <fieldset>
            <legend>{t('secAc')}</legend>
            {form.acs.map((a) => (
              <AcRow
                key={a.key}
                ac={a}
                showVat={showVat}
                onChange={(na) => setForm((f) => ({ ...f, acs: f.acs.map((x) => (x.key === a.key ? na : x)) }))}
                onRemove={() => setForm((f) => ({ ...f, acs: f.acs.filter((x) => x.key !== a.key) }))}
              />
            ))}
            <button
              type="button"
              className="secondary"
              onClick={() => setForm((f) => ({ ...f, acs: [...f.acs, { key: key(), kind: 'allowance', reason: '', amount: '', vatRate: '19' }] }))}
            >
              + {t('addAc')}
            </button>
          </fieldset>

          <fieldset>
            <legend>{t('secPayment')}</legend>
            <TextArea label={t('paymentTerms')} value={form.paymentTerms} onChange={str('paymentTerms')} />
          </fieldset>

          <fieldset>
            <legend>{t('secOutput')}</legend>
            <div className="radios">
              {(['zugferd', 'xrechnung-cii', 'xrechnung-ubl'] as OutputFormat[]).map((o) => (
                <label key={o} className="radio">
                  <input type="radio" name="output" value={o} checked={form.output === o} onChange={() => update('output')(o)} />
                  {t(`fmt_${o}` as StringKey)}
                </label>
              ))}
            </div>
            {form.output === 'zugferd' && (
              <div className="grid-fields">
                <Select label={t('layout')} value={form.layout} onChange={str('layout')}>
                  <option value="classic">{t('layout_classic')}</option>
                  <option value="modern">{t('layout_modern')}</option>
                </Select>
                <Field label={t('accent')} value={form.accent} onChange={str('accent')} type="color" />
                <Select label={t('pdfLang')} value={form.pdfLang} onChange={str('pdfLang')}>
                  <option value="de">Deutsch</option>
                  <option value="en">English</option>
                  <option value="tr">Türkçe</option>
                </Select>
                <div className="field wide">
                  <label htmlFor="logo-input">{t('logo')}</label>
                  <input id="logo-input" type="file" accept="image/png,image/jpeg" onChange={(e) => onLogo(e.target.files?.[0])} />
                  {form.logo && (
                    <div className="logo-preview">
                      <img src={form.logo} alt="" height={40} />
                      <button type="button" className="link danger" onClick={() => update('logo')(undefined)}>
                        {t('logoRemove')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </fieldset>

          <div className="sticky-actions">
            <button type="button" className="primary" onClick={onDownload} disabled={!!busy || !preview?.inv}>
              {t('download')}
            </button>
            <button type="button" className="secondary" onClick={onCheck} disabled={!!busy || !preview?.inv}>
              {t('check')}
            </button>
            {busy && (
              <span role="status" className="busy">
                <span className="spinner" aria-hidden="true" /> {busy}
              </span>
            )}
            {message && (
              <span role="status" className="ok-text">
                {message}
              </span>
            )}
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </form>

        <div className="side">
          {report && <ValidationReport report={report} />}
          <h2 className="preview-title">{t('preview')}</h2>
          {preview?.inv ? (
            <div className="preview" lang={lang}>
              <InvoiceView invoice={preview.inv} />
            </div>
          ) : preview ? (
            <p className="error">{t('previewError', { message: preview.error ?? '' })}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function dataUrlBytes(url: string): Uint8Array {
  const b64 = url.split(',')[1] ?? '';
  const s = atob(b64);
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}
