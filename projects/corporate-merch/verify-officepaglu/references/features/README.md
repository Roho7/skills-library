# OfficePaglu Feature Map

How each feature is reached by a user, and how to drive or inspect it with `op`. Full route list: `docs/ROUTES.md`.

| Feature | Where | Drive / inspect | Detail |
|---|---|---|---|
| Home | `/` | `op open /` | — |
| Shop all + filter drawer | `/products` | `op open /products` → `op click "Open filters"` | [storefront.md](storefront.md) |
| Product detail, variant drawer, bundles | `/product/[id]`, card `+` | `op open /product/<id>`; card `+` via `op click --selector` | [storefront.md](storefront.md) |
| Collections | `/collections`, `/collection/[slug]` | `op open /collections` | [storefront.md](storefront.md) |
| Cart + checkout | `/cart`, `/checkout` | empty-cart browse only; never submit, never open `/checkout` signed in | [cart-checkout.md](cart-checkout.md) |
| Account + order view | `/account`, `/account/orders/[id]` | needs a signed-in user (not yet) | — |
| Order lifecycle (Qikink, events, notifications) | backend | `op order trace`, `op order invariants`, `op qikink map` | [order-lifecycle.md](order-lifecycle.md) |
| Admin (orders, replacements, users, catalog, carts, WhatsApp, …) | `/admin/*` | gate only (`/login` redirect); content needs an admin session (not yet) | [admin.md](admin.md) |
