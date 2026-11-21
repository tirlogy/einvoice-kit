// SPDX-License-Identifier: MIT
import { useId, useRef, useState, type DragEvent } from 'react';
import { useI18n } from '../i18n';

export function FileDrop({ onFile, accept = '.pdf,.xml,application/pdf,text/xml,application/xml' }: { onFile: (f: File) => void; accept?: string }) {
  const { t } = useI18n();
  const [active, setActive] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setActive(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };
  return (
    <div
      className={`drop ${active ? 'active' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setActive(true);
      }}
      onDragLeave={() => setActive(false)}
      onDrop={onDrop}
    >
      <p className="drop-title" id={`${id}-t`}>
        {active ? t('dropActive') : t('dropTitle')}
      </p>
      <p className="muted" id={`${id}-h`}>
        {t('dropHint')}
      </p>
      <label className="button primary" htmlFor={id}>
        {t('dropButton')}
      </label>
      <input
        ref={input}
        id={id}
        className="visually-hidden"
        type="file"
        accept={accept}
        aria-describedby={`${id}-h`}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          if (input.current) input.current.value = '';
        }}
      />
    </div>
  );
}
