// SPDX-License-Identifier: MIT
import { formatMoney, formatNumber } from '@core/decimal';
import { documentTitle, label, unitName } from '@core/labels';
import { profileOf, type Address, type Invoice, type Party } from '@core/model';
import { base64Decode } from '@core/util';
import { localeOf, useI18n } from '../i18n';
import { downloadFile } from '../lib/download';

function fmtDate(iso: string | undefined, locale: string) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(locale, { timeZone: 'UTC' });
}

function AddressLines({ a }: { a: Address }) {
  return (
    <>
      {[a.line1, a.line2, a.line3].filter(Boolean).map((l) => (
        <span key={l}>
          {l}
          <br />
        </span>
      ))}
      {[a.postcode, a.city].filter(Boolean).join(' ')}
      {a.country ? ` (${a.country})` : ''}
    </>
  );
}

function PartyBlock({ title, p }: { title: string; p: Party }) {
  const { lang, t } = useI18n();
  return (
    <section className="party" aria-label={title}>
      <h3>{title}</h3>
      <p>
        <strong>{p.name}</strong>
        {p.tradingName && p.tradingName !== p.name ? (
          <>
            <br />
            {p.tradingName}
          </>
        ) : null}
        <br />
        <AddressLines a={p.address} />
      </p>
      <dl className="kv">
        {p.vatId && (
          <>
            <dt>{label(lang, 'vatId')}</dt>
            <dd>{p.vatId}</dd>
          </>
        )}
        {p.taxNumber && (
          <>
            <dt>{label(lang, 'taxNumber')}</dt>
            <dd>{p.taxNumber}</dd>
          </>
        )}
        {p.identifiers.map((i) => (
          <div key={i.id} className="kv-pair">
            <dt>ID{i.scheme ? ` (${i.scheme})` : ''}</dt>
            <dd>{i.id}</dd>
          </div>
        ))}
        {p.legalRegistrationId && (
          <>
            <dt>{t('invRegistration')}</dt>
            <dd>{p.legalRegistrationId.id}</dd>
          </>
        )}
        {p.electronicAddress && (
          <>
            <dt>{t('invEAddress')}</dt>
            <dd>{p.electronicAddress.id}</dd>
          </>
        )}
        {p.contact && (p.contact.name || p.contact.phone || p.contact.email) && (
          <>
            <dt>{label(lang, 'contact')}</dt>
            <dd>{[p.contact.name, p.contact.phone, p.contact.email].filter(Boolean).join(' · ')}</dd>
          </>
        )}
      </dl>
      {p.legalInfo && <p className="muted small">{p.legalInfo}</p>}
    </section>
  );
}

/** Human readable, printable rendering of an invoice in the current UI language. */
export function InvoiceView({ invoice: inv }: { invoice: Invoice }) {
  const { lang, t } = useI18n();
  const locale = localeOf(lang);
  const money = (v: string | undefined) => formatMoney(v, inv.currency, locale);
  const L = (k: Parameters<typeof label>[1], vars?: Record<string, string>) => label(lang, k, vars);
  const title = documentTitle(inv.typeCode, lang);

  const refs: [string, string | undefined][] = [
    [L('number'), inv.number],
    [L('date'), fmtDate(inv.issueDate, locale)],
    [t('invType'), `${title} (${inv.typeCode})`],
    [L('dueDate'), fmtDate(inv.dueDate, locale)],
    [L('deliveryDate'), fmtDate(inv.delivery?.date, locale)],
    [
      L('period'),
      inv.invoicingPeriod ? `${fmtDate(inv.invoicingPeriod.start, locale)} – ${fmtDate(inv.invoicingPeriod.end, locale)}` : undefined,
    ],
    [L('buyerReference'), inv.buyerReference],
    [L('orderReference'), inv.purchaseOrderReference],
    [L('contract'), inv.contractReference],
    [L('project'), inv.projectReference],
    ...inv.precedingInvoices.map((p): [string, string] => [L('precedingInvoice'), `${p.number}${p.issueDate ? ` (${fmtDate(p.issueDate, locale)})` : ''}`]),
    [t('invSpec'), `${profileOf(inv.specification)} · ${inv.specification}`],
  ];

  return (
    <article className="invoice" aria-label={`${title} ${inv.number}`}>
      <header className="invoice-head">
        <h2>
          {title} {inv.number}
        </h2>
        <p className="amount-due">
          {L('payable')}: <strong>{money(inv.totals.payable)}</strong>
        </p>
      </header>

      <div className="parties">
        <PartyBlock title={t('invSeller')} p={inv.seller} />
        <PartyBlock title={t('invBuyer')} p={inv.buyer} />
      </div>

      <section aria-label={t('invReferences')}>
        <h3>{t('invReferences')}</h3>
        <dl className="kv grid">
          {refs
            .filter(([, v]) => v)
            .map(([k, v], i) => (
              <div key={`${k}${i}`}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
        </dl>
      </section>

      {inv.notes.length > 0 && (
        <section aria-label={t('invNotes')}>
          <h3>{t('invNotes')}</h3>
          {inv.notes.map((n, i) => (
            <p key={i} className="pre">
              {n.subjectCode ? <span className="badge">{n.subjectCode}</span> : null} {n.text}
            </p>
          ))}
        </section>
      )}

      <section aria-label={t('invLines')}>
        <h3>{t('invLines')}</h3>
        {inv.lines.length === 0 ? (
          <p className="muted">{t('invNoLines')}</p>
        ) : (
          // scrollable on small screens, so it must be keyboard focusable (axe scrollable-region-focusable)
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          <div className="table-wrap" role="region" aria-label={t('invLines')} tabIndex={0}>
            <table>
              <thead>
                <tr>
                  <th scope="col">{L('pos')}</th>
                  <th scope="col">{L('description')}</th>
                  <th scope="col" className="num">
                    {L('quantity')}
                  </th>
                  <th scope="col" className="num">
                    {L('unitPrice')}
                  </th>
                  <th scope="col" className="num">
                    {L('vat')}
                  </th>
                  <th scope="col" className="num">
                    {L('amount')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {inv.lines.map((l) => (
                  <tr key={l.id}>
                    <td>{l.id}</td>
                    <td>
                      <strong>{l.item.name}</strong>
                      {l.item.description && <div className="muted small pre">{l.item.description}</div>}
                      {l.note && <div className="muted small pre">{l.note}</div>}
                      {l.allowances.map((a, i) => (
                        <div key={`a${i}`} className="muted small">
                          {L('allowance')}
                          {a.reason ? ` (${a.reason})` : ''}: −{money(a.amount)}
                        </div>
                      ))}
                      {l.charges.map((c, i) => (
                        <div key={`c${i}`} className="muted small">
                          {L('charge')}
                          {c.reason ? ` (${c.reason})` : ''}: +{money(c.amount)}
                        </div>
                      ))}
                    </td>
                    <td className="num">
                      {formatNumber(l.quantity, locale)} {unitName(l.unitCode, lang)}
                    </td>
                    <td className="num">{money(l.price.net)}</td>
                    <td className="num">{l.vat.rate !== undefined ? `${formatNumber(l.vat.rate, locale)} %` : l.vat.category}</td>
                    <td className="num">{money(l.netAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="totals" aria-label={t('invTotals')}>
        <h3>{t('invTotals')}</h3>
        <dl className="kv totals-list">
          <dt>{L('lineTotal')}</dt>
          <dd>{money(inv.totals.lineNet)}</dd>
          {inv.allowances.map((a, i) => (
            <div key={`da${i}`} className="kv-pair">
              <dt>
                {L('allowance')} {a.reason}
              </dt>
              <dd>−{money(a.amount)}</dd>
            </div>
          ))}
          {inv.charges.map((c, i) => (
            <div key={`dc${i}`} className="kv-pair">
              <dt>
                {L('charge')} {c.reason}
              </dt>
              <dd>+{money(c.amount)}</dd>
            </div>
          ))}
          <dt>{L('netTotal')}</dt>
          <dd>{money(inv.totals.taxExclusive)}</dd>
          {inv.vatBreakdown.map((v, i) => (
            <div key={`v${i}`} className="kv-pair">
              <dt>
                {v.rate !== undefined && ['S', 'L', 'M'].includes(v.category)
                  ? L('vatOn', { rate: formatNumber(v.rate, locale), base: money(v.taxableAmount) })
                  : L('vatCategory', { category: v.category, base: money(v.taxableAmount) })}
              </dt>
              <dd>{money(v.taxAmount)}</dd>
            </div>
          ))}
          <dt className="strong">{L('grossTotal')}</dt>
          <dd className="strong">{money(inv.totals.taxInclusive)}</dd>
          {inv.totals.prepaid && (
            <>
              <dt>{L('prepaid')}</dt>
              <dd>−{money(inv.totals.prepaid)}</dd>
            </>
          )}
          {inv.totals.rounding && (
            <>
              <dt>{L('rounding')}</dt>
              <dd>{money(inv.totals.rounding)}</dd>
            </>
          )}
          <dt className="strong">{L('payable')}</dt>
          <dd className="strong">{money(inv.totals.payable)}</dd>
        </dl>
        {inv.vatBreakdown
          .filter((v) => v.exemptionReason || v.exemptionReasonCode)
          .map((v, i) => (
            <p key={i} className="small">
              {t('invExemption')} ({v.category}): {[v.exemptionReason, v.exemptionReasonCode].filter(Boolean).join(' · ')}
            </p>
          ))}
      </section>

      {(inv.payment || inv.paymentTerms) && (
        <section aria-label={t('invPayment')}>
          <h3>{t('invPayment')}</h3>
          <dl className="kv">
            {inv.paymentTerms && (
              <>
                <dt>{L('paymentTerms')}</dt>
                <dd className="pre">{inv.paymentTerms}</dd>
              </>
            )}
            {inv.payment && (
              <>
                <dt>{t('invMeans')}</dt>
                <dd>
                  {inv.payment.meansCode}
                  {inv.payment.meansText ? ` · ${inv.payment.meansText}` : ''}
                </dd>
              </>
            )}
            {inv.payment?.creditTransfers.map((c, i) => (
              <div key={i} className="kv-pair">
                <dt>{L('bankDetails')}</dt>
                <dd>{[c.name, `IBAN ${c.iban}`, c.bic && `BIC ${c.bic}`].filter(Boolean).join(' · ')}</dd>
              </div>
            ))}
            {inv.payment?.remittanceInfo && (
              <>
                <dt>{L('remittance')}</dt>
                <dd>{inv.payment.remittanceInfo}</dd>
              </>
            )}
            {inv.payment?.card && (
              <>
                <dt>{t('invCard')}</dt>
                <dd>{[inv.payment.card.pan, inv.payment.card.holder].filter(Boolean).join(' · ')}</dd>
              </>
            )}
            {inv.payment?.directDebit && (
              <>
                <dt>{t('invMandate')}</dt>
                <dd>{[inv.payment.directDebit.mandateRef, inv.payment.directDebit.creditorId, inv.payment.directDebit.debitedAccount].filter(Boolean).join(' · ')}</dd>
              </>
            )}
          </dl>
        </section>
      )}

      {(inv.payee || inv.delivery?.address || inv.delivery?.name) && (
        <div className="parties">
          {inv.payee && (
            <section>
              <h3>{t('invPayee')}</h3>
              <p>{inv.payee.name}</p>
            </section>
          )}
          {(inv.delivery?.address || inv.delivery?.name) && (
            <section>
              <h3>{t('invDelivery')}</h3>
              <p>
                {inv.delivery.name && (
                  <>
                    {inv.delivery.name}
                    <br />
                  </>
                )}
                {inv.delivery.address && <AddressLines a={inv.delivery.address} />}
              </p>
            </section>
          )}
        </div>
      )}

      {inv.attachments.length > 0 && (
        <section aria-label={t('invAttachments')}>
          <h3>{t('invAttachments')}</h3>
          <ul>
            {inv.attachments.map((a, i) => (
              <li key={i}>
                {a.description ?? a.filename ?? a.id}
                {a.url && (
                  <>
                    {' · '}
                    <span className="muted">{a.url}</span>
                  </>
                )}
                {a.content && (
                  <>
                    {' · '}
                    <button
                      type="button"
                      className="link"
                      onClick={() => downloadFile(base64Decode(a.content!), a.filename ?? `${a.id}`, a.mimeCode ?? 'application/octet-stream')}
                    >
                      {t('invDownload')}
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
