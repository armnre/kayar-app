/**
 * `zitejs/db` stand-in — a browser-local, JSON-persisted database.
 *
 * The upstream app stores everything in a hosted database. This port implements the exact
 * same collection methods (`findOne/findAll/create/update/delete/count`) plus a `sql()`
 * adapter that runs the app's raw queries through the mini SQL engine in `./sql.ts`.
 * Data is persisted to `localStorage` so admin edits survive a reload.
 */

import { runSql, type SqlResult, type Tables, type Row } from './sql';
import './env';

export type DbRecord = Row & { id: string; createdAt?: string; updatedAt?: string };
export type MembersRecordType = DbRecord;
export type PostsRecordType = DbRecord;
export type TracksRecordType = DbRecord;
export type MediaAssetsRecordType = DbRecord;
export type CmsBlocksRecordType = DbRecord;
export type SessionsRecordType = DbRecord;
export type AnyRecordType = DbRecord;

export type QueryOpts = {
  id?: string;
  filters?: Record<string, unknown>;
  fields?: string[];
  limit?: number;
  offset?: number;
  sort?: { field: string; direction?: 'asc' | 'desc' } | string;
  orderBy?: { field: string; direction?: 'asc' | 'desc' };
};

export const COLLECTIONS = [
  'members',
  'sessions',
  'loginAttempts',
  'auditLogs',
  'siteSettings',
  'cmsBlocks',
  'cmsBlockVersions',
  'posts',
  'mediaAssets',
  'collections',
  'collectionItems',
  'tracks',
  'announcements',
  'listeningHistory',
  'favorites',
] as const;

export const STORAGE_KEY = 'kayar.local-db.v1';

const tables: Tables = {};
for (const c of COLLECTIONS) tables[c] = [];

/* ---------------------------------------------------------------- persistence */

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let storageBroken = false;

function persist() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (storageBroken || typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tables));
    } catch {
      // Quota exceeded (e.g. big uploaded images) — keep working in memory only.
      storageBroken = true;
      console.warn('[kayar] local storage full; continuing in memory for this session.');
    }
  }, 250);
}

function hydrate() {
  if (typeof localStorage === 'undefined') return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Tables;
    for (const c of COLLECTIONS) if (Array.isArray(parsed[c])) tables[c] = parsed[c]!;
    return true;
  } catch {
    return false;
  }
}

/** True when a local database already existed (used to decide whether to seed demo data). */
export const hadStoredData = hydrate();

export function resetLocalDatabase() {
  for (const c of COLLECTIONS) tables[c] = [];
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------- internals */

const camel = (s: string) => s.replace(/_([a-z])/g, (_m, c: string) => c.toUpperCase());
const snake = (s: string) => s.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());

function read(rec: Row, field: string) {
  if (rec[field] !== undefined) return rec[field];
  if (rec[camel(field)] !== undefined) return rec[camel(field)];
  if (rec[snake(field)] !== undefined) return rec[snake(field)];
  return undefined;
}

function matches(rec: Row, filters?: Record<string, unknown>) {
  if (!filters) return true;
  return Object.entries(filters).every(([key, want]) => {
    if (want === undefined) return true;
    const val = read(rec, key);
    if (want && typeof want === 'object' && !Array.isArray(want)) {
      const op = want as Record<string, unknown>;
      if ('in' in op) return (op.in as unknown[]).includes(val);
      if ('notIn' in op) return !(op.notIn as unknown[]).includes(val);
      if ('not' in op) return val !== op.not;
      if ('ne' in op) return val !== op.ne;
      if ('gte' in op) return String(val) >= String(op.gte);
      if ('gt' in op) return String(val) > String(op.gt);
      if ('lte' in op) return String(val) <= String(op.lte);
      if ('lt' in op) return String(val) < String(op.lt);
      return true;
    }
    if (Array.isArray(want)) return want.includes(val);
    return val === want;
  });
}

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

function project(rec: Row, fields?: string[]) {
  if (!fields?.length) return { ...rec };
  return Object.fromEntries(fields.map((f) => [f, read(rec, f)]));
}

function sortRows(rows: Row[], spec?: QueryOpts['sort'] | QueryOpts['orderBy']) {
  if (!spec) return rows;
  const s = typeof spec === 'string' ? { field: spec, direction: 'asc' as const } : spec;
  const dir = (s.direction ?? 'asc') === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = read(a, s.field);
    const bv = read(b, s.field);
    if (av === bv) return 0;
    return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
  });
}

function collection(name: string) {
  const rows = () => tables[name]!;
  return {
    /** Called as `zite.members.count(...)` — `this` is the returned object. */
    async count(opts: QueryOpts = {}) {
      return (await collection(name).findAll(opts)).total;
    },
    async findOne(opts: { id?: string; filters?: Record<string, unknown> } = {}) {
      const found = rows().find(
        (r) => (opts.id ? r.id === opts.id : true) && matches(r, opts.filters),
      );
      return found ? { ...found } : null;
    },
    async findAll(opts: QueryOpts = {}) {
      let found = rows().filter(
        (r) => (opts.id ? r.id === opts.id : true) && matches(r, opts.filters),
      );
      const total = found.length;
      found = sortRows(found, opts.sort ?? opts.orderBy);
      const offset = opts.offset ?? 0;
      const limit = opts.limit ?? found.length;
      return {
        records: found.slice(offset, offset + limit).map((r) => project(r, opts.fields)),
        total,
      };
    },
    async create({ record }: { record: Row }) {
      const now = new Date().toISOString();
      const rec: Row = { id: newId(), createdAt: now, updatedAt: now, ...record };
      rows().push(rec);
      persist();
      return { ...rec };
    },
    async update({ id, record }: { id: string; record: Row }) {
      const list = rows();
      const i = list.findIndex((r) => r.id === id);
      if (i < 0) return null;
      const next: Row = { ...list[i], ...record, id, updatedAt: new Date().toISOString() };
      list[i] = next;
      persist();
      return { ...next };
    },
    async delete({ id }: { id: string }) {
      const list = rows();
      const i = list.findIndex((r) => r.id === id);
      if (i >= 0) list.splice(i, 1);
      persist();
      return { id };
    },
  };
}

/** SQL table names are PascalCase; collections are camelCase. */
function sqlTables(): Tables {
  const out: Tables = {};
  for (const key of Object.keys(tables)) {
    out[key] = tables[key]!;
    out[key.charAt(0).toUpperCase() + key.slice(1)] = tables[key]!;
  }
  return out;
}

/* ------------------------------------------------------------------------ zite */

export type LocalZite = { sql: (args: { query: string; params?: unknown[] }) => Promise<SqlResult> } & Record<string, any>;

export const zite: LocalZite = {
  members: collection('members'),
  sessions: collection('sessions'),
  loginAttempts: collection('loginAttempts'),
  auditLogs: collection('auditLogs'),
  siteSettings: collection('siteSettings'),
  cmsBlocks: collection('cmsBlocks'),
  cmsBlockVersions: collection('cmsBlockVersions'),
  posts: collection('posts'),
  mediaAssets: collection('mediaAssets'),
  collections: collection('collections'),
  collectionItems: collection('collectionItems'),
  tracks: collection('tracks'),
  announcements: collection('announcements'),
  listeningHistory: collection('listeningHistory'),
  favorites: collection('favorites'),
  async sql({ query, params = [] }) {
    return runSql(sqlTables(), query, params);
  },
};

/** Escape hatch used by the demo-data seeder. */
export const __tables = tables;
export const __persist = () => persist();
