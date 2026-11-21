// SPDX-License-Identifier: MIT
import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  wide?: boolean;
};

export function Field({ label, value, onChange, hint, wide, className, ...rest }: InputProps) {
  const id = useId();
  return (
    <div className={`field ${wide ? 'wide' : ''} ${className ?? ''}`}>
      <label htmlFor={id}>
        {label}
        {rest.required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <input id={id} value={value} onChange={(e) => onChange(e.target.value)} aria-describedby={hint ? `${id}-hint` : undefined} {...rest} />
      {hint && (
        <small id={`${id}-hint`} className="muted">
          {hint}
        </small>
      )}
    </div>
  );
}

export function TextArea({ label, value, onChange, wide = true }: { label: string; value: string; onChange: (v: string) => void; wide?: boolean }) {
  const id = useId();
  return (
    <div className={`field ${wide ? 'wide' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <textarea id={id} value={value} rows={2} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> & {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
  wide?: boolean;
};

export function Select({ label, value, onChange, children, wide, ...rest }: SelectProps) {
  const id = useId();
  return (
    <div className={`field ${wide ? 'wide' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} {...rest}>
        {children}
      </select>
    </div>
  );
}
