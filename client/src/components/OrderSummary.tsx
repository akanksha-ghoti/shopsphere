import type { CheckoutSummary } from "../api/checkout";

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export default function OrderSummary({
  summary,
  loading = false,
  error,
}: {
  summary: CheckoutSummary | null;
  loading?: boolean;
  error?: string;
}) {
  if (loading) {
    return (
      <section
        aria-label="Order summary"
        aria-busy="true"
        className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5"
        role="status"
      >
        <span className="sr-only">Loading order summary…</span>
        <div className="h-6 w-40 rounded bg-slate-200" />
        <div className="mt-5 space-y-3">
          <div className="h-16 rounded-lg bg-slate-100" />
          <div className="h-16 rounded-lg bg-slate-100" />
          <div className="h-24 rounded-lg bg-slate-100" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section
        aria-label="Order summary"
        className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-900"
        role="alert"
      >
        {error}
      </section>
    );
  }

  if (!summary) {
    return (
      <section
        aria-label="Order summary"
        className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-slate-600"
      >
        Your order totals will appear after you choose a delivery address.
      </section>
    );
  }

  return (
    <section
      aria-label="Order summary"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <h2 className="text-xl font-extrabold text-slate-950">Order review</h2>
      <ul className="mt-5 divide-y divide-slate-100">
        {summary.items.map((item, index) => {
          const itemId =
            item._id || item.cartItemId || `${item.product.slug}-${index}`;
          return (
            <li key={itemId} className="flex gap-4 py-4 first:pt-0 last:pb-4">
              {item.product.images[0] ? (
                <img
                  src={item.product.images[0]}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-lg bg-slate-100 object-cover"
                />
              ) : (
                <div
                  aria-label="No product image"
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-500"
                >
                  No image
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-slate-900">
                  {item.product.name}
                </h3>
                {item.variant && (
                  <p className="mt-1 text-sm text-slate-600">
                    {item.variant.size} / {item.variant.color}
                  </p>
                )}
                <p className="mt-1 text-sm text-slate-600">
                  {item.quantity} × {money.format(item.unitPrice)}
                </p>
              </div>
              <p className="shrink-0 text-right font-bold text-slate-900">
                {money.format(item.lineTotal)}
              </p>
            </li>
          );
        })}
      </ul>

      <dl className="space-y-3 border-t border-slate-200 pt-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-slate-600">Subtotal</dt>
          <dd className="font-medium text-slate-900">
            {money.format(summary.subtotal)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-600">
            Shipping
            {summary.shipping.isFree && (
              <span className="ml-2 text-xs font-semibold text-emerald-700">
                Free
              </span>
            )}
          </dt>
          <dd className="font-medium text-slate-900">
            {summary.shippingFee === 0
              ? "Free"
              : money.format(summary.shippingFee)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-600">
            Tax ({(summary.tax.rate * 100).toFixed(0)}%)
          </dt>
          <dd className="font-medium text-slate-900">
            {money.format(summary.tax.amount)}
          </dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-slate-200 pt-3 text-base">
          <dt className="font-bold text-slate-950">Grand total</dt>
          <dd className="font-extrabold text-slate-950">
            {money.format(summary.grandTotal)}
          </dd>
        </div>
      </dl>
      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        Prices and availability are confirmed by the server and may change
        before payment.
      </p>
    </section>
  );
}
