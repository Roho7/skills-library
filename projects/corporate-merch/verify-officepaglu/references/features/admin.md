# Admin

## Sub-features

- dashboard `/admin` — revenue KPIs, order stats.
- orders `/admin/orders` — list with **Replacement** and **Replaced** badges and a parent-order link. Detail `/admin/orders/[id]`: Modify Order controls, "Retrigger Order" (Qikink originals only, hidden on replacements), Delete Order, Customer card, replacement cross-links ("Replacement for" on a replacement; "Replacements" list + "Record a replacement" on an original) → `/admin/orders/[id]/replacement/new`.
- `/admin/users` — user list.
- catalog: products (list, `new`, `[id]/edit`), collections (list), badges and bundles (list, `new`, `[id]/edit`), coupons (list, `[id]/edit` — no `new` page), product-relations (single page).
- ops: jobs (retry), carts (`/admin/carts`, `/admin/carts/[id]` follow-up timeline), WhatsApp (`/admin/whatsapp`, `/admin/whatsapp/[phone]` read-only thread), mockup generator.
- list state: `context/AdminContext.tsx` slices `orders` (search, status filters, date range, payment method, order kind, courier filters, page, selected order) and `products` (search, active/collection/price/margin filters, date range, sort), mirrored to sessionStorage `admin-state`.

## How to get to it (user POV)

Sign in as a user whose `tbl_users.is_admin` is true, then `/admin`; the sidebar lists the 13 sections.

## Access gate

1. `middleware.ts` (matcher `/admin/:path*`) reads the Supabase SSR cookie `sb-<project-ref>-auth-token`, calls `/api/users/me`, and redirects to `/login` (query string dropped) before any admin HTML renders. A valid verdict is cached for 5 min in an `admin_verdict` cookie signed with `ADMIN_GATE_SECRET` (a cache key, not an access secret). API down → 503.
2. `app/admin/layout.tsx` re-checks `is_admin` client-side.
3. Backend `/api/admin/*` runs `authenticateUser` + `requireAdmin` (`tbl_users.is_admin`, never JWT metadata).

`localStorage.auth_token` alone does not get past the middleware.

## Driving it with op

Gate only — `op` has no admin session:

```bash
op open /admin                   # → url http://localhost:3000/login
op open "/admin/orders?status=x" # → /login, query stripped
op open /admin/users             # → /login
```

To verify signed-in admin pages, the harness would need a persisted browser profile in which a real admin signed in once through `/login`. Until then, verify admin changes with `op check` and `op order trace`, and say so.

## Gotchas

- Every mutation here hits production. Even with a session, only read.
