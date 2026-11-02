# Backend scripts

## Migrate products for variants

After backing up the target MongoDB database, set `MONGODB_URI` in
`server/.env` to the intended database and run:

```powershell
cd server
npm run migrate:product-variants
```

Stop application instances that can write product variants while the migration
checks existing SKUs and builds the index. Run it before deploying or starting
the application version that accepts variant writes.

The migration is repeatable. It checks for duplicate existing variant SKUs,
sets missing or null `variants` fields to an empty array, and creates a
partial unique `variants.sku` index. It does not create variants, change
product prices or inventory, or delete product data. If duplicate SKUs exist,
the migration stops before updating documents; resolve those duplicates before
retrying.
