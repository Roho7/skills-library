# Cart + Checkout

## Sub-features

- cart state: client-only, localStorage `cart` (loose items) and `cart_bundles` (bundle lines) via `lib/cart.ts`.
- cart drawer ("Your cart"): bundle lines + items with steppers, Subtotal, CHECKOUT. Subtotals use product prices only — no discounts or fees.
- `/cart` page: items, `BundleCartLineRow`, "Upgrade to bundle" swap offer, FBT rail, "Proceed to Checkout". Empty: "Your cart is empty" / "Start adding products to get started" / "Browse Products". No redirect.
- floating cart bar: "Cart n items" pill, hidden at 0 items and on `/cart`, `/checkout`, `/admin`.
- checkout gate (`lib/useGuestCheckoutGate.ts`): every checkout entry (drawer, `/cart`, floating bar, product "Buy Now"). Signed-in users and guests with localStorage `guest_checkout_modal_seen` go straight to `/checkout`; other guests get the PreCheckoutModal ("Almost there!", name + phone) which `POST /api/carts` → `tbl_carts` lead + "cart captured" WhatsApp + follow-ups.
- `/checkout`: no auth gate. Address form / saved addresses, coupon ("Got a coupon code?", `POST /api/coupons/validate`), payment drawer (Razorpay prepaid or COD + fee), "Place Order". Also hydrates from `?cart_token=` / `?items=`. Empty: "Your cart is empty" / "Add some products to continue" / "Browse Products". Has a leave-page guard once filled.
- pricing: `GET /api/config/pricing` (backend `PRICING_CONFIG`); backend `calculateCartPricing` recomputes at order time; orders via `create_order_atomic`, one per provider. Frontend has fallbacks (COD fee 50, COD cap 1049) if the config fetch fails.

## How to get to it (user POV)

Add from a product page or the variant drawer → cart drawer / floating bar → CHECKOUT → (guest) pre-checkout modal → `/checkout`.

## Driving it with op

Empty-cart, read-only pass:

```bash
op browser reset
op open /cart && op snapshot --selector main        # empty-state text above
op open /checkout && op snapshot --selector main    # empty-state text above, URL stays /checkout
```

Pricing changes: `op check --app api --only test` (`cartPricing.test.ts` is in `npm test`).

## Gotchas

- **Never submit the pre-checkout modal or checkout** — both write production rows and send WhatsApp. `op click` refuses checkout/buy/place/apply controls.
- **Merely loading `/checkout`** (or clicking CHECKOUT in the drawer, or "Buy Now") fires `POST /api/checkout/visited`, which sends a "CHECKOUT PAGE VISITED" admin WhatsApp when a valid name+phone is known. As an anonymous harness it returns **400** (expected `failedRequests` entry on `/checkout`), and a local API with `NODE_ENV=local` never sends. Never open `/checkout` while signed in or after a pre-checkout submit.
- `/checkout` does `PUT /api/carts/:id` on mount if sessionStorage holds an abandoned cart id — another reason to `op browser reset` first.
