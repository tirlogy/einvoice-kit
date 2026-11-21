// SPDX-License-Identifier: MIT
import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { downloadFile, readFile } from '../lib/download';
import { deleteAll, exportJson, importData, loadAll, parseImport, remove, type Collection, type MasterData } from '../lib/storage';

export function DataPage() {
  const { t } = useI18n();
  const [data, setData] = useState<MasterData>({ senders: [], customers: [], articles: [] });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAll().then(setData).catch(() => undefined);
  }, []);

  const sections: { key: Collection; title: string; items: { id: string; name: string; sub: string }[] }[] = [
    { key: 'senders', title: t('senders'), items: data.senders.map((s) => ({ id: s.id, name: s.party.name, sub: [s.party.city, s.party.vatId || s.party.taxNumber].filter(Boolean).join(' · ') })) },
    { key: 'customers', title: t('customers'), items: data.customers.map((c) => ({ id: c.id, name: c.party.name, sub: [c.party.city, c.buyerReference].filter(Boolean).join(' · ') })) },
    { key: 'articles', title: t('articles'), items: data.articles.map((a) => ({ id: a.id, name: a.name, sub: `${a.price} · ${a.vatRate} %` })) },
  ];

  async function onImport(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const parsed = parseImport(JSON.parse(new TextDecoder().decode(await readFile(file))));
      const n = await importData(parsed);
      setData(await loadAll());
      setMessage(t('importDone', { n }));
    } catch {
      setError(t('importError'));
    }
  }

  async function onDeleteAll() {
    if (!window.confirm(t('deleteAllConfirm'))) return;
    await deleteAll();
    setData({ senders: [], customers: [], articles: [] });
    setMessage(t('deletedAll'));
  }

  return (
    <div className="page narrow">
      <h1>{t('dataTitle')}</h1>
      <p className="lead">{t('dataIntro')}</p>
      <div className="toolbar">
        <button type="button" className="secondary" onClick={() => downloadFile(exportJson(data), 'e-rechnung-kit-daten.json', 'application/json')}>
          {t('exportJson')}
        </button>
        <label className="button secondary" htmlFor="import-json">
          {t('importJson')}
        </label>
        <input id="import-json" className="visually-hidden" type="file" accept="application/json,.json" onChange={(e) => onImport(e.target.files?.[0])} />
        <button type="button" className="danger" onClick={onDeleteAll}>
          {t('deleteAll')}
        </button>
      </div>
      {message && (
        <p role="status" className="ok-text">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {sections.map((s) => (
        <section key={s.key} aria-labelledby={`h-${s.key}`}>
          <h2 id={`h-${s.key}`}>
            {s.title} ({s.items.length})
          </h2>
          {s.items.length === 0 ? (
            <p className="muted">{t('empty')}</p>
          ) : (
            <ul className="list">
              {s.items.map((i) => (
                <li key={i.id}>
                  <span>
                    <strong>{i.name}</strong>
                    <br />
                    <span className="muted small">{i.sub}</span>
                  </span>
                  <button type="button" className="link danger" aria-label={t('deleteItem', { name: i.name })} onClick={async () => setData(await remove(s.key, i.id))}>
                    {t('delete')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
