import { useState } from "react";
import { Link } from "react-router-dom";
import type { WishlistEntry, WishlistProduct } from "../api/wishlist";
import StoreHeader from "../components/StoreHeader";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

function WishlistItem({
  entry,
  busy,
  onMove,
  onRemove,
}: {
  entry: WishlistEntry;
  busy: boolean;
  onMove: (productId: string, variantId?: string) => void;
  onRemove: (productId: string) => void;
}) {
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const product = entry.product as WishlistProduct | null;
  const productId = product?._id;

  if (!product || !productId) {
    return (
      <article
        className="rounded-2xl border border-slate-200 bg-white p-5"
        aria-label="Unavailable saved product"
      >
        <p className="text-slate-700">
          This saved product is no longer available.
        </p>
      </article>
    );
  }

  const variants = product.variants || [];
  const selectedVariant = variants.find(
    (variant) => variant._id === selectedVariantId,
  );
  const unavailable = variants.length
    ? !selectedVariant || selectedVariant.stock <= 0
    : (product.stock ?? 0) <= 0;
  const price =
    selectedVariant?.effectivePrice ?? selectedVariant?.price ?? product.price;

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {product.images?.[0] ? (
        <img
          src={product.images[0]}
          alt={product.name}
          className="aspect-[4/3] w-full bg-slate-100 object-cover"
        />
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center bg-slate-100 text-sm text-slate-500">
          No image available
        </div>
      )}
      <div className="p-4">
        <h2 className="text-lg font-bold text-slate-900">
          <Link to={`/products/${productId}`} className="hover:text-indigo-700">
            {product.name}
          </Link>
        </h2>
        {variants.length > 0 && (
          <label className="mt-3 block text-sm font-medium text-slate-700">
            Choose a variant
            <select
              value={selectedVariantId}
              onChange={(event) => setSelectedVariantId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
              aria-label={`Choose a variant for ${product.name}`}
            >
              <option value="">Select size and colour</option>
              {variants.map((variant) => (
                <option
                  key={variant._id}
                  value={variant._id}
                  disabled={variant.stock <= 0}
                >
                  {variant.size} / {variant.color}
                  {variant.stock <= 0 ? " - Out of stock" : ""}
                </option>
              ))}
            </select>
          </label>
        )}
        <p className="mt-3 font-semibold text-slate-800">
          {money.format(price)}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || unavailable}
            onClick={() => onMove(productId, selectedVariantId || undefined)}
            className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Moving…" : unavailable ? "Unavailable" : "Move to cart"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onRemove(productId)}
            aria-label={`Remove ${product.name} from wishlist`}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      </div>
    </article>
  );
}

export default function Wishlist() {
  const { user, loading: authLoading } = useAuth();
  const {
    entries,
    loading,
    busyProductId,
    error,
    removeProduct,
    moveToCart,
    refreshWishlist,
  } = useWishlist();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <StoreHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-rose-600">
              Saved for later
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
              My wishlist
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
            Loading your wishlist…
          </div>
        ) : !user ? (
          <section className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center">
            <h2 className="text-xl font-bold text-slate-900">
              Sign in to view your wishlist
            </h2>
            <p className="mt-2 text-slate-600">
              Saved products are linked to your account.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-flex rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700"
            >
              Sign in
            </Link>
          </section>
        ) : error && entries.length === 0 ? (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-10 text-center">
            <p className="text-rose-800" role="alert">
              {error}
            </p>
            <button
              type="button"
              onClick={() => void refreshWishlist().catch(() => undefined)}
              className="mt-5 rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-700"
            >
              Try again
            </button>
          </section>
        ) : entries.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <span aria-hidden="true" className="text-3xl">
                ♡
              </span>
            </div>
            <h2 className="mt-4 text-xl font-bold text-slate-900">
              Your wishlist is empty
            </h2>
            <p className="mt-2 text-slate-600">
              Tap the heart on a product to save it here.
            </p>
            <Link
              to="/products"
              className="mt-6 inline-flex rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700"
            >
              Browse products
            </Link>
          </section>
        ) : (
          <>
            {error && (
              <p
                className="mb-5 rounded-lg bg-rose-50 p-3 text-sm text-rose-800"
                role="alert"
              >
                {error}
              </p>
            )}
            <section
              aria-label="Saved products"
              className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
            >
              {entries.map((entry) => (
                <WishlistItem
                  key={entry._id}
                  entry={entry}
                  busy={busyProductId === entry.product?._id}
                  onMove={(productId, variantId) =>
                    void moveToCart(productId, variantId).catch(() => undefined)
                  }
                  onRemove={(productId) =>
                    void removeProduct(productId).catch(() => undefined)
                  }
                />
              ))}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
