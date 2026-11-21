// SPDX-License-Identifier: MIT
import { explain } from '@core/validate/messages';
import type { Finding, Severity, ValidationReport as Report } from '@core/validate';
import { useState } from 'react';
import { useI18n } from '../i18n';
import type { StringKey } from '../i18n/strings';

const ORDER: Severity[] = ['error', 'warning', 'info'];

function shortPath(xpath?: string) {
  if (!xpath) return '';
  return xpath.replace(/Q\{[^}]*\}/g, '').replace(/\[1\]/g, '');
}

function FindingItem({ f }: { f: Finding }) {
  const { lang, t } = useI18n();
  const text = explain(f, lang);
  const source = f.source === 'plausibility' || f.source === 'profile' ? t(`ruleSource_${f.source}` as StringKey) : f.source;
  return (
    <li className={`finding ${f.severity}`}>
      <div className="finding-head">
        <span className={`sev ${f.severity}`}>{t(`severity_${f.severity}` as StringKey)}</span>
        <code className="rule-id">{f.id}</code>
        <span className="muted small">{source}</span>
      </div>
      <p>{text ?? f.message}</p>
      {(text || f.location) && (
        <details>
          <summary>{t('ruleOriginal')}</summary>
          <p className="small">{f.message}</p>
          {f.location && (
            <p className="small">
              {t('ruleLocation')}: <code className="break">{shortPath(f.location)}</code>
            </p>
          )}
        </details>
      )}
    </li>
  );
}

export function ValidationReport({ report, onCheckXRechnung }: { report: Report; onCheckXRechnung?: () => void }) {
  const { t } = useI18n();
  const [filter, setFilter] = useState<Severity | 'all'>('all');
  const findings = [...report.findings].sort((a, b) => ORDER.indexOf(a.severity) - ORDER.indexOf(b.severity));
  const shown = filter === 'all' ? findings : findings.filter((f) => f.severity === filter);
  const status = !report.germanEInvoice ? t('reportNoEInvoice') : report.valid ? t('reportValid') : t('reportInvalid');
  return (
    <section className="report" aria-labelledby="report-title" aria-live="polite">
      <h2 id="report-title">{t('reportTitle')}</h2>
      <p className={`status ${report.valid ? 'ok' : 'bad'}`} role="status" data-testid="validation-status">
        <span aria-hidden="true">{report.valid ? '✓' : '✕'}</span> {status}
      </p>
      <p className="small">
        {t('reportCounts', report.counts)} ·{' '}
        {report.rulesApplied.length ? t('reportRules', { rules: report.rulesApplied.join(', ') }) : t('reportNoRules')}
      </p>
      {report.findings.length === 0 ? (
        <p>{t('reportAllGood')}</p>
      ) : (
        <>
          <div className="filters" role="group" aria-label="Filter">
            {(['all', ...ORDER] as const).map((s) => (
              <button
                key={s}
                type="button"
                className={`chip ${filter === s ? 'active' : ''}`}
                aria-pressed={filter === s}
                onClick={() => setFilter(s)}
              >
                {s === 'all' ? t('filterAll') : t(`severity_${s}` as StringKey)} (
                {s === 'all' ? report.findings.length : report.counts[s]})
              </button>
            ))}
          </div>
          <ul className="findings">
            {shown.map((f, i) => (
              <FindingItem key={`${f.id}-${i}`} f={f} />
            ))}
          </ul>
        </>
      )}
      {onCheckXRechnung && !report.rulesApplied.some((r) => r.startsWith('xrechnung')) && report.germanEInvoice && (
        <button type="button" className="secondary" onClick={onCheckXRechnung}>
          {t('revalidateXr')}
        </button>
      )}
      <p className="muted small">{t('reportXsdNote')}</p>
    </section>
  );
}
