# Storefront

## Sub-features

- shop-all: `/products` — 3-col grid (2 on mobile), 12 per page, "Load More" button (offset pagination). Quick-filter pill row above the grid: fit names then colour names (from DB collections), `|` separators.
- filter-drawer: fixed right-edge button "Open filters" (badge = active count) opens a bottom drawer dialog "Filter": Type, Collection, Color chips, a Price slider, CTA "See Products". The price range is UI-only — never sent to the API.
- filter-persistence: filters live in localStorage `op_product_filters` (not URL, not sessionStorage), so they survive reloads and earlier runs.
- product-card: badge pills from `/api/badges` (New Arrival, Selling Out Fast, Best Seller…), title (name before `|`), fit subtitle, price + struck `list_price` when higher, square colour thumbnails only when the group has >1 colour (click → sibling product). Icon-only `+` (no accessible name) opens the VariantDrawer; once in cart it becomes "Remove one" / qty / "Add one".
- variant-drawer: dialog "Select variant" — size buttons (S–XXL), "Decrease/Increase quantity", price, "Add to Cart" (local cart only).
- product-detail: `/product/[id]` — `h1` name, ColorSwatches (`aria-pressed`, sibling navigation via `router.replace`), inline size selector, "Add to Cart" (adds straight to the cart, no drawer) and "Buy Now" (goes to checkout). "Bundle & save" block (only if the product is in a bundle) → BundleDrawer; "Frequently Bought Together" from product relations; UGC strip; "You Might Also Like".
- collections: `/collections` bento grid of theme/fit collections (colour collections hidden) plus 8 featured products; `/collection/[slug]` lists one collection (sr-only `h1`), or "No Products Yet" / "Collection Not Found".
- home: `NEW ARRIVALS` (products badged `new-arrival`, newest first, top 8, omitted if none) and `BUNDLE & SAVE` strip ("Pick your sizes, pay one price", featured bundles).

## How to get to it (user POV)

Navbar → "Shop All" (`/products`) or "Collections". Tap a pill or "Open filters" to filter. Tap a card for the product page, or its `+` to pick a size in the drawer.

## Driving it with op

```bash
op up all
op browser reset                          # clears saved filters + cart from earlier runs
op open /products
op snapshot --selector main
op click "Open filters" && op snapshot --selector "[role=dialog]"
op open /products
op click --selector "main button.absolute.bottom-2.right-2" --nth 0   # card +  → "Select variant"
op snapshot --selector "[role=dialog]"
op open /products --mobile && op screenshot
```

Ids and slugs: `curl -s localhost:8080/api/products` → `.data.products[].id`; `curl -s localhost:8080/api/collections` → `.data.collections.{theme,color,fit}[].slug`.

## Gotchas

- `/products` logs a React "unique key prop" error: the quick-filter pills are wrapped in keyless fragments (`app/products/page.tsx` ~L227). Known, pre-existing.
- Colour names repeat across pills, cards and the drawer — `op click Black` matches several; use `--nth`.
- Clicking "Add to Cart" on a product page or in the drawer writes the local cart (shows the floating "CART n item" pill). Run `op browser reset` afterwards.
- With `op up web` alone the storefront talks to the **remote** API from `.env.local`; local backend changes need `op up all`.
