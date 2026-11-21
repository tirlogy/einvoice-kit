// SPDX-License-Identifier: MIT
import type { ConvertTarget } from '@core/convert';
import { useState } from 'react';
import { FileDrop } from '../components/FileDrop';
import { useI18n } from '../i18n';
import type { StringKey } from '../i18n/strings';
import { downloadFile, MAX_FILE, readFile } from '../lib/download';
import { core, errorKey, loadFonts } from '../lib/engine';

const TARGETS: ConvertTarget[] = ['ZUGFERD', 'XRECHNUNG-CII', 'XRECHNUNG-UBL', 'CII', 'UBL'];

export function ConvertPage() {
  const { t, lang } = useI18n();
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array } | null>(null);
  const [target, setTarget] = useState<ConvertTarget>('ZUGFERD');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ file: string; warnings: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFile(f: File) {
    setResult(null);
    setError(f.size > MAX_FILE ? t('errTooLarge') : null);
    if (f.size <= MAX_FILE) setFile({ name: f.name, bytes: await readFile(f) });
  }

  async function run() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const c = await core();
      const out = await c.convertInvoice(file.bytes, target, target === 'ZUGFERD' ? { fonts: await loadFonts(), lang } : undefined);
      downloadFile(out.data, out.filename, out.mimeType);
      setResult({ file: out.filename, warnings: out.warnings.map((w) => /^\[(\w+)\]/.exec(w)?.[1] ?? '') });
    } catch (e) {
      const tag = /^\[(\w+)\]/.exec((e as Error).message ?? '')?.[1];
      if (tag === 'PROFILE') setError(t('convertWarnPROFILE'));
      else {
        const { key, message } = errorKey(e);
        setError(t(key as StringKey, { message }));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page narrow">
      <h1>{t('convertTitle')}</h1>
      <p className="lead">{t('convertIntro')}</p>
      <FileDrop onFile={onFile} />
      {file && (
        <p className="muted" data-testid="convert-file">
          {t('sourceFile')}: {file.name}
        </p>
      )}
      <fieldset>
        <legend>{t('convertTarget')}</legend>
        <div className="radios">
          {TARGETS.map((tg) => (
            <label key={tg} className="radio">
              <input type="radio" name="target" value={tg} checked={target === tg} onChange={() => setTarget(tg)} />
              {t(`ct_${tg}` as StringKey)}
            </label>
          ))}
        </div>
      </fieldset>
      <button type="button" className="primary" onClick={run} disabled={!file || busy}>
        {t('convertButton')}
      </button>
      {busy && (
        <p role="status" className="busy">
          <span className="spinner" aria-hidden="true" /> {t('creating')}
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {result && (
        <div role="status">
          <p className="ok-text">{t('convertDone', { file: result.file })}</p>
          {result.warnings.filter(Boolean).map((w) => (
            <p key={w} className="hint">
              {t(`convertWarn${w}` as StringKey)}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
