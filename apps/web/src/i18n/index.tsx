// SPDX-License-Identifier: MIT
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { STRINGS, type StringKey } from './strings';

export type Lang = 'de' | 'en' | 'tr';
export const LANGS: { code: Lang; label: string }[] = [
  { code: 'de', label: 'Deutsch' },
  { code: 'en', label: 'English' },
  { code: 'tr', label: 'Türkçe' },
];

/** Browser language if supported, otherwise English. */
export function detectLang(): Lang {
  try {
    const saved = localStorage.getItem('lang');
    if (saved === 'de' || saved === 'en' || saved === 'tr') return saved;
  } catch {
    /* storage blocked */
  }
  for (const l of navigator.languages ?? [navigator.language]) {
    const code = l.slice(0, 2).toLowerCase();
    if (code === 'de' || code === 'en' || code === 'tr') return code;
  }
  return 'en';
}

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
  list: (key: StringKey) => string[];
}

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem('lang', l);
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = `${STRINGS[lang].appName} · ZUGFeRD & XRechnung`;
  }, [lang]);
  const value = useMemo<Ctx>(
    () => ({
      lang,
      setLang,
      t: (key, vars = {}) => {
        const s = STRINGS[lang][key];
        const str = Array.isArray(s) ? s.join(' ') : s;
        return str.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));
      },
      list: (key) => {
        const s = STRINGS[lang][key];
        return Array.isArray(s) ? s : [s];
      },
    }),
    [lang, setLang],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const c = useContext(I18nContext);
  if (!c) throw new Error('I18nProvider missing');
  return c;
}

/** Locale aware upper case (Turkish dotted/dotless i). */
export const upper = (s: string, lang: Lang) => s.toLocaleUpperCase(lang === 'tr' ? 'tr' : lang);
export const localeOf = (lang: Lang) => ({ de: 'de-DE', en: 'en-GB', tr: 'tr-TR' })[lang];
