// SPDX-License-Identifier: MIT
import { useI18n } from '../i18n';

export function PrivacyPage() {
  const { t, list } = useI18n();
  return (
    <div className="page narrow">
      <h1>{t('privacyTitle')}</h1>
      {list('privacyText').map((p) => (
        <p key={p}>{p}</p>
      ))}
      <p>
        {t('privacyContact')}{' '}
        <a href="https://tiryaki.eu/impressum" rel="noopener">
          tiryaki.eu/impressum
        </a>
      </p>
    </div>
  );
}
