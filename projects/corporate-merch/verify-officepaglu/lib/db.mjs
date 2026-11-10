import { OpError, backendRequire, readEnvFile } from './core.mjs';

const POSTGREST_MAX_ROWS = 1000;

let client;

/**
 * A Supabase client using the backend's service key. The project behind it is production,
 * so callers only ever `.select()` — this CLI has no write paths.
 */
export function db() {
  if (client) return client;
  const env = readEnvFile('api');
  if (!env?.SUPABASE_URL || !env?.SUPABASE_SERVICE_KEY) {
    throw new OpError('SUPABASE_URL / SUPABASE_SERVICE_KEY missing from corporate-merch-backend/.env', 'Run `op doctor` to see which env vars are missing.');
  }
  const { createClient } = backendRequire('@supabase/supabase-js');
  client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  return client;
}

export function supabaseProjectRef() {
  const url = readEnvFile('api')?.SUPABASE_URL;
  return url ? new URL(url).hostname.split('.')[0] : null;
}

export async function select(query, what) {
  const { data, error } = await query;
  if (error) throw new OpError(`Query failed (${what}): ${error.message}`, error.hint ?? undefined);
  return data;
}

export async function selectIn(table, columns, column, ids, chunk = 100) {
  const out = [];
  for (let i = 0; i < ids.length; i += chunk) {
    const rows = await select(db().from(table).select(columns).in(column, ids.slice(i, i + chunk)).limit(POSTGREST_MAX_ROWS), table);
    if (rows.length === POSTGREST_MAX_ROWS) throw new OpError(`${table} lookup hit the ${POSTGREST_MAX_ROWS}-row cap`, 'Narrow the scan (--since / --limit).');
    out.push(...rows);
  }
  return out;
}
