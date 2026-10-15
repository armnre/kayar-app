/**
 * Tiny in-browser SQL emulator.
 *
 * The original KAYAR app talks to a hosted Postgres-like store through `zite.sql(...)`.
 * This port keeps the app's query strings 100% untouched and evaluates them here against
 * in-memory tables, so the whole product runs standalone in the browser.
 *
 * Supported dialect (everything the app actually issues):
 *   SELECT [DISTINCT [ON (expr)]] items   (COUNT(*) [FILTER (WHERE …)] AS alias, expr AS alias)
 *   FROM table [alias] [LEFT JOIN table alias ON …]
 *        [, unnest(string_to_array(COALESCE(col,''),',')) alias]
 *   WHERE =, <>, <, <=, >, >=, IS [NOT] NULL, [NOT] IN (…), LIKE / ILIKE, LOWER(x) LIKE y,
 *         x = ANY($n), $n = ANY(string_to_array(…)), now() - interval 'N days', AND / OR
 *   GROUP BY <n | expr>, ORDER BY <n | alias | expr> [ASC|DESC], LIMIT n, OFFSET n
 */

export type Row = Record<string, any>;
export type Table = Row[];
export type SqlResult = { rows: Row[] };
export type Tables = Record<string, Table>;

/* ------------------------------------------------------------------ helpers */

/** Generated code uses `__`-prefixed helpers so they can never clash with SQL aliases. */
const P = '__p';
const C_FN = '__C';
const C_BARE = '__c';
const CO = '__COALESCE';
const LK = '__like';
const TR = '__trim';
const LO = '__lower';
const UP = '__upper';
const TC = '__toChar';
const SL = '__splitList';
const DA = '__daysAgo';
const ROW = '__row';

const HELPER_PARAMS = [ROW, P, C_BARE, C_FN, CO, LK, TR, LO, UP, TC, SL, DA];

const FN_NAMES = new Set([
  P, C_FN, C_BARE, CO, LK, TR, LO, UP, TC, SL, DA, ROW,
  'String', 'Number', 'Math', 'Date', 'Array', 'Boolean', 'JSON', 'Object',
  'true', 'false', 'null', 'undefined', 'NaN', 'Infinity', 'new', 'isArray', 'includes', 'toString', 'toISOString',
  'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL', 'LIKE', 'ILIKE', 'FILTER', 'WHERE', 'ASC', 'DESC', 'NULLS',
]);

/** Resolve a column across the aliases of a row, tolerating snake_case ⇄ camelCase. */
function makeCol(row: Row, aliasOrder: string[]) {
  const names = (name: string) => {
    const snake = name.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
    const camel = name.replace(/_([a-z])/g, (_m, c: string) => c.toUpperCase());
    return [name, snake, camel];
  };
  const pick = (rec: Row | undefined, name: string) => {
    if (!rec) return undefined;
    for (const c of names(name)) if (rec[c] !== undefined) return rec[c];
    return undefined;
  };
  return (name: string, alias?: string) => {
    if (alias) return pick(row[alias], name);
    for (const a of aliasOrder) {
      const v = pick(row[a], name);
      if (v !== undefined) return v;
    }
    return undefined;
  };
}

const pad = (n: number) => String(n).padStart(2, '0');
/** Mirrors `to_char(x AT TIME ZONE 'Asia/Tehran','YYYY-MM-DD')`. */
function toChar(v: unknown) {
  if (v === null || v === undefined) return null;
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return String(v);
  const tehran = new Date(d.getTime() + 3.5 * 3600_000);
  return `${tehran.getUTCFullYear()}-${pad(tehran.getUTCMonth() + 1)}-${pad(tehran.getUTCDate())}`;
}
const daysAgo = (n: number) => new Date(Date.now() - n * 86400_000).toISOString();
const like = (a: unknown, b: unknown) => {
  const p = String(b ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.');
  return new RegExp(`^${p}$`, 'is').test(String(a ?? ''));
};
const trim = (v: unknown) => String(v ?? '').trim();
const lower = (v: unknown) => String(v ?? '').toLowerCase();
const upper = (v: unknown) => String(v ?? '').toUpperCase();
const splitList = (v: unknown) => String(v ?? '').split(',').map((x) => x.trim()).filter(Boolean);
const COALESCE = (...xs: unknown[]) => xs.find((x) => x !== null && x !== undefined && x !== '') ?? null;

/* ------------------------------------------------------------- tokenisation */

/** Position of a top-level keyword (skips quotes, parens and deeper nesting). */
function findKeyword(q: string, keyword: string, from = 0) {
  const upper = q.toUpperCase();
  const kw = keyword.toUpperCase();
  let depth = 0;
  let quote: string | null = null;
  for (let i = from; i <= q.length - kw.length; i++) {
    const ch = q[i]!;
    if (quote) { if (ch === quote) quote = null; continue; }
    if (ch === "'" || ch === '"') { quote = ch; continue; }
    if (ch === '(') { depth++; continue; }
    if (ch === ')') { depth--; continue; }
    if (depth === 0 && upper.startsWith(kw, i)) {
      const before = i === 0 ? ' ' : upper[i - 1]!;
      const after = upper[i + kw.length] ?? ' ';
      if (!/[A-Z0-9_]/.test(before) && !/[A-Z0-9_]/.test(after)) return i;
    }
  }
  return -1;
}

function sliceBetween(q: string, startKw: string, endKws: string[]) {
  const s = findKeyword(q, startKw);
  if (s < 0) return { body: '' };
  const from = s + startKw.length;
  let end = q.length;
  for (const k of endKws) {
    const p = findKeyword(q, k, from);
    if (p >= 0 && p < end) end = p;
  }
  return { body: q.slice(from, end).trim() };
}

function splitTop(s: string, sep = ','): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let cur = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (quote) { cur += ch; if (ch === quote) quote = null; continue; }
    if (ch === "'" || ch === '"') { quote = ch; cur += ch; continue; }
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === sep && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur.trim());
  return out.filter((x) => x !== '');
}

/* ------------------------------------------------------------ expression → js */

const OPEN = '\u0001';
const MID = '\u0002';
const HOLD = '\u0003';
const STR = '\u0004';

/** Position of the next `LIKE` operator, ignoring quotes but *not* parenthesis depth. */
function findLikeOperator(e: string): number {
  let quote: string | null = null;
  for (let i = 0; i <= e.length - 4; i++) {
    const ch = e[i]!;
    if (quote) { if (ch === quote) quote = null; continue; }
    if (ch === "'" || ch === '"') { quote = ch; continue; }
    if (/^LIKE/i.test(e.slice(i, i + 4)) && !/[A-Z0-9_]/.test(e[i - 1] ?? ' ') && !/[A-Z0-9_]/.test(e[i + 4] ?? ' ')) return i;
  }
  return -1;
}

/** Rewrites `a LIKE b` (any operands, any nesting) into `like(a, b)`. */
function foldLike(expr: string): string {
  let e = expr;
  for (let guard = 0; guard < 60; guard++) {
    const at = findLikeOperator(e);
    if (at < 0) return e;
    let j = at - 1;
    while (j >= 0 && /\s/.test(e[j]!)) j--;
    const leftEnd = j + 1;
    let depth = 0;
    let leftStart = 0;
    for (; j >= 0; j--) {
      const ch = e[j]!;
      if (ch === ')') { depth++; continue; }
      if (ch === '(') { if (depth === 0) { leftStart = j + 1; break; } depth--; continue; }
      if (depth === 0 && (/\s/.test(ch) || /[<>=]/.test(ch))) {
        const kw = /^\s+(AND|OR|NOT|&&|\|\|)\s+/i.exec(e.slice(j));
        if (kw) { leftStart = j + kw[0].length; break; }
        if (/[<>=]/.test(ch)) { leftStart = j + 1; break; }
        leftStart = 0;
        continue;
      }
      leftStart = 0;
    }
    let k = at + 4;
    while (k < e.length && /\s/.test(e[k]!)) k++;
    const rightStart = k;
    depth = 0;
    for (; k < e.length; k++) {
      const ch = e[k]!;
      if (ch === '(') { depth++; continue; }
      if (ch === ')') { if (depth === 0) break; depth--; continue; }
      if (depth === 0 && /\s/.test(ch) && /^\s*(AND|OR|NOT|&&|\|\||\)|[<>=]|$)/i.test(e.slice(k))) break;
      if (depth === 0 && /[<>=]/.test(ch)) break;
    }
    e = `${e.slice(0, leftStart)}${LK}(${e.slice(leftStart, leftEnd).trim()}, ${e.slice(rightStart, k).trim()})${e.slice(k)}`;
  }
  return e;
}

/** Turns the SQL expression dialect used by this app into a JS expression. */
function compile(expr: string, aliases: string[] = []): string {
  const held: string[] = [];
  const strings: string[] = [];
  const holdJs = (js: string) => `${HOLD}${held.push(js) - 1}${HOLD}`;

  let e = ' ' + expr.replace(/\s+/g, ' ').trim() + ' ';
  // (0) protect string literals from every later stage
  e = e.replace(/'([^']|'')*'/g, (m) => `${STR}${strings.push(m) - 1}${STR}`);
  const LIT = `(?:${STR}\\d+${STR}|'[^']*')`;

  const isAlias = (id: string) => aliases.includes(id);

  // (a) $n = ANY(string_to_array(COALESCE(col,''), ','))
  e = e.replace(
    new RegExp(`p?\\[?\\$\\s*(\\d+)\\]?\\s*=\\s*ANY\\(\\s*string_to_array\\(\\s*COALESCE\\(\\s*([^,]+?)\\s*,\\s*${LIT}\\s*\\)\\s*,\\s*${LIT}\\s*\\)\\s*\\)`, 'g'),
    (_m, n, col) => `${SL}(${P}[${Number(n) - 1}]).includes(String(${holdJs(compile(col, aliases))} ?? ''))`,
  );

  // (b) aggregates are counted by the caller, not per row
  e = e.replace(/COUNT\(\*\)/gi, '0');

  // (c) now() - interval 'N days' / interval 'N days'
  const interval = (text: string) => `${DA}(${Number(text.replace(/[^0-9]/g, '') || 0)})`;
  e = e.replace(new RegExp(`now\\(\\)\\s*-\\s*interval\\s*${STR}(\\d+)${STR}`, 'gi'), (_m, i: string) =>
    interval(strings[Number(i)] ?? '0'));
  e = e.replace(/now\(\)\s*-\s*interval\s*'(\d+)\s*days?'/gi, (_m, n: string) => `${DA}(${n})`);
  e = e.replace(/interval\s*'\d+\s*days?'/gi, '');
  e = e.replace(/now\(\)/gi, 'new Date().toISOString()');

  // (d) column references → sentinels (quotes only appear when expanding)
  e = e.replace(/\b([A-Za-z_]\w*)\.(?:"(\w+)"|(\w+))/g, (_m, a, q1, q2) => `${OPEN}${a}${MID}${q1 || q2}${OPEN}`);
  e = e.replace(/"(\w+)"/g, (_m, c) => `${OPEN}${MID}${c}${OPEN}`);
  e = e.replace(
    new RegExp(`${OPEN}([^${MID}${OPEN}]*)${MID}([^${OPEN}]*)${OPEN}`, 'g'),
    (_m, alias: string, col: string) =>
      alias ? `${C_FN}(${JSON.stringify(alias)},${JSON.stringify(col)})` : `${C_BARE}(${JSON.stringify(col)})`,
  );

  // (e) function names
  e = e.replace(/\bLOWER\s*\(/gi, `${LO}(`);
  e = e.replace(/\bUPPER\s*\(/gi, `${UP}(`);
  e = e.replace(/\bTRIM\s*\(/gi, `${TR}(`);
  e = e.replace(/\bCOALESCE\s*\(/gi, `${CO}(`);

  // (f) to_char(<expr> AT TIME ZONE '<tz>','YYYY-MM-DD')
  e = e.replace(
    new RegExp(`to_char\\(([^()]*(?:\\([^()]*\\))?[^()]*?)\\s+AT\\s+TIME\\s+ZONE\\s+${LIT}\\s*,\\s*${LIT}\\s*\\)`, 'gi'),
    (_m, inner: string) => `${TC}(${/^[A-Za-z_]\w*$/.test(inner.trim()) ? `${C_BARE}(${JSON.stringify(inner.trim())})` : inner.trim()})`,
  );

  // (g) IS [NOT] NULL
  e = e.replace(/((?:__C|__c)\([^)]*\))\s+IS\s+NOT\s+NULL/gi, '($1 != null)');
  e = e.replace(/((?:__C|__c)\([^)]*\))\s+IS\s+NULL/gi, '($1 == null)');

  // (h) LIKE (any operands)
  e = foldLike(e);

  // (i) `= ANY($n)` with an array parameter, and `[NOT] IN (…)`
  e = e.replace(
    /((?:__C|__c)\([^)]*\))\s*=\s*ANY\s*\(\s*\$\s*(\d+)\s*\)/gi,
    (_m, col, n) => `(Array.isArray(${P}[${Number(n) - 1}]) ? ${P}[${Number(n) - 1}] : [${P}[${Number(n) - 1}]]).includes(${col})`,
  );
  const litArray = (list: string) =>
    `[${list
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => {
        const m = t.match(new RegExp(`^${STR}(\\d+)${STR}$`));
        return m ? strings[Number(m[1])]! : t;
      })
      .join(',')}]`;
  e = e.replace(
    new RegExp(`((?:__C|__c)\\([^)]*\\)|${P}\\[\\d+\\])\\s+NOT\\s+IN\\s*\\(\\s*((?:${STR}\\d+${STR}\\s*,?\\s*)*)\\)`, 'gi'),
    (_m, col, list: string) => `!${litArray(list)}.includes(${col})`,
  );
  e = e.replace(
    new RegExp(`((?:__C|__c)\\([^)]*\\)|${P}\\[\\d+\\])\\s+IN\\s*\\(\\s*((?:${STR}\\d+${STR}\\s*,?\\s*)*)\\)`, 'gi'),
    (_m, col, list: string) => `${litArray(list)}.includes(${col})`,
  );

  // (j) casts
  e = e.replace(/::text/gi, '.toString()');
  e = e.replace(/::\w+(\s*\[\s*\])?/g, '');

  // (l) parameters and operators
  e = e.replace(/\$\s*(\d+)/g, (_m, n: string) => `${P}[${Number(n) - 1}]`);
  e = e.replace(/\|\|/g, '+');
  e = e.replace(/\bTRUE\b/gi, 'true');
  e = e.replace(/\bFALSE\b/gi, 'false');
  e = e.replace(/!={1,2}|<>/g, '!==');
  e = e.replace(/(?<![<>!=])=(?!=)/g, '===');
  e = e.replace(/\bAND\b/g, '&&');
  e = e.replace(/\bOR\b/g, '||');

  // (k) any remaining bare identifier is a column reference (`created_at >= $1`)
  e = e.replace(/(?<![\w."':])([A-Za-z_]\w*)(?![\w("'[])/g, (m, id: string) =>
    FN_NAMES.has(id) || FN_NAMES.has(id.toLowerCase()) || isAlias(id) ? m : `${C_BARE}(${JSON.stringify(id)})`);

  // restore held sub-expressions, then string literals
  return e
    .trim()
    .replace(new RegExp(`${HOLD}(\\d+)${HOLD}`, 'g'), (_m, i: string) => held[Number(i)]!)
    .replace(new RegExp(`${STR}(\\d+)${STR}`, 'g'), (_m, i: string) => strings[Number(i)]!)
    .replace(new RegExp(STR, 'g'), '');
}

function evaluator(expr: string, aliasOrder: string[]) {
  const js = compile(expr, aliasOrder);
  const preamble = aliasOrder
    .filter((a) => /^[A-Za-z_]\w*$/.test(a) && !FN_NAMES.has(a))
    .map((a) => `const ${a} = ${ROW}[${JSON.stringify(a)}];`)
    .join(' ');
  let fn: ((...args: any[]) => unknown) | null = null;
  try {
    // eslint-disable-next-line no-new-func
    fn = new Function(...HELPER_PARAMS, `${preamble} return (${js});`) as never;
  } catch {
    fn = null;
  }
  return (row: Row, paramsArr: unknown[]) => {
    if (!fn) return undefined;
    const c = makeCol(row, aliasOrder);
    const C = (alias: string, col: string) => c(col, alias);
    try {
      return fn!(row, paramsArr, c, C, COALESCE, like, trim, lower, upper, toChar, splitList, daysAgo);
    } catch {
      return undefined;
    }
  };
}

/* --------------------------------------------------------------- FROM clause */

type Source = { rows: Row[]; aliasOrder: string[] };

function resultKey(item: string): string {
  const asMatch = item.match(/^(.*?)\s+AS\s+"?(\w+)"?$/is);
  if (asMatch) return asMatch[2]!;
  const qualified = item.match(/\w+\.(?:"(\w+)"|(\w+))/);
  if (qualified) return qualified[1] || qualified[2]!;
  const quoted = item.match(/"(\w+)"/);
  if (quoted) return quoted[1]!;
  const bare = item.match(/\b(\w+)\b\s*$/);
  return bare ? bare[1]! : item.replace(/\W/g, '') || 'expr';
}
const stripAlias = (item: string) => item.replace(/\s+AS\s+"?\w+"?\s*$/i, '').trim();

function buildSource(tables: Tables, fromClause: string): Source {
  const rest = fromClause;
  const found: { at: number; end: number; type: string; table: string; alias: string }[] = [];
  const joinRe = /\b(LEFT\s+JOIN|JOIN)\s+"(\w+)"\s+(?:AS\s+)?(\w+)?\s+ON\s+/gi;
  let m: RegExpExecArray | null;
  while ((m = joinRe.exec(rest))) {
    found.push({ at: m.index, end: m.index + m[0].length, type: m[1]!.toUpperCase(), table: m[2]!, alias: m[3] || m[2]! });
  }
  const joins = found.map((f, i) => ({
    type: f.type,
    table: f.table,
    alias: f.alias,
    on: rest.slice(f.end, found[i + 1] ? found[i + 1]!.at : rest.length).trim(),
  }));

  const unnest = rest.match(
    /,\s*unnest\(\s*string_to_array\(\s*COALESCE\(\s*([A-Za-z_]\w*)\.(?:"(\w+)"|(\w+))\s*,\s*''\s*\)\s*,\s*','\s*\)\s*\)\s+(\w+)/i,
  );

  let head = found.length ? rest.slice(0, found[0]!.at) : unnest ? rest.slice(0, unnest.index!) : rest;
  head = head.replace(/,\s*$/, '').trim();
  const base = head.match(/^"?(\w+)"?(?:\s+(?:AS\s+)?(\w+))?$/i);
  const tableName = base?.[1] ?? head.replace(/"/g, '');
  const baseAlias = base?.[2] ?? tableName;

  let rows: Row[] = (tables[tableName] ?? []).map((r) => ({ [baseAlias]: { ...r } }));
  const aliasOrder = [baseAlias];

  for (const j of joins) {
    const on = evaluator(j.on, [...aliasOrder, j.alias]);
    const right = tables[j.table] ?? [];
    const out: Row[] = [];
    for (const l of rows) {
      let matched = false;
      for (const r of right) {
        const merged: Row = { ...l, [j.alias]: { ...r } };
        if (on(merged, [])) { out.push(merged); matched = true; }
      }
      if (!matched && j.type.startsWith('LEFT')) out.push({ ...l, [j.alias]: {} });
    }
    rows = out;
    aliasOrder.push(j.alias);
  }

  if (unnest) {
    const [, baseA, q1, q2, uAlias] = unnest;
    const col = q1 || q2!;
    const grown: Row[] = [];
    for (const r of rows) {
      const rec = r[baseA!] as Row | undefined;
      const raw = rec
        ? [rec[col], rec[col.replace(/_([a-z])/g, (_x, c: string) => c.toUpperCase())]].find((v) => v !== undefined)
        : '';
      for (const v of splitList(raw)) grown.push({ ...r, [uAlias!]: v });
    }
    rows = grown;
    aliasOrder.push(uAlias!);
  }

  return { rows, aliasOrder };
}

/* -------------------------------------------------------------------- engine */

export function runSql(tables: Tables, query: string, params: unknown[] = []): SqlResult {
  const q = query.replace(/\s+/g, ' ').trim();
  const select = sliceBetween(q, 'SELECT', ['FROM']);
  const from = sliceBetween(q, 'FROM', ['WHERE', 'GROUP BY', 'ORDER BY', 'LIMIT', 'OFFSET']);
  const where = sliceBetween(q, 'WHERE', ['GROUP BY', 'ORDER BY', 'LIMIT', 'OFFSET']);
  const groupBy = sliceBetween(q, 'GROUP BY', ['ORDER BY', 'LIMIT', 'OFFSET']);
  const orderBy = sliceBetween(q, 'ORDER BY', ['LIMIT', 'OFFSET']);
  const limitM = q.match(/\bLIMIT\s+(\d+)/i);
  const offsetM = q.match(/\bOFFSET\s+(\d+)/i);

  const starSelect = /^\*$/.test(select.body.trim());
  const distinctOn = select.body.match(/^DISTINCT\s+ON\s*\(([^)]*)\)/i);
  const selectBody = select.body.replace(/^DISTINCT(\s+ON\s*\([^)]*\))?/i, '').trim();
  const items = splitTop(selectBody);

  const { rows: sourceRows, aliasOrder } = buildSource(tables, from.body);
  const whereEv = where.body ? evaluator(where.body, aliasOrder) : null;
  const rows = whereEv ? sourceRows.filter((r) => !!whereEv(r, params)) : sourceRows;

  type Out = { row: Row; out: Row };
  const aggItems = items.map((it) => {
    const m = stripAlias(it).match(/^COUNT\(\*\)(?:\s*FILTER\s*\(\s*WHERE\s+(.*?)\s*\))?$/is);
    return m ? { filter: m[1] ?? null } : null;
  });
  const keyNames = items.map((it) => resultKey(it));
  const isAggregate = aggItems.some(Boolean);

  let results: Out[] = [];

  if (isAggregate) {
    const groupExprs = groupBy.body
      ? splitTop(groupBy.body).map((g) => (/^\d+$/.test(g) ? stripAlias(items[Number(g) - 1] ?? '') : g))
      : [];
    const groupEvs = groupExprs.map((g) => evaluator(g, aliasOrder));
    const groups = new Map<string, Out>();
    for (const r of rows) {
      const k = JSON.stringify(groupEvs.map((ev) => ev(r, params)));
      let g = groups.get(k);
      if (!g) { g = { row: r, out: {} }; groups.set(k, g); }
      for (let i = 0; i < items.length; i++) {
        const agg = aggItems[i];
        const name = keyNames[i]!;
        if (!agg) {
          if (g.out[name] === undefined) g.out[name] = evaluator(stripAlias(items[i]!), aliasOrder)(r, params);
        } else {
          const pass = agg.filter ? !!evaluator(agg.filter, aliasOrder)(r, params) : true;
          g.out[name] = Number(g.out[name] ?? 0) + (pass ? 1 : 0);
        }
      }
    }
    if (groups.size) results = [...groups.values()];
    else {
      // a bare `SELECT COUNT(*)` over an empty set still returns one row of zeros
      const out: Row = {};
      keyNames.forEach((name, i) => { out[name] = aggItems[i] ? 0 : null; });
      results = groupExprs.length ? [] : [{ row: {}, out }];
    }
  } else if (starSelect) {
    results = rows.map((r) => ({ row: r, out: { ...(r[aliasOrder[0]!] as Row) } }));
  } else {
    const evs = items.map((it) => evaluator(stripAlias(it), aliasOrder));
    results = rows.map((r) => {
      const out: Row = {};
      items.forEach((_it, i) => { out[keyNames[i]!] = evs[i]!(r, params); });
      return { row: r, out };
    });
  }

  // ORDER BY runs before DISTINCT ON trims duplicates.
  const sortTerms = orderBy.body
    ? splitTop(orderBy.body).map((t) => {
        const m = t.match(/^(.*?)(?:\s+(ASC|DESC))?(?:\s+NULLS\s+(FIRST|LAST))?$/is);
        return { expr: (m?.[1] ?? t).trim(), desc: (m?.[2] ?? '').toUpperCase() === 'DESC' };
      })
    : [];

  const resolved = sortTerms.map((t) => {
    const ord = t.expr.match(/^(\d+)$/);
    if (ord) return { key: keyNames[Number(ord[1]) - 1] ?? '', desc: t.desc };
    const bare = t.expr.match(/^"?(\w+)"?$/);
    if (bare && keyNames.includes(bare[1]!)) return { key: bare[1]!, desc: t.desc };
    return { expr: t.expr, desc: t.desc };
  });

  if (resolved.length) {
    const evs = resolved.map((r) => ('expr' in r ? evaluator(r.expr!, aliasOrder) : null));
    results.sort((a, b) => {
      for (let i = 0; i < resolved.length; i++) {
        const r = resolved[i]!;
        const av = evs[i] ? evs[i]!(a.row, params) : a.out[r.key!];
        const bv = evs[i] ? evs[i]!(b.row, params) : b.out[r.key!];
        if (av === bv) continue;
        const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av ?? '').localeCompare(String(bv ?? ''));
        return r.desc ? -cmp : cmp;
      }
      return 0;
    });
  }

  let out = results.map((r) => r.out);

  if (distinctOn) {
    const ev = evaluator(stripAlias(distinctOn[1]!), aliasOrder);
    const seen = new Set<string>();
    out = results
      .filter((r) => {
        const k = JSON.stringify(ev(r.row, params));
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .map((r) => r.out);
  } else if (/^DISTINCT\b/i.test(select.body)) {
    const seen = new Set<string>();
    out = out.filter((r) => {
      const k = JSON.stringify(r);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  const off = offsetM ? Number(offsetM[1]) : 0;
  if (off) out = out.slice(off);
  if (limitM) out = out.slice(0, Number(limitM[1]));

  return { rows: out };
}

/** Debug helper (handy when adding new queries). */
export const __compileForDebug = compile;
