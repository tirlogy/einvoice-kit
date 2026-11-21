// SPDX-License-Identifier: MIT
import { lazy, Suspense, useEffect, useState } from 'react';
import { LANGS, useI18n, type Lang } from './i18n';
import type { StringKey } from './i18n/strings';
import { Logo } from './components/Logo';
import { NavIcon } from './components/NavIcon';
import { CreatePage } from './pages/CreatePage';
import { StartPage } from './pages/StartPage';
import { ViewPage } from './pages/ViewPage';

// small secondary pages are split off; viewer and editor are the entry points and load eagerly
const ConvertPage = lazy(() => import('./pages/ConvertPage').then((m) => ({ default: m.ConvertPage })));
const DataPage = lazy(() => import('./pages/DataPage').then((m) => ({ default: m.DataPage })));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })));

type Route = 'start' | 'view' | 'create' | 'convert' | 'data' | 'privacy';
const ROUTES: { id: Exclude<Route, 'privacy'>; label: StringKey; short: StringKey }[] = [
  { id: 'start', label: 'navStart', short: 'navStartShort' },
  { id: 'view', label: 'navView', short: 'navViewShort' },
  { id: 'create', label: 'navCreate', short: 'navCreateShort' },
  { id: 'convert', label: 'navConvert', short: 'navConvertShort' },
  { id: 'data', label: 'navData', short: 'navDataShort' },
];

const routeFromHash = (): Route => {
  const h = location.hash.replace(/^#\/?/, '');
  return (['start', 'view', 'create', 'convert', 'data', 'privacy'] as Route[]).includes(h as Route) ? (h as Route) : 'start';
};

type Theme = 'system' | 'light' | 'dark';
const NEXT_THEME: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' };
const THEME_LABEL: Record<Theme, StringKey> = { system: 'themeSystem', light: 'themeLight', dark: 'themeDark' };
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
        <a href="#/start" className="brand">
          <Logo size={30} />
          <span className="brand-name">{t('appName')}</span>
        </a>
        <nav aria-label="Navigation" className="main-nav">
          <ul>
            {ROUTES.map((r) => (
              <li key={r.id}>
                <a href={`#/${r.id}`} aria-current={route === r.id ? 'page' : undefined}>
                  <NavIcon name={r.id} />
                  <span className="nav-long">{t(r.label)}</span>
                  <span className="nav-short">{t(r.short)}</span>
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
          <button
            type="button"
            className="icon-button"
            onClick={() => setTheme(NEXT_THEME[theme])}
            aria-label={`${t('theme')}: ${t(THEME_LABEL[theme])}`}
            title={`${t('theme')}: ${t(THEME_LABEL[theme])}`}
          >
            <NavIcon name={theme} />
          </button>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        {route !== 'start' && <p className="local-note no-print">{t('localOnly')}</p>}
        <Suspense
          fallback={
            <p className="busy" role="status">
              <span className="spinner" aria-hidden="true" /> {t('loading')}
            </p>
          }
        >
          {route === 'start' && <StartPage />}
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
