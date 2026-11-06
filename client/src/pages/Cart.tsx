import { Link } from "react-router-dom";
import StoreHeader from "../components/StoreHeader";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export default function Cart() {
  const { user, loading: authLoading } = useAuth();
  const {
    cart,
    loading,
    busy,
    error,
    refreshCart,
    updateQuantity,
    removeItem,
    clear,
  } = useCart();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <StoreHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-indigo-600">
              Your selections
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
              Shopping cart
            </h1>
          </div>
          <Link
            to="/products"
            className="font-semibold text-indigo-700 hover:text-indigo-900"
          >
            Continue shopping
          </Link>
        </div>

        {authLoading || loading ? (
          <div
            className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600"
            role="status"
          >
            Loading your cart…
          </div>
        ) : !user ? (
          <section className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center">
            <h2 className="text-xl font-bold text-slate-900">
              Sign in to view your cart
            </h2>
            <p className="mt-2 text-slate-600">
              Your cart is saved to your account when you sign in.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-flex rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700"
            >
              Sign in
            </Link>
          </section>
        ) : error && !cart ? (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-10 text-center">
            <p className="text-rose-800" role="alert">
              {error}
            </p>
            <button
              type="button"
              onClick={() => void refreshCart().catch(() => undefined)}
              className="mt-5 rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-700"
            >
              Try again
            </button>
          </section>
        ) : !cart?.items.length ? (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <h2 className="text-xl font-bold text-slate-900">
              Your cart is empty
            </h2>
            <p className="mt-2 text-slate-600">
              Browse the catalog and add something you love.
            </p>
            <Link
              to="/products"
              className="mt-6 inline-flex rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700"
            >
              Browse products
            </Link>
          </section>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
            <section aria-label="Cart items" className="space-y-4">
              {error && (
                <p
                  className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800"
                  role="alert"
                >
                  {error}
                </p>
              )}
              {cart.items.length > 1 && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void clear().catch(() => undefined)}
                  className="mb-1 text-sm font-semibold text-rose-700 hover:text-rose-900 disabled:opacity-50"
                >
                  Clear cart
                </button>
              )}
              {cart.items.map((item) => {
                const image = item.product.images?.[0];
                return (
                  <article
                    key={item._id}
                    className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center"
                  >
                    {image ? (
                      <img
                        src={image}
                        alt=""
                        className="h-24 w-24 rounded-xl bg-slate-100 object-cover"
                      />
                    ) : (
                      <div
                        className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-500"
                        aria-label="No product image"
                      >
                        No image
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h2 className="font-bold text-slate-900">
                        <Link
                          to={`/products/${item.product._id}`}
                          className="hover:text-indigo-700"
                        >
                          {item.product.name}
                        </Link>
                      </h2>
                      {item.variant && (
                        <p className="mt-1 text-sm text-slate-600">
                          {item.variant.size} / {item.variant.color}
                        </p>
                      )}
                      <p className="mt-1 text-sm text-slate-600">
                        {money.format(item.unitPrice)} each
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                      <div
                        className="inline-flex items-center rounded-lg border border-slate-300"
                        aria-label={`Quantity for ${item.product.name}`}
                      >
                        <button
                          type="button"
                          aria-label={`Decrease ${item.product.name} quantity`}
                          disabled={busy || item.quantity <= 1}
                          onClick={() =>
                            void updateQuantity(
                              item._id,
                              item.quantity - 1,
                            ).catch(() => undefined)
                          }
                          className="px-3 py-2 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                        >
                          −
                        </button>
                        <span className="min-w-8 text-center text-sm font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label={`Increase ${item.product.name} quantity`}
                          disabled={busy || item.quantity >= 99}
                          onClick={() =>
                            void updateQuantity(
                              item._id,
                              item.quantity + 1,
                            ).catch(() => undefined)
                          }
                          className="px-3 py-2 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>
                      <p className="font-bold text-slate-900">
                        {money.format(item.lineTotal)}
                      </p>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void removeItem(item._id).catch(() => undefined)
                        }
                        className="text-sm font-semibold text-rose-700 hover:text-rose-900 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>

            <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">
                Order summary
              </h2>
              <div className="mt-4 flex justify-between text-sm text-slate-600">
                <span>Items ({cart.itemCount})</span>
                <span>{money.format(cart.subtotal)}</span>
              </div>
              <div className="mt-4 flex justify-between border-t border-slate-200 pt-4 font-bold text-slate-900">
                <span>Subtotal</span>
                <span>{money.format(cart.subtotal)}</span>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Shipping and taxes are calculated at checkout.
              </p>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
