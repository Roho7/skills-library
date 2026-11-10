import { OpError, app, run } from '../lib/core.mjs';

const SNIPPET = `
const m = require('./src/services/pod/qikinkStatus/qikinkStatus');
const statuses = JSON.parse(process.env.OP_STATUSES);
const describe = (s) => ({
  qikink: s,
  internal: m.mapQikinkStatusToOrderStatus(s),
  deliveryFailure: m.isDeliveryFailureStatus(s),
  notifiesCustomer: m.shouldNotifyCustomerOfFailure(s),
});
const known = [...Object.keys(m.LIFECYCLE_STATUS_MAP), ...m.QIKINK_DELIVERY_FAILURE_STATUSES];
process.stdout.write(JSON.stringify({ results: statuses.map(describe), known: known.map(describe) }));
`;

async function loadMapping(statuses) {
  const r = await run('node', ['-r', 'ts-node/register', '-e', SNIPPET], {
    cwd: app('api').path,
    env: { TS_NODE_TRANSPILE_ONLY: '1', OP_STATUSES: JSON.stringify(statuses) },
    timeoutMs: 60_000,
  });
  if (r.code !== 0) throw new OpError('Could not load services/pod/qikinkStatus/qikinkStatus.ts', r.stderr.trim().split('\n').slice(-5).join(' | '));
  return JSON.parse(r.stdout);
}

function normalise(s) {
  return s.toLowerCase().replace(/[^a-z]/g, '');
}

async function map(positional, flags) {
  if (!positional.length && !flags.all) {
    throw new OpError('Pass one or more raw Qikink statuses (quote multi-word ones), or --all', 'Example: op qikink map "Out for Delivery" "OTP not shared"');
  }
  const { results, known } = await loadMapping(positional);
  if (flags.all) return { source: 'corporate-merch-backend/src/services/pod/qikinkStatus.ts', mappings: known };
  const withHints = results.map((r) => {
    if (r.internal) return r;
    const near = known.filter((k) => normalise(k.qikink) === normalise(r.qikink) || normalise(k.qikink).includes(normalise(r.qikink)));
    return {
      ...r,
      unmapped: true,
      effect: 'poller logs an "unmapped status" warning; status and events unchanged, tracking_number/courier_name still update',
      ...(near.length ? { didYouMean: near.map((k) => k.qikink) } : {}),
    };
  });
  return { results: withHints };
}

export const commands = {
  'qikink map': {
    summary: 'Show what raw Qikink statuses map to (internal status, alerts)',
    booleans: ['all'],
    usage: `
op qikink map "<raw status>" [...more]
op qikink map --all

Runs the real mapping in services/pod/qikinkStatus/qikinkStatus.ts (via ts-node), so it reflects the
working tree. Per status: internal status, whether it's a delivery failure (admin alert),
and whether the customer gets the "delivery attempt failed" WhatsApp.
Matching is exact, as in the poller: "out for delivery" is unmapped; didYouMean suggests the real spelling.`,
    run: map,
  },
};
