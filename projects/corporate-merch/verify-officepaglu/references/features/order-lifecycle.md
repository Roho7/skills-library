# Order Lifecycle

## Sub-features

- states: `created → paid → waiting → confirmed → processing → shipped → out_for_delivery → delivered`, plus `exception`, `cancelled`, `refunded`, `rto_initiated`, `returned`. `create_order_atomic` writes the first event (∅ → created); every later event is written by app code after the status update (not atomic — a failed second write leaves `status_mismatch`). Same-status notes (failure reasons, size reminders, replacement-created on the parent, admin edits) are also events.
- prepaid: checkout sets `razorpay_order_id` at `created` → Razorpay `payment.captured` sets `paid` + `razorpay_payment_id` and enqueues `send_to_pod` → job sets `waiting` + `pod_order_id`.
- COD: no Razorpay ids; checkout writes `created → paid` ("COD order confirmed") and enqueues `send_to_pod`. An original with no `razorpay_order_id` is COD *or* a prepaid checkout that died at `created`.
- send-to-POD: `send_to_pod` job, `reference_id` = order id, retried with backoff.
- Razorpay webhook: idempotent on `provider_event_id`; `tbl_payment_events.payload` is the webhook's inner payload, linked by `payload.payment.entity.order_id` (typically `payment.authorized`, `order.paid`, `payment.captured`).
- Qikink poller (every 15 min + once at boot, no lock): maps via `qikinkStatus.ts`; status changes use an optimistic update so overlapping polls can't double-log a transition. Delivery failures → `exception` + admin alert when the Qikink status differs from the latest "Status updated:" note (so A→B→A alerts again); 7 of the 14 also send the customer "delivery_failed". Unmapped statuses change no status/event but still update tracking/courier.
- notifications: `tbl_customer_notifications` rows are WhatsApp Cloud API only (Periskope sends and email are not logged). Notifications for a replacement are sent and logged against its **parent**.
- replacements: child `tbl_orders` row, `order_kind = 'replacement'`, `parent_order_id` (DB check), one level (DB trigger), one live per parent (DB unique index; only `cancelled` frees the slot — `refunded` still holds it), `pod_order_id` required and `unit_price = 0` (app only), no Razorpay ids, retrigger refused. `total_amount` may be a fee.

## Driving it with op

```bash
op order trace e89bb5e6          # prepaid delivered: 7 events, 3 payment events, send_to_pod job
op order trace aee76e14          # COD delivered: "COD order confirmed", 0 payments, WhatsApp notifications
op order trace 86928df7          # replacement → parent c7ffb003 (its notifications live on the parent)
op order invariants --since 7d   # after changing poller / checkout / replacement code
op qikink map --all              # 30 mappings, 14 delivery failures, 7 notify the customer
op qikink map "OTP not shared" "Picked Up"
```

## Gotchas

- `order invariants` exits 1 on the full history because of the baseline below. Compare rule counts against it; new ones are regressions.
- Baseline as of 2026-10-28 (671 orders): `status_mismatch` 33 (mostly `cancelled` with no cancel event and `updated_at == created_at` — edited outside the app), `no_events` 3, `duplicate_transition` 54 (legacy, before the optimistic guard), `duplicate_note` 28 (mix of legacy "Tracking:" notes, doubled variant-change notes, and doubled "Status updated:" failure notes = double admin alerts — the failure-note path has no optimistic guard), `broken_chain` 16, `missing_pod_order_id` 4, `unknown_status` 2 (`pod_sent`).
- Known false-positive sources: admin variant change logs `waiting` without changing `tbl_orders.status`; a late `payment.captured` logs `created → paid` on an order already past `paid`.
- NULL `new_status` events (old poller spam) are ignored and counted in `scanned.nullStatusEventsIgnored`.
- `tbl_pod_events` has no per-order link and is not in the trace. Admin alerts aren't stored anywhere `op` can read.
