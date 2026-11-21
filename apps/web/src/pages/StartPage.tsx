// SPDX-License-Identifier: MIT
import { useI18n } from '../i18n';
import type { StringKey } from '../i18n/strings';
import { MILESTONES, nextMilestone } from '../lib/deadlines';

const GUIDE: { n: 1 | 2 | 3 | 4; href: string }[] = [
  { n: 1, href: '#/view' },
  { n: 2, href: '#/view' },
  { n: 3, href: '#/create' },
  { n: 4, href: '#/convert' },
];

export function StartPage() {
  const { t, list } = useI18n();
  const next = nextMilestone(new Date());
  const k = (s: string) => s as StringKey;

  return (
    <div className="start">
      <section className="hero" aria-labelledby="start-title">
        <div className="hero-text">
          <p className="eyebrow">{t('startEyebrow')}</p>
          <h1 id="start-title">{t('startTitle')}</h1>
          <p className="lead">{t('startLead')}</p>
          <p className="actions">
            <a className="button primary" href="#/view">
              {t('startCtaView')}
            </a>
            <a className="button secondary" href="#/create">
              {t('startCtaCreate')}
            </a>
          </p>
          <ul className="trust">
            {list('startTrust').map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
        <HeroSheet />
      </section>

      <section className="block" aria-labelledby="why">
        <h2 id="why">{t('whyTitle')}</h2>
        <div className="prose">
          {list('whyText').map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </section>

      <section className="block" aria-labelledby="deadlines">
        <h2 id="deadlines">{t('timelineTitle')}</h2>
        <ol className="timeline">
          {MILESTONES.map((m, i) => {
            const state = next === -1 || i < next ? 'past' : i === next ? 'next' : 'later';
            return (
              <li key={m.year} className={`tl tl-${state}`}>
                <p className="tl-year" aria-hidden="true">
                  {m.year}
                </p>
                <p className="tl-badge">
                  {t(state === 'past' ? 'tlPast' : state === 'next' ? 'tlNext' : 'tlLater')}
                </p>
                <h3>
                  <span className="tl-date">{t(k(`tl${m.n}Date`))}</span>
                  {t(k(`tl${m.n}Title`))}
                </h3>
                <p>{t(k(`tl${m.n}Text`))}</p>
              </li>
            );
          })}
        </ol>
        <p className="hint">{t('timelineNote')}</p>
      </section>

      <section className="block split" aria-labelledby="formats">
        <div>
          <h2 id="formats">{t('formatTitle')}</h2>
          <div className="checks">
            <div>
              <h3>{t('formatYesTitle')}</h3>
              <ul className="yes">
                {list('formatYes').map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>{t('formatNoTitle')}</h3>
              <ul className="no">
                {list('formatNo').map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="muted small">{t('formatNote')}</p>
        </div>
        <div>
          <h2 id="exceptions">{t('exceptTitle')}</h2>
          <ul className="plain-list">
            {list('exceptList').map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="block" aria-labelledby="guide">
        <h2 id="guide">{t('guideTitle')}</h2>
        <p className="lead">{t('guideLead')}</p>
        <ol className="steps">
          {GUIDE.map((g) => (
            <li key={g.n} className="step">
              <h3>{t(k(`guide${g.n}Title`))}</h3>
              <p>{t(k(`guide${g.n}Text`))}</p>
              <a href={g.href} aria-label={`${t('guideGo')}: ${t(k(`guide${g.n}Title`))}`}>
                {t('guideGo')} →
              </a>
            </li>
          ))}
        </ol>
        <div className="dev">
          <h3>{t('devTitle')}</h3>
          <p>{t('devText')}</p>
          <pre>
            <code>npm install @tirlogy/einvoice</code>
          </pre>
        </div>
      </section>

      <aside className="block note" aria-labelledby="note">
        <h2 id="note">{t('noteTitle')}</h2>
        <p>{t('noteText')}</p>
        <h3>{t('sourcesTitle')}</h3>
        <ul>
          <li>
            <a
              href="https://www.bundesfinanzministerium.de/Content/DE/FAQ/e-rechnung.html"
              rel="noopener"
            >
              {t('sourceFaq')}
            </a>
          </li>
          <li>
            <a href="https://www.e-rechnung.elster.de" rel="noopener">
              {t('sourceElster')}
            </a>
          </li>
        </ul>
      </aside>
    </div>
  );
}

/** Decorative sheet: an invoice whose structured XML half carries the validation stamp. */
function HeroSheet() {
  return (
    <svg className="hero-sheet" aria-hidden="true" viewBox="0 0 320 380" focusable="false">
      <rect x="20" y="16" width="230" height="300" rx="10" className="sheet" />
      <rect x="44" y="44" width="90" height="12" rx="3" className="ink" />
      <rect x="44" y="66" width="140" height="7" rx="3" className="line" />
      <rect x="44" y="80" width="110" height="7" rx="3" className="line" />
      <rect x="44" y="116" width="182" height="1.5" className="line" />
      {[134, 156, 178, 200].map((y) => (
        <g key={y}>
          <rect x="44" y={y} width="110" height="7" rx="3" className="line" />
          <rect x="186" y={y} width="40" height="7" rx="3" className="line" />
        </g>
      ))}
      <rect x="44" y="230" width="182" height="1.5" className="line" />
      <rect x="150" y="246" width="76" height="12" rx="3" className="ink" />
      <rect x="92" y="196" width="210" height="150" rx="10" className="xml" />
      <text x="112" y="228" className="code">
        &lt;Invoice&gt;
      </text>
      <text x="128" y="252" className="code dim">
        &lt;BT-112&gt;1190.00
      </text>
      <text x="128" y="276" className="code dim">
        &lt;BT-115&gt;1190.00
      </text>
      <text x="112" y="300" className="code">
        &lt;/Invoice&gt;
      </text>
      <g transform="rotate(-12 262 118)">
        <circle cx="262" cy="118" r="46" className="stamp" />
        <circle cx="262" cy="118" r="38" className="stamp thin" />
        <text x="262" y="114" className="stamp-text">
          EN 16931
        </text>
        <text x="262" y="132" className="stamp-text big">
          ✓
        </text>
      </g>
    </svg>
  );
}
