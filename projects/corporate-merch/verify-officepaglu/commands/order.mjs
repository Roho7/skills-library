import { OpError } from '../lib/core.mjs';
import { db, select, selectIn } from '../lib/db.mjs';

const ORDER_COLUMNS = [
  'id', 'status', 'order_kind', 'parent_order_id', 'replacement_reason',
  'total_amount', 'discount_amount', 'bundle_discount_amount', 'coupon_code',
  'razorpay_order_id', 'razorpay_payment_id', 'pod_provider', 'pod_order_id',
  'tracking_number', 'courier_name', 'is_size_confirmed', 'shipping_city', 'shipping_state',
  'created_at', 'updated_at',
].join(',');

const ORDER_STATUSES = new Set([
  'created', 'paid', 'waiting', 'confirmed', 'processing', 'shipped', 'out_for_delivery',
  'delivered', 'exception', 'cancelled', 'rto_initiated', 'returned', 'refunded',
]);
const POST_PAYMENT = new Set(['paid', 'waiting', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'exception', 'rto_initiated', 'returned']);
const AT_POD = new Set(['waiting', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'exception', 'rto_initiated', 'returned']);
const FREES_REPLACEMENT_SLOT = new Set(['cancelled']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const short = (id) => id?.slice(0, 8);

function uuidBound(hex, fill) {
  const h = hex.padEnd(32, fill);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

async function resolveOrder(ref) {
  const q = db().from('tbl_orders').select(ORDER_COLUMNS);
  let rows;
  if (UUID.test(ref)) rows = await select(q.eq('id', ref), 'order by id');
  else if (/^[0-9a-f-]{6,}$/i.test(ref)) {
    const hex = ref.replace(/-/g, '').toLowerCase();
    rows = await select(q.gte('id', uuidBound(hex, '0')).lte('id', uuidBound(hex, 'f')).limit(5), 'order by id prefix');
  } else if (ref.startsWith('order_')) rows = await select(q.eq('razorpay_order_id', ref), 'order by razorpay_order_id');
  else rows = await select(q.eq('pod_order_id', ref), 'order by pod_order_id');

  if (rows.length === 0) throw new OpError(`No order matches "${ref}"`, 'Accepts a uuid, a uuid prefix (≥6 hex chars, e.g. the short id in admin), a Razorpay order_… id, or a Qikink pod_order_id.');
  if (rows.length > 1) throw new OpError(`"${ref}" matches ${rows.length} orders: ${rows.map((r) => r.id).join(', ')}`, 'Use a longer prefix or the full uuid.');
  return rows[0];
}

/**
 * Checks one order against the rules in CLAUDE.md (traceability, replacements, payment, POD).
 * `items` is only needed for replacements; `parent` only for replacements; `children` only for originals.
 */
export function orderViolations({ order, events, items = [], parent, children = [] }) {
  const v = [];
  const add = (severity, rule, detail) => v.push({ order: order.id, severity, rule, detail });
  const sorted = events.filter((e) => e.new_status != null).sort((a, b) => a.created_at.localeCompare(b.created_at));

  if (sorted.length === 0) add('error', 'no_events', 'Order has no tbl_order_events rows; every order must be traceable.');
  else {
    const last = sorted[sorted.length - 1];
    if (last.new_status !== order.status) add('error', 'status_mismatch', `order.status=${order.status} but last event new_status=${last.new_status}`);
  }
  for (let i = 0; i < sorted.length; i++) {
    const e = sorted[i];
    const prev = sorted[i - 1];
    if (!ORDER_STATUSES.has(e.new_status)) add('warn', 'unknown_status', `event ${short(e.id)} new_status="${e.new_status}"`);
    if (!prev || e.previous_status == null) continue;
    if (e.previous_status === e.new_status && prev.previous_status === prev.new_status && e.new_status === prev.new_status && e.note && e.note === prev.note) {
      const gapMs = Date.parse(e.created_at) - Date.parse(prev.created_at);
      add('warn', 'duplicate_note', `"${e.note}" logged twice, ${gapMs}ms apart (events ${short(prev.id)}, ${short(e.id)})${e.note.startsWith('Status updated:') ? ' — delivery-failure note, so the admin alert likely fired twice' : ''}`);
      continue;
    }
    if (e.previous_status === prev.previous_status && e.new_status === prev.new_status && e.new_status !== e.previous_status) {
      const gapMs = Date.parse(e.created_at) - Date.parse(prev.created_at);
      add('warn', 'duplicate_transition', `${e.previous_status} → ${e.new_status} logged twice, ${gapMs}ms apart (events ${short(prev.id)}, ${short(e.id)})`);
    } else if (e.previous_status !== prev.new_status) {
      add('warn', 'broken_chain', `event ${short(e.id)} previous_status=${e.previous_status} but prior event ended at ${prev.new_status}`);
    }
  }

  if (order.order_kind === 'replacement') {
    if (!order.parent_order_id) add('error', 'replacement_no_parent', 'Replacement without parent_order_id.');
    if (!order.pod_order_id) add('error', 'replacement_no_pod_order', 'Replacements are recorded, not created: pod_order_id is required.');
    if (order.razorpay_order_id) add('error', 'replacement_has_razorpay', 'Replacement carries a razorpay_order_id; it must never be a sale.');
    const priced = items.filter((i) => Number(i.unit_price) !== 0);
    if (priced.length) add('error', 'replacement_priced_items', `${priced.length} line item(s) with unit_price ≠ 0`);
    if (parent && parent.order_kind === 'replacement') add('error', 'replacement_nested', `Parent ${short(parent.id)} is itself a replacement (one level deep only).`);
  } else {
    if (order.razorpay_order_id && POST_PAYMENT.has(order.status) && !order.razorpay_payment_id) {
      add('error', 'paid_without_payment_id', `status=${order.status} but razorpay_payment_id is empty`);
    }
    const live = children.filter((c) => c.order_kind === 'replacement' && !FREES_REPLACEMENT_SLOT.has(c.status));
    if (live.length > 1) add('error', 'multiple_live_replacements', `live replacements: ${live.map((c) => short(c.id)).join(', ')}`);
  }

  if (AT_POD.has(order.status) && !order.pod_order_id) add('warn', 'missing_pod_order_id', `status=${order.status} but no pod_order_id`);
  return v;
}

async function trace(positional, flags) {
  if (!positional[0]) throw new OpError('Missing order reference', 'Usage: op order trace <uuid | uuid-prefix | order_… | pod_order_id>');
  const order = await resolveOrder(positional[0]);
  const client = db();

  const [events, items, notifications, jobs, children, parent] = await Promise.all([
    select(client.from('tbl_order_events').select('id,previous_status,new_status,note,created_at').eq('order_id', order.id).order('created_at'), 'events'),
    select(client.from('tbl_order_items').select('id,product_id,variant_id,quantity,unit_price,bundle_id').eq('order_id', order.id), 'items'),
    select(client.from('tbl_customer_notifications').select('id,channel,template_key,status,from_me,error_message,created_at').eq('order_id', order.id).order('created_at'), 'notifications'),
    select(client.from('tbl_background_jobs').select('id,job_type,status,attempts,last_error,run_at,created_at').eq('reference_id', order.id).order('created_at'), 'jobs'),
    select(client.from('tbl_orders').select('id,status,order_kind,pod_order_id,created_at').eq('parent_order_id', order.id), 'replacements'),
    order.parent_order_id ? select(client.from('tbl_orders').select('id,status,order_kind,pod_order_id').eq('id', order.parent_order_id), 'parent').then((r) => r[0]) : null,
  ]);

  const [products, variants] = await Promise.all([
    selectIn('tbl_products', 'id,name', 'id', [...new Set(items.map((i) => i.product_id))]),
    selectIn('tbl_product_variants', 'id,size,color,pod_variant_sku', 'id', [...new Set(items.map((i) => i.variant_id).filter(Boolean))]),
  ]);
  const productName = new Map(products.map((p) => [p.id, p.name]));
  const variantById = new Map(variants.map((v) => [v.id, v]));

  let payments = [];
  let paymentsNote;
  if (order.razorpay_order_id) {
    const { data, error } = await client
      .from('tbl_payment_events')
      .select('event_type,provider_event_id,created_at')
      .eq('payload->payment->entity->>order_id', order.razorpay_order_id)
      .order('created_at');
    if (error) paymentsNote = `payment events lookup failed: ${error.message}`;
    else payments = data;
  }

  const timeline = [
    ...events.map((e) => ({ at: e.created_at, kind: 'status', text: `${e.previous_status ?? '∅'} → ${e.new_status}${e.note ? ` — ${e.note}` : ''}` })),
    ...payments.map((p) => ({ at: p.created_at, kind: 'payment', text: `${p.event_type} (${p.provider_event_id})` })),
    ...notifications.map((n) => ({ at: n.created_at, kind: 'notify', text: `${n.from_me ? 'out' : 'in'} ${n.channel} ${n.template_key ?? '(inbound)'} → ${n.status}${n.error_message ? ` ERROR: ${n.error_message}` : ''}` })),
    ...jobs.map((j) => ({ at: j.created_at, kind: 'job', text: `${j.job_type} ${j.status} attempts=${j.attempts}${j.last_error ? ` last_error: ${j.last_error}` : ''}` })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  const violations = orderViolations({ order, events, items, parent, children });
  const limit = Number(flags.limit ?? 200);

  return {
    order,
    items: items.map((i) => {
      const v = variantById.get(i.variant_id);
      return {
        product: productName.get(i.product_id) ?? i.product_id,
        variant: v ? `${v.color}/${v.size} (${v.pod_variant_sku})` : i.variant_id,
      quantity: i.quantity,
        unit_price: i.unit_price,
        ...(i.bundle_id ? { bundle_id: i.bundle_id } : {}),
      };
    }),
    replacement: order.order_kind === 'replacement' ? { parent } : { children },
    counts: { events: events.length, payments: payments.length, notifications: notifications.length, jobs: jobs.length },
    timeline: timeline.slice(-limit),
    violations,
    ...(paymentsNote ? { notes: [paymentsNote] } : {}),
    adminUrl: `/admin/orders/${order.id}`,
  };
}

function sinceDate(spec) {
  const m = String(spec).match(/^(\d+)([dh])$/);
  if (!m) throw new OpError(`Bad --since "${spec}"`, 'Use e.g. 7d, 30d or 48h.');
  return new Date(Date.now() - Number(m[1]) * (m[2] === 'd' ? 86_400_000 : 3_600_000)).toISOString();
}

async function invariants(_positional, flags) {
  const since = sinceDate(flags.since ?? '30d');
  const limit = Number(flags.limit ?? 500);
  const client = db();
  const orders = await select(client.from('tbl_orders').select(ORDER_COLUMNS).gte('created_at', since).order('created_at', { ascending: false }).limit(limit), 'orders');
  const ids = orders.map((o) => o.id);

  const events = await selectIn('tbl_order_events', 'id,order_id,previous_status,new_status,note,created_at', 'order_id', ids, 25);
  const replacementIds = orders.filter((o) => o.order_kind === 'replacement').map((o) => o.id);
  const items = await selectIn('tbl_order_items', 'order_id,unit_price', 'order_id', replacementIds);
  const children = await selectIn('tbl_orders', 'id,status,order_kind,parent_order_id', 'parent_order_id', ids);
  const parentIds = [...new Set(orders.map((o) => o.parent_order_id).filter(Boolean))];
  const parents = await selectIn('tbl_orders', 'id,order_kind', 'id', parentIds);

  const group = (rows, key) => rows.reduce((m, r) => (m.get(r[key])?.push(r) ?? m.set(r[key], [r]), m), new Map());
  const eventsBy = group(events, 'order_id');
  const itemsBy = group(items, 'order_id');
  const childrenBy = group(children, 'parent_order_id');
  const parentById = new Map(parents.map((p) => [p.id, p]));

  const violations = orders.flatMap((order) =>
    orderViolations({
      order,
      events: eventsBy.get(order.id) ?? [],
      items: itemsBy.get(order.id) ?? [],
      parent: parentById.get(order.parent_order_id),
      children: childrenBy.get(order.id) ?? [],
    })
  );

  const byRule = {};
  for (const v of violations) byRule[v.rule] = { severity: v.severity, count: (byRule[v.rule]?.count ?? 0) + 1 };
  const errors = violations.filter((v) => v.severity === 'error');
  const max = Number(flags.max ?? 50);
  return {
    ok: errors.length === 0,
    scanned: {
      orders: orders.length,
      events: events.length,
      nullStatusEventsIgnored: events.filter((e) => e.new_status == null).length,
      since,
      truncated: orders.length === limit,
    },
    byRule,
    violations: [...errors, ...violations.filter((v) => v.severity !== 'error')].slice(0, max),
    hint: violations.length ? 'Drill into one with `op order trace <order id>`.' : undefined,
  };
}

export const commands = {
  'order trace': {
    summary: 'Full read-only timeline of one order + invariant violations',
    usage: `
op order trace <ref> [--limit 200]

<ref> is any of: full uuid, uuid prefix (≥6 hex, e.g. "3f2a9c1b"), Razorpay "order_…" id, Qikink pod_order_id.

Returns the order (no customer PII: no name/phone/email/address lines), line items with
product + variant/SKU, replacement parent/children, and one merged timeline of
status events, Razorpay payment events, WhatsApp/email notifications and background jobs.
"violations" applies the same rules as \`op order invariants\` to this order.`,
    run: trace,
  },
  'order invariants': {
    summary: 'Scan recent orders for traceability / replacement / payment rule breaks',
    usage: `
op order invariants [--since 30d] [--limit 500] [--max 50]

Rules (error unless noted):
  no_events                  order has no tbl_order_events
  status_mismatch            order.status ≠ last event's new_status
  duplicate_transition (warn) the same a → b transition logged twice in a row
  duplicate_note (warn)      the same same-status note (e.g. a delivery-failure reason) logged twice in a row
  broken_chain (warn)        an event's previous_status ≠ the prior event's new_status
  unknown_status (warn)      event status outside the OrderStatus union
  paid_without_payment_id    prepaid original past 'paid' with no razorpay_payment_id
  replacement_no_parent / replacement_no_pod_order / replacement_has_razorpay
  replacement_priced_items   replacement line items must be unit_price = 0
  replacement_nested         a replacement's parent is a replacement
  multiple_live_replacements more than one non-cancelled replacement per order (refunded still holds the slot, as in the DB index)
  missing_pod_order_id (warn) status at/after 'waiting' with no pod_order_id

Events with NULL new_status (legacy poller spam) are ignored and counted in scanned.nullStatusEventsIgnored.
Exit code is 1 when any error-severity violation exists.`,
    run: invariants,
  },
};
