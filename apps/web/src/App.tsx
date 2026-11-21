// SPDX-License-Identifier: MIT
import { lazy, Suspense, useEffect, useState } from 'react';
import { LANGS, useI18n, type Lang } from './i18n';
import type { StringKey } from './i18n/strings';
import { CreatePage } from './pages/CreatePage';
import { ViewPage } from './pages/ViewPage';

// small secondary pages are split off; viewer and editor are the entry points and load eagerly
const ConvertPage = lazy(() => import('./pages/ConvertPage').then((m) => ({ default: m.ConvertPage })));
const DataPage = lazy(() => import('./pages/DataPage').then((m) => ({ default: m.DataPage })));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })));

type Route = 'view' | 'create' | 'convert' | 'data' | 'privacy';
const ROUTES: { id: Route; label: StringKey }[] = [
  { id: 'view', label: 'navView' },
  { id: 'create', label: 'navCreate' },
  { id: 'convert', label: 'navConvert' },
  { id: 'data', label: 'navData' },
];

const routeFromHash = (): Route => {
  const h = location.hash.replace(/^#\/?/, '');
  return (['view', 'create', 'convert', 'data', 'privacy'] as Route[]).includes(h as Route) ? (h as Route) : 'view';
};

type Theme = 'system' | 'light' | 'dark';
const loadTheme = (): Theme => {
  try {
    const t = localStorage.getItem('theme');
    return t === 'light' || t === 'dark' ? t : 'system';
  } catch {
    return 'system';
  }
};

export function App() {
  const { t, lang, setLang } = useI18n();
  const [route, setRoute] = useState<Route>(routeFromHash);
  const [theme, setTheme] = useState<Theme>(loadTheme);

  useEffect(() => {
    const on = () => {
      setRoute(routeFromHash());
      document.getElementById('main')?.focus();
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('theme', theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  return (
    <>
      <a className="skip" href="#main">
        {t('skip')}
      </a>
      <header className="site-header no-print">
        <div className="brand">
          <svg aria-hidden="true" width="28" height="28" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="7" fill="var(--primary)" />
            <path d="M9 8h10l4 4v12H9z" fill="none" stroke="var(--on-primary)" strokeWidth="2" strokeLinejoin="round" />
            <path d="M12 16h8M12 20h5" stroke="var(--on-primary)" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <a href="#/view" className="brand-name">
            {t('appName')}
          </a>
        </div>
        <nav aria-label="Navigation">
          <ul>
            {ROUTES.map((r) => (
              <li key={r.id}>
                <a href={`#/${r.id}`} aria-current={route === r.id ? 'page' : undefined}>
                  {t(r.label)}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="prefs">
          <label className="visually-hidden" htmlFor="lang-select">
            {t('language')}
          </label>
          <select id="lang-select" value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
            {LANGS.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
          <label className="visually-hidden" htmlFor="theme-select">
            {t('theme')}
          </label>
          <select id="theme-select" value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
            <option value="system">{t('themeSystem')}</option>
            <option value="light">{t('themeLight')}</option>
            <option value="dark">{t('themeDark')}</option>
          </select>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        <p className="local-note no-print">{t('localOnly')}</p>
        <Suspense
          fallback={
            <p className="busy" role="status">
              <span className="spinner" aria-hidden="true" /> {t('loading')}
            </p>
          }
        >
          {route === 'view' && <ViewPage />}
          {route === 'create' && <CreatePage />}
          {route === 'convert' && <ConvertPage />}
          {route === 'data' && <DataPage />}
          {route === 'privacy' && <PrivacyPage />}
        </Suspense>
      </main>
      <footer className="site-footer no-print">
        <p>
          <a href="https://tiryaki.eu" rel="noopener">
            {t('footerBuilt')}
          </a>
        </p>
        <p>
          <a href="#/privacy">{t('footerPrivacy')}</a> ·{' '}
          <a href="https://tiryaki.eu/impressum" rel="noopener">
            {t('footerImprint')}
          </a>{' '}
          ·{' '}
          <a href="https://github.com/tirlogy/einvoice-kit" rel="noopener">
            {t('footerSource')}
          </a>
        </p>
      </footer>
    </>
  );
}
