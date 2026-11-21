// SPDX-License-Identifier: MIT
/**
 * Local master data (senders, customers, articles) in IndexedDB.
 * Invoices themselves are never stored.
 */
import { clear, createStore, get, set } from 'idb-keyval';

export interface PartyData {
  name: string;
  street: string;
  postcode: string;
  city: string;
  country: string;
  vatId: string;
  taxNumber: string;
  registration: string;
  contactName: string;
  phone: string;
  email: string;
  eAddress: string;
  /** BT-29 for the seller (supplier no. at customer) or BT-46 for the buyer (customer no.). */
  identifier: string;
}

export interface Sender {
  id: string;
  party: PartyData;
  iban: string;
  bic: string;
  accountName: string;
  logo?: string;
  accent?: string;
  layout?: 'classic' | 'modern';
}

export interface Customer {
  id: string;
  party: PartyData;
  buyerReference: string;
}

export interface Article {
  id: string;
  name: string;
  description: string;
  unitCode: string;
  price: string;
  vatRate: string;
}

export interface MasterData {
  senders: Sender[];
  customers: Customer[];
  articles: Article[];
}

export type Collection = keyof MasterData;

let store: ReturnType<typeof createStore> | undefined;
const db = () => (store ??= createStore('einvoice-kit', 'masterdata'));

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export async function loadAll(): Promise<MasterData> {
  const [senders, customers, articles] = await Promise.all([
    get<Sender[]>('senders', db()),
    get<Customer[]>('customers', db()),
    get<Article[]>('articles', db()),
  ]);
  return { senders: senders ?? [], customers: customers ?? [], articles: articles ?? [] };
}

export async function saveCollection<K extends Collection>(key: K, items: MasterData[K]): Promise<void> {
  await set(key, items, db());
}

export async function upsert<K extends Collection>(key: K, item: MasterData[K][number]): Promise<MasterData> {
  const data = await loadAll();
  const list = data[key] as { id: string }[];
  const i = list.findIndex((x) => x.id === item.id);
  if (i >= 0) list[i] = item;
  else list.push(item);
  await saveCollection(key, list as MasterData[K]);
  return data;
}

export async function remove(key: Collection, id: string): Promise<MasterData> {
  const data = await loadAll();
  (data[key] as { id: string }[]) = (data[key] as { id: string }[]).filter((x) => x.id !== id);
  await saveCollection(key, data[key]);
  return data;
}

export async function deleteAll(): Promise<void> {
  await clear(db());
}

// ------------------------------------------------------------ import validation

const MAX = 2000;
const str = (v: unknown, max = 500): string => (typeof v === 'string' ? v.slice(0, max) : '');

function party(v: unknown): PartyData {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  return {
    name: str(o.name),
    street: str(o.street),
    postcode: str(o.postcode, 20),
    city: str(o.city),
    country: str(o.country, 2).toUpperCase(),
    vatId: str(o.vatId, 30),
    taxNumber: str(o.taxNumber, 30),
    registration: str(o.registration, 60),
    contactName: str(o.contactName),
    phone: str(o.phone, 40),
    email: str(o.email, 200),
    eAddress: str(o.eAddress, 200),
    identifier: str(o.identifier, 60),
  };
}

const isDataImage = (v: unknown) => typeof v === 'string' && /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(v) && v.length < 1.5e6;

/** Validates untrusted JSON (import) and returns clean master data. Throws on invalid structure. */
export function parseImport(json: unknown): MasterData {
  if (!json || typeof json !== 'object') throw new Error('not an object');
  const o = json as Record<string, unknown>;
  if (o.format !== 'einvoice-kit/masterdata' || o.version !== 1) throw new Error('unknown format');
  const arr = (v: unknown) => (Array.isArray(v) ? v.slice(0, MAX) : []);
  const obj = (v: unknown) => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});
  return {
    senders: arr(o.senders).map((x) => {
      const s = obj(x);
      return {
        id: str(s.id, 80) || uid(),
        party: party(s.party),
        iban: str(s.iban, 40),
        bic: str(s.bic, 11),
        accountName: str(s.accountName),
        logo: isDataImage(s.logo) ? (s.logo as string) : undefined,
        accent: /^#[0-9a-f]{6}$/i.test(str(s.accent)) ? str(s.accent) : undefined,
        layout: s.layout === 'modern' ? 'modern' : 'classic',
      };
    }),
    customers: arr(o.customers).map((x) => {
      const c = obj(x);
      return { id: str(c.id, 80) || uid(), party: party(c.party), buyerReference: str(c.buyerReference, 60) };
    }),
    articles: arr(o.articles).map((x) => {
      const a = obj(x);
      return {
        id: str(a.id, 80) || uid(),
        name: str(a.name),
        description: str(a.description, 2000),
        unitCode: str(a.unitCode, 3) || 'C62',
        price: /^-?\d+(\.\d+)?$/.test(str(a.price)) ? str(a.price) : '0',
        vatRate: /^\d+(\.\d+)?$/.test(str(a.vatRate)) ? str(a.vatRate) : '19',
      };
    }),
  };
}

export function exportJson(data: MasterData): string {
  return JSON.stringify({ format: 'einvoice-kit/masterdata', version: 1, exportedAt: new Date().toISOString(), ...data }, null, 2);
}

export async function importData(data: MasterData): Promise<number> {
  const current = await loadAll();
  const merge = <T extends { id: string }>(a: T[], b: T[]) => [...a.filter((x) => !b.some((y) => y.id === x.id)), ...b];
  await Promise.all([
    saveCollection('senders', merge(current.senders, data.senders)),
    saveCollection('customers', merge(current.customers, data.customers)),
    saveCollection('articles', merge(current.articles, data.articles)),
  ]);
  return data.senders.length + data.customers.length + data.articles.length;
}
