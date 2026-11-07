# Sprint 2 regression checklist

## Automated checks

| Area                         | Check                                                                             | Result |
| ---------------------------- | --------------------------------------------------------------------------------- | ------ |
| Product catalog              | Frontend TypeScript check and production build                                    | Passed |
| Search and filters           | Existing product query/UI code retained; frontend build                           | Passed |
| Product details and variants | Existing detail flow retained; frontend build and backend suite                   | Passed |
| Cart and quantity updates    | Full backend regression suite                                                     | Passed |
| Wishlist add/remove          | API tests, including ownership and authentication                                 | Passed |
| Wishlist move-to-cart        | API tests cover success, missing item, stock/cart failures, and selected variants | Passed |

Executed: `npm.cmd run build --prefix client`, `npm.cmd run lint --prefix client`, and `npm.cmd test --prefix server` (12 suites, 127 tests passed). The client project does not currently define a frontend test-runner script, so automated UI interaction and viewport checks are unavailable.

## Manual checks requiring configured services

- [ ] Start MongoDB and the backend with valid Firebase Admin credentials.
- [ ] Sign in, browse the catalog, and verify wishlist hearts toggle and the header count updates.
- [ ] Refresh and verify the signed-in wishlist is restored from the API.
- [ ] Remove a saved item and verify it disappears from the page and the count.
- [ ] Move an in-stock product to cart; verify the cart badge and totals refresh.
- [ ] For a variant product, select an available variant, move it to cart, and verify that variant is retained.
- [ ] Verify out-of-stock products/variants cannot be moved to cart and remain saved.
- [ ] Check empty and signed-out wishlist states at mobile, tablet, and desktop widths.
- [ ] Verify existing catalog search/filter, product details, cart quantity controls, and direct navigation still work.

## Defects found and fixes

- Variant products could not be moved from the wishlist because the existing endpoint did not accept a selected variant. The wishlist response now includes variant and stock summaries, the move endpoint accepts an optional validated `variantId`, and the page requires an available variant before sending it.
- The wishlist add response contains an unpopulated product reference. After adding, the client refreshes the authenticated wishlist so the heart state and product summary are sourced from the populated GET response.
- The product-card heart uses absolute positioning; its card now establishes the positioning context.

## Remaining limitations

- Authenticated end-to-end UI checks require local Firebase credentials and a reachable MongoDB instance; no credentials are stored in the repository.
- Frontend automated interaction tests and responsive-browser checks are not configured and must be completed manually.
