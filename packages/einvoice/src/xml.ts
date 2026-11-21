// SPDX-License-Identifier: MIT
import { DOMParser } from '@xmldom/xmldom';

/** Minimal element interface shared by xmldom and the browser DOM. */
export interface XEl {
  localName: string | null;
  nodeType: number;
  childNodes: ArrayLike<XEl>;
  textContent: string | null;
  getAttribute(name: string): string | null;
}

export class XmlParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'XmlParseError';
  }
}

/** Parses XML into a DOM. External entities are never resolved by xmldom. */
export function parseXml(xml: string): XEl {
  let fatal: string | undefined;
  const doc = new DOMParser({
    onError: (level, msg) => {
      if (level !== 'warning') fatal ??= msg;
    },
  }).parseFromString(xml.replace(/^\uFEFF/, ''), 'text/xml');
  const root = doc.documentElement as unknown as XEl | null;
  if (fatal || !root) throw new XmlParseError(fatal ?? 'Empty XML document');
  return root;
}

export function kids(el: XEl | undefined, name?: string): XEl[] {
  if (!el) return [];
  const out: XEl[] = [];
  for (let i = 0; i < el.childNodes.length; i++) {
    const c = el.childNodes[i]!;
    if (c.nodeType === 1 && (!name || c.localName === name)) out.push(c);
  }
  return out;
}

/** Follows a path of local names and returns the first match. */
export function at(el: XEl | undefined, ...path: string[]): XEl | undefined {
  let cur = el;
  for (const p of path) {
    cur = kids(cur, p)[0];
    if (!cur) return undefined;
  }
  return cur;
}

/** All elements reached by the path (the last segment may match several). */
export function all(el: XEl | undefined, ...path: string[]): XEl[] {
  if (path.length === 0) return el ? [el] : [];
  const parent = at(el, ...path.slice(0, -1));
  return kids(parent, path[path.length - 1]);
}

export function text(el: XEl | undefined, ...path: string[]): string | undefined {
  const t = at(el, ...path)?.textContent?.trim();
  return t ? t : undefined;
}

export function attr(el: XEl | undefined, name: string): string | undefined {
  const v = el?.getAttribute(name);
  return v ? v : undefined;
}

// ---------------------------------------------------------------- writer

export interface XNode {
  name: string;
  attrs?: Record<string, string | undefined>;
  children?: XNode[];
  text?: string;
}

type Child = XNode | undefined | false | null | '' | 0 | Child[];

const flat = (c: Child[]): XNode[] =>
  c.flatMap((x) => (Array.isArray(x) ? flat(x) : x ? [x] : []));

/** Element with children; omitted when it has no children (keeps output schema-clean). */
export function E(name: string, ...children: Child[]): XNode | undefined {
  const ch = flat(children);
  return ch.length ? { name, children: ch } : undefined;
}

/** Element with attributes and children. */
export function EA(name: string, attrs: Record<string, string | undefined>, ...children: Child[]): XNode | undefined {
  const ch = flat(children);
  return ch.length ? { name, attrs, children: ch } : undefined;
}

/** Text element; omitted when the value is empty. */
export function T(name: string, value: string | undefined | null, attrs?: Record<string, string | undefined>): XNode | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return { name, text: value, ...(attrs ? { attrs } : {}) };
}

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // strip characters not allowed in XML 1.0
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

export function serialize(node: XNode, indent = ''): string {
  const attrs = Object.entries(node.attrs ?? {})
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => ` ${k}="${escapeXml(v!)}"`)
    .join('');
  if (node.children?.length) {
    const inner = node.children.map((c) => serialize(c, indent + '  ')).join('\n');
    return `${indent}<${node.name}${attrs}>\n${inner}\n${indent}</${node.name}>`;
  }
  return `${indent}<${node.name}${attrs}>${escapeXml(node.text ?? '')}</${node.name}>`;
}

export function document(root: XNode): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n${serialize(root)}\n`;
}

/** Converts CII `102` dates (YYYYMMDD) to ISO. Leaves ISO input untouched. */
export function fromCiiDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const v = value.trim();
  if (/^\d{8}$/.test(v)) return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
  return v;
}

export function toCiiDate(iso: string | undefined): string | undefined {
  return iso ? iso.replace(/-/g, '') : undefined;
}
