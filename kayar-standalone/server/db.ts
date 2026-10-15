/**
 * KAYAR backend — real persistence on SQLite (`better-sqlite3`).
 *
 * This module replaces the browser-local storage shim with a true database while keeping the
 * exact same contract the 26 endpoint modules expect from `zitejs/db`:
 *   zite.<collection>.findOne / findAll / create / update / delete / count
 *   zite.sql({ query, params })            ← raw SQL, translated from the app's Postgres dialect
 *
 * Tables are created on boot; the `created_at` column is a virtual alias of `createdAt`, so the
 * app's snake_case and camelCase queries both resolve against one physical column.
 */
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { config } from './config';

export type Row = Record<string, any>;
export type QueryOpts = {
  id?: string;
  filters?: Record<string, unknown>;
  fields?: string[];
  limit?: number;
  offset?: number;
  sort?: { field: string; direction?: 'asc' | 'desc' } | string;
  orderBy?: { field: string; direction?: 'asc' | 'desc' };
};

/** Column plan per table: name → SQL type. Arrays/objects are stored as JSON text. */
const TEXT = 'TEXT';
const INT = 'INTEGER';
const NUM = 'REAL';

export const SCHEMA: Record<string, Record<string, string>> = {
  Members: {
    username: TEXT, phone: TEXT, displayName: TEXT, role: TEXT, status: TEXT, passwordHash: TEXT,
    mustChangePassword: INT, orderRef: TEXT, note: TEXT, tags: TEXT, lastLoginAt: TEXT, createdBy: TEXT,
    plan: TEXT, expiresAt: TEXT,
  },
  Sessions: { tokenHash: TEXT, memberId: TEXT, userAgent: TEXT, lastSeenAt: TEXT, expiresAt: TEXT, revokedAt: TEXT },
  LoginAttempts: { key: TEXT, count: INT, windowStart: TEXT, lockedUntil: TEXT },
  AuditLogs: { actorId: TEXT, action: TEXT, targetType: TEXT, targetId: TEXT, meta: TEXT, ip: TEXT },
  SiteSettings: { key: TEXT, value: TEXT },
  CmsBlocks: { key: TEXT, content: TEXT, publishedContent: TEXT, status: TEXT, version: INT, updatedBy: TEXT },
  CmsBlockVersions: { blockKey: TEXT, version: INT, content: TEXT, savedBy: TEXT },
  Posts: {
    slug: TEXT, title: TEXT, excerpt: TEXT, body: TEXT, tags: TEXT, status: TEXT, publishedAt: TEXT,
    coverMediaId: TEXT, seoTitle: TEXT, seoDescription: TEXT, authorId: TEXT,
  },
  MediaAssets: {
    alt: TEXT, fileUrl: TEXT, kind: TEXT, fileName: TEXT, mimeType: TEXT, width: INT, height: INT, size: INT, uploadedBy: TEXT,
  },
  Collections: { title: TEXT, slug: TEXT, description: TEXT, coverUrl: TEXT, type: TEXT, placement: TEXT, status: TEXT, sortOrder: INT },
  CollectionItems: { collectionId: TEXT, trackId: TEXT, sortOrder: INT },
  Tracks: {
    title: TEXT, artist: TEXT, album: TEXT, source: TEXT, sourceId: TEXT, coverUrl: TEXT, audioUrl: TEXT,
    durationSeconds: INT, licenseUrl: TEXT, shareUrl: TEXT, rights: TEXT, categories: TEXT, tags: TEXT, isFeatured: INT, status: TEXT, sortOrder: INT,
  },
  Announcements: { title: TEXT, body: TEXT, link: TEXT, startsAt: TEXT, endsAt: TEXT, status: TEXT, audience: TEXT, createdBy: TEXT },
  ListeningHistory: { memberId: TEXT, trackId: TEXT, positionSec: NUM, completed: INT, playedAt: TEXT },
  Favorites: { memberId: TEXT, trackId: TEXT },
  /** Payments: one row per checkout, linked to the account it provisions. */
  Orders: {
    plan: TEXT, amount: INT, currency: TEXT, provider: TEXT, status: TEXT, authority: TEXT, refId: TEXT,
    phone: TEXT, fullName: TEXT, memberId: TEXT, username: TEXT, tempPassword: TEXT, payload: TEXT, paidAt: TEXT, channel: TEXT,
  },
};

/** Columns holding JSON (arrays/objects) — parsed on read, serialised on write. */
const JSON_COLUMNS: Record<string, string[]> = {
  Members: ['tags'],
  AuditLogs: ['meta'],
  Orders: ['payload'],
  Announcements: [],
  CmsBlocks: [],
};

export const db = new Database(resolve(config.dbPath));
db.pragma('journal_mode = WAL');

mkdirSync(dirname(resolve(config.dbPath)), { recursive: true });

/* ------------------------------------------------------------------ migrations */

export function ensureSchema() {
  for (const [table, cols] of Object.entries(SCHEMA)) {
    const defs = Object.entries(cols).map(([name, type]) => `"${name}" ${type}`);
    db.exec(
      `CREATE TABLE IF NOT EXISTS "${table}" (\n` +
        `  id TEXT PRIMARY KEY,\n  ${defs.join(',\n  ')},\n` +
        `  "createdAt" TEXT,\n  "updatedAt" TEXT,\n` +
        `  created_at TEXT GENERATED ALWAYS AS ("createdAt") VIRTUAL\n)`,
    );
    db.exec(`CREATE INDEX IF NOT EXISTS idx_${table}_created ON "${table}"("createdAt")`);
  }
  // Additive migrations for tables created by older builds.
  for (const [table, cols] of Object.entries(SCHEMA)) {
    const existing = new Set(db.prepare(`PRAGMA table_info("${table}")`).all().map((r: any) => r.name));
    for (const [name, type] of Object.entries(cols)) {
      if (!existing.has(name)) db.exec(`ALTER TABLE "${table}" ADD COLUMN "${name}" ${type}`);
    }
  }
}

const newId = () => globalThis.crypto.randomUUID();

const camel = (s: string) => s.replace(/_([a-z])/g, (_m, c: string) => c.toUpperCase());
const snake = (s: string) => s.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());

/** Reads a field allowing snake_case ⇄ camelCase, mirroring the in-browser adapter. */
function readField(rec: Row, field: string) {
  if (rec[field] !== undefined) return rec[field];
  if (rec[camel(field)] !== undefined) return rec[camel(field)];
  if (rec[snake(field)] !== undefined) return rec[snake(field)];
  return undefined;
}

function toStorage(table: string, value: unknown) {
  if (value === undefined) return null;
  if (Array.isArray(value) || (value !== null && typeof value === 'object')) return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 1 : 0;
  return value as any;
}

function fromStorage(table: string, rec: Row) {
  const json = JSON_COLUMNS[table] ?? [];
  for (const col of json) {
    const v = rec[col];
    if (typeof v === 'string' && (v.startsWith('[') || v.startsWith('{'))) {
      try { rec[col] = JSON.parse(v); } catch { /* keep raw */ }
    }
  }
  return rec;
}

/** Column names actually present in the table (minus generated ones). */
const columnCache = new Map<string, Set<string>>();
function columnsOf(table: string) {
  let cols = columnCache.get(table);
  if (!cols) {
    cols = new Set(db.prepare(`PRAGMA table_info("${table}")`).all().map((r: any) => r.name));
    columnCache.set(table, cols);
  }
  return cols;
}

const quote = (id: string) => `"${id.replace(/"/g, '""')}"`;

/* --------------------------------------------------------------- repository */

export function collection(name: string) {
  const table = name.charAt(0).toUpperCase() + name.slice(1);
  const tableName = SCHEMA[table] ? table : name;

  const whereClause = (filters?: Record<string, unknown>) => {
    const clauses: string[] = [];
    const params: unknown[] = [];
    const push = (sql: string) => { clauses.push(sql); };
    for (const [rawKey, want] of Object.entries(filters ?? {})) {
      if (want === undefined) continue;
      const candidates = [rawKey, camel(rawKey), snake(rawKey)];
      const key = candidates.find((c) => columnsOf(tableName).has(c)) ?? rawKey;
      const col = quote(key);
      if (want !== null && typeof want === 'object' && !Array.isArray(want)) {
        const op = want as Record<string, unknown>;
        if ('in' in op) {
          const list = (op.in as unknown[]) ?? [];
          if (!list.length) push('1 = 0');
          else { push(`${col} IN (${list.map(() => '?').join(',')})`); params.push(...list.map((v) => toStorage(tableName, v))); }
          continue;
        }
        if ('notIn' in op) {
          const list = (op.notIn as unknown[]) ?? [];
          if (list.length) { push(`${col} NOT IN (${list.map(() => '?').join(',')})`); params.push(...list.map((v) => toStorage(tableName, v))); }
          continue;
        }
        if ('not' in op) { push(`(${col} IS NULL OR ${col} <> ?)`); params.push(toStorage(tableName, op.not)); continue; }
        if ('ne' in op) { push(`(${col} IS NULL OR ${col} <> ?)`); params.push(toStorage(tableName, op.ne)); continue; }
        for (const [sqlOp, sym] of [['gte', '>='], ['gt', '>'], ['lte', '<='], ['lt', '<']] as const) {
          if (sqlOp in op) { push(`${col} ${sym} ?`); params.push(toStorage(tableName, op[sqlOp])); }
        }
        continue;
      }
      if (want === null) { push(`${col} IS NULL`); continue; }
      push(`${col} = ?`);
      params.push(toStorage(tableName, want));
    }
    return { sql: clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '', params };
  };

  const mapRow = (row: Row | undefined) => (row ? fromStorage(tableName, { ...row }) : null);

  return {
    async count(opts: QueryOpts = {}) {
      const w = whereClause(opts.filters);
      const r = db.prepare(`SELECT COUNT(*) AS n FROM ${quote(tableName)}${w.sql}`).get(...(w.params as any[])) as Row;
      return Number(r?.n ?? 0);
    },
    async findOne(opts: { id?: string; filters?: Record<string, unknown> } = {}) {
      if (opts.id) {
        const row = db.prepare(`SELECT * FROM ${quote(tableName)} WHERE id = ?`).get(opts.id) as Row | undefined;
        if (row && (!opts.filters || matchFilters(row, opts.filters))) return mapRow(row);
      }
      const w = whereClause(opts.filters);
      const row = db.prepare(`SELECT * FROM ${quote(tableName)}${w.sql} LIMIT 1`).get(...(w.params as any[])) as Row | undefined;
      return mapRow(row);
    },
    async findAll(opts: QueryOpts = {}) {
      const w = whereClause(opts.filters);
      const total = Number((db.prepare(`SELECT COUNT(*) AS n FROM ${quote(tableName)}${w.sql}`).get(...(w.params as any[])) as Row)?.n ?? 0);
      const sort = opts.sort ?? opts.orderBy;
      let order = '';
      if (sort) {
        const spec = typeof sort === 'string' ? { field: sort, direction: 'asc' as const } : sort;
        const key = [spec.field, camel(spec.field), snake(spec.field)].find((c) => columnsOf(tableName).has(c)) ?? spec.field;
        order = ` ORDER BY ${quote(key)} ${(spec.direction ?? 'asc').toLowerCase() === 'desc' ? 'DESC' : 'ASC'}`;
      } else {
        order = ' ORDER BY "createdAt" DESC';
      }
      const limit = opts.limit ?? 1000;
      const offset = opts.offset ?? 0;
      const rows = db
        .prepare(`SELECT * FROM ${quote(tableName)}${w.sql}${order} LIMIT ? OFFSET ?`)
        .all(...(w.params as any[]), limit, offset) as Row[];
      const fields = opts.fields;
      return {
        records: rows.map((r) => {
          const mapped = fromStorage(tableName, { ...r });
          if (!fields?.length) return mapped;
          return Object.fromEntries(fields.map((f) => [f, readField(mapped, f)]));
        }),
        total,
      };
    },
    async create({ record }: { record: Row }) {
      const now = new Date().toISOString();
      const row: Row = { id: newId(), createdAt: now, updatedAt: now, ...record };
      const cols = Object.keys(row).filter((k) => columnsOf(tableName).has(k));
      try {
        db.prepare(
          `INSERT INTO ${quote(tableName)} (${cols.map(quote).join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
        ).run(...cols.map((c) => toStorage(tableName, row[c]) as any));
      } catch (e) {
        throw new Error(`DB_INSERT_FAILED ${tableName}: ${(e as Error).message}`);
      }
      return fromStorage(tableName, { ...row });
    },
    async update({ id, record }: { id: string; record: Row }) {
      const cols = Object.keys(record).filter((k) => columnsOf(tableName).has(k));
      if (!cols.length) return this.findOne({ id });
      const withUpdated = columnsOf(tableName).has('updatedAt') ? [...new Set([...cols, 'updatedAt'])] : cols;
      const values = withUpdated.map((c) => toStorage(tableName, c === 'updatedAt' ? new Date().toISOString() : record[c]) as any);
      db.prepare(`UPDATE ${quote(tableName)} SET ${withUpdated.map((c) => `${quote(c)} = ?`).join(',')} WHERE id = ?`).run(...values, id);
      return this.findOne({ id });
    },
    async delete({ id }: { id: string }) {
      db.prepare(`DELETE FROM ${quote(tableName)} WHERE id = ?`).run(id);
      return { id };
    },
  };
}

function matchFilters(rec: Row, filters: Record<string, unknown>) {
  return Object.entries(filters).every(([key, want]) => {
    const val = readField(rec, key);
    if (want === null) return val === null || val === undefined;
    if (want !== null && typeof want === 'object' && !Array.isArray(want)) {
      const op = want as Record<string, unknown>;
      if ('in' in op) return ((op.in as unknown[]) ?? []).includes(val as never);
      if ('notIn' in op) return !((op.notIn as unknown[]) ?? []).includes(val as never);
      if ('not' in op) return val !== op.not;
      if ('ne' in op) return val !== op.ne;
      if ('gte' in op) return String(val) >= String(op.gte);
      if ('gt' in op) return String(val) > String(op.gt);
      if ('lte' in op) return String(val) <= String(op.lte);
      if ('lt' in op) return String(val) < String(op.lt);
      return true;
    }
    if (Array.isArray(want)) return want.includes(val as never);
    const stored = toStorage('', want);
    return val === want || val === stored || String(val) === String(want);
  });
}

/* ------------------------------------------------------------ SQL translation */

const isoDaysAgo = (n: number) => new Date(Date.now() - n * 86400_000).toISOString();
const plusDays = (v: unknown, n: number) => {
  const d = new Date(String(v ?? ''));
  return new Date((Number.isNaN(d.getTime()) ? Date.now() : d.getTime()) + n * 86400_000).toISOString();
};
const tehranDay = (v: unknown) => {
  const d = new Date(String(v ?? ''));
  if (Number.isNaN(d.getTime())) return null;
  const t = new Date(d.getTime() + 3.5 * 3600_000);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(t.getUTCDate())}`;
};
const listHas = (list: unknown, needle: unknown) => {
  const items = String(list ?? '').split(',').map((s) => s.trim());
  return items.some((s) => s === String(needle ?? '').trim()) ? 1 : 0;
};

/** Registers the Postgres-compatible helpers the app's queries rely on. */
export function registerSqlHelpers() {
  db.function('kayar_now', () => new Date().toISOString());
  db.function('kayar_ago', { varargs: false }, (n: unknown) => isoDaysAgo(Number(n ?? 0)));
  db.function('kayar_plus_days', { varargs: false }, (v: unknown, n: unknown) => plusDays(v, Number(n ?? 0)));
  db.function('kayar_tehran_day', { varargs: false }, (v: unknown) => tehranDay(v));
  db.function('kayar_list_has', { varargs: false }, (list: unknown, needle: unknown) => listHas(list, needle));
  db.function('ripemd', { varargs: false }, () => null);
}

/**
 * Translates the Postgres dialect used by the app into SQLite and flattens `$n` placeholders
 * into positional `?` parameters (array params expand into `IN (?,?,?)`).
 */
export function translateSql(query: string, params: unknown[] = []): { sql: string; params: unknown[] } {
  let q = query;
  const out: unknown[] = [];

  /* 1. DISTINCT ON (...) + ORDER BY <same key>, <rest>  →  window function */
  const distinctOn = q.match(/^\s*SELECT\s+DISTINCT\s+ON\s*\(\s*"?(\w+)"?\s*\)\s*(.*?)\s+FROM\s(.*?)\s+ORDER\s+BY\s+(.*?)(\s+LIMIT\s+\d+)?\s*$/is);
  if (distinctOn) {
    const [, key, selectList, fromPart, orderBy, limit] = distinctOn;
    const rest = orderBy!.split(/,(.+)/s);
    const secondary = rest.length > 1 ? rest[1]!.trim() : `"${key}"`;
    q =
      `SELECT ${selectList} FROM (SELECT ${selectList}, ROW_NUMBER() OVER (PARTITION BY "${key}" ORDER BY ${secondary}) AS __rn ` +
      `FROM ${fromPart}) WHERE __rn = 1${limit ?? ''}`;
  }

  /* 2. lateral comma-unnest of a comma separated column */
  q = q.replace(
    /,\s*unnest\(\s*string_to_array\(\s*COALESCE\(([^,]+),\s*''\s*\)\s*,\s*','\s*\)\s*\)\s+(\w+)/gi,
    ", json_each('[\"' || REPLACE(COALESCE($1,''), ',', '\",\"') || '\"]') $2",
  );
  q = q.replace(/\bTRIM\(\s*t\s*\)/gi, 'TRIM(t.value)');

  /* 3. array membership helpers */
  q = q.replace(
    /\$\s*(\d+)\s*=\s*ANY\(\s*string_to_array\(\s*COALESCE\(([^,]+),\s*''\s*\)\s*,\s*','\s*\)\s*\)/gi,
    "kayar_list_has(COALESCE($2,''), $$1)",
  );

  /* 4. time helpers */
  q = q.replace(/now\(\)\s*-\s*interval\s*'(\d+)\s*days?'/gi, 'kayar_ago($1)');
  q = q.replace(/\(\s*\$\s*(\d+)\s*::\s*timestamptz\s*\+\s*interval\s*'(\d+)\s*days?'\s*\)/gi, 'kayar_plus_days($$1, $2)');
  q = q.replace(/now\(\)/gi, 'kayar_now()');
  q = q.replace(/to_char\(([^,]+?)\s+AT\s+TIME\s+ZONE\s*'[^']*'\s*,\s*'[^']*'\s*\)/gi, 'kayar_tehran_day($1)');

  /* 5. casts */
  q = q.replace(/(\([^()]*\)|"[^"]+"|\w+(?:\.\w+)?)\s*::\s*text/gi, 'CAST($1 AS TEXT)');
  q = q.replace(/\s*::\s*\w+(\s*\[\s*\])?/g, '');

  /* 6. `= ANY($n)` with an array parameter → IN (?,?,?) */
  q = q.replace(/\bIN\s*\(\s*\$\s*(\d+)\s*\)|=\s*ANY\s*\(\s*\$\s*(\d+)\s*\)/gi, (_m, a, b) => {
    const value = params[Number(a ?? b) - 1];
    const list = Array.isArray(value) ? value : [value];
    if (!list.length) return 'IN (NULL)';
    for (const v of list) out.push(toStorage('', v));
    return `IN (${list.map(() => '?').join(',')})`;
  });

  /* 7. flatten the remaining `$n` placeholders to positional `?` */
  q = q.replace(/\$\s*(\d+)/g, (_m, n: string) => {
    out.push(toStorage('', params[Number(n) - 1]));
    return '?';
  });

  return { sql: q, params: out };
}

export function runSql(query: string, params: unknown[] = []) {
  const { sql, params: bind } = translateSql(query, params);
  const stmt = db.prepare(sql);
  const isRead = /^\s*(select|with)/i.test(sql);
  if (!isRead) {
    const info = stmt.run(...(bind as any[]));
    return { rows: [], changes: info.changes };
  }
  const rows = stmt.all(...(bind as any[])) as Row[];
  return { rows: rows.map((r) => fromStorageGuess(r)) };
}

/** Raw SQL rows may hit tables in either naming style — normalise boolean-ish ints. */
const BOOLEANISH = /^(completed|isFeatured|mustChangePassword|live)$/;
function fromStorageGuess(row: Row) {
  for (const [k, v] of Object.entries(row)) {
    if (typeof v === 'number' && BOOLEANISH.test(k)) row[k] = !!v;
    if (typeof v === 'string' && (BOOLEANISH.test(k)) && (v === '0' || v === '1')) row[k] = v === '1';
  }
  return row;
}
