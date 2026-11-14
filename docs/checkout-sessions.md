# Checkout sessions

Checkout sessions are created from the authenticated user's current cart and an
address they own. The service stores a server-generated snapshot of item
quantities, current prices, shipping, tax, and totals. Client-provided snapshot
or pricing values are not accepted.

The authenticated `POST /api/checkout/sessions` endpoint accepts only an
`addressId` and returns the session ID, expiry, and server-generated snapshot.
The checkout page uses it to confirm the displayed order immediately before
entering its payment step.
The current application has no payment gateway integration; the page confirms
the session is ready without submitting a charge.

Sessions expire after 15 minutes by default. Configure
`CHECKOUT_SESSION_TTL_MINUTES` to an integer from 1 to 60 to change the lifetime.
MongoDB's TTL index removes expired records asynchronously; application
validation checks the expiry timestamp directly and does not rely on TTL cleanup.

The service signs session ownership, address, status, expiry, and snapshot fields
with HMAC-SHA256. Set `CHECKOUT_SESSION_SECRET` to a persistent secret of at
least 32 random bytes in each deployment environment. If it is unset, the
service uses a process-random key: this is safe for development but sessions
will fail integrity checks after a server restart.

MongoDB enforces at most one open checkout session per user with a partial
unique index. An expired open session is marked expired before a new session is
created, and concurrent duplicate creation is rejected by the unique index.
