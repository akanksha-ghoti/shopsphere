# Product listing filters and sorting

`GET /api/products` supports these query parameters:

| Parameter | Values | Behavior |
| --- | --- | --- |
| `q` | Non-empty text, up to 200 characters | MongoDB text search by product name and description |
| `search` | Non-empty text, up to 200 characters | Backward-compatible alias for `q`; do not send both |
| `category` | MongoDB ObjectId | Exact category filter |
| `minPrice`, `maxPrice` | Finite non-negative decimal numbers | Inclusive range on the parent product `price` |
| `inStock` | `true` or `false` | Variant stock is authoritative when variants exist; otherwise parent product stock is used |
| `sort` | `price_asc`, `price_desc`, `newest`, `oldest`, `name_asc`, `name_desc` | Server-side sort with `_id` as a stable tie-breaker |
| `page` | Positive integer; defaults to `1` | One-based page number |
| `limit` | Integer from `1` to `100`; defaults to `10` | Page size |

Filters combine with text search. Price filters and price sorting use the
parent product price; they do not represent a variant price override. A
variant-bearing product is in stock if at least one variant has positive stock.
Products without variants use their parent stock; a missing stock value is
treated as out of stock.

Examples:

```text
/api/products?q=phone&category=<categoryId>&minPrice=100&maxPrice=500
/api/products?inStock=true&sort=price_asc&page=2&limit=20
/api/products?search=wireless&inStock=false&sort=newest
```

Invalid, repeated, unknown, or unsupported query values return HTTP 400.

Indexes retain the existing text and unique variant-SKU indexes. Listing
indexes put `category` before price or creation time for category-scoped range
and chronological queries; standalone price, creation-time, and name indexes
support their corresponding unfiltered sort choices. Separate stock indexes
support parent-stock and variant-stock branches of the in-stock filter.
