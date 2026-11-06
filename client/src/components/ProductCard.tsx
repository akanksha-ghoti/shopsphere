import { useState } from "react";
import { Link } from "react-router-dom";
import type { Product } from "../api/products";
import { useCart } from "../context/CartContext";

interface ProductCardProps {
  product: Product;
  categoryName?: string;
}

const priceFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export default function ProductCard({
  product,
  categoryName,
}: ProductCardProps) {
  const { addItem, busy } = useCart();
  const imageUrl = product.images?.find(
    (image): image is string =>
      typeof image === "string" && image.trim() !== "",
  );
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const imageFailed = imageUrl !== undefined && failedImageUrl === imageUrl;
  const variants = product.variants || [];
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [cartMessage, setCartMessage] = useState("");
  const selectedVariant = variants.find(
    (variant) => variant._id === selectedVariantId,
  );

  async function handleAddToCart() {
    setCartMessage("");
    try {
      await addItem(product._id, 1, selectedVariantId || undefined);
      setCartMessage("Added to cart");
    } catch (error) {
      setCartMessage(
        error instanceof Error ? error.message : "Could not add item to cart",
      );
    }
  }

  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg">
      <div className="aspect-square overflow-hidden bg-slate-100">
        {imageUrl && !imageFailed ? (
          <img
            src={imageUrl}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            onError={() => setFailedImageUrl(imageUrl)}
          />
        ) : (
          <div
            className="flex h-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500"
            role="img"
            aria-label={`No image available for ${product.name}`}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 48 48"
              className="h-12 w-12"
              fill="none"
            >
              <rect
                x="5"
                y="8"
                width="38"
                height="32"
                rx="4"
                stroke="currentColor"
                strokeWidth="2"
              />
              <circle cx="17" cy="19" r="3" fill="currentColor" />
              <path
                d="m8 35 11-11 7 7 5-5 9 9"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
            <span className="text-sm font-medium">Image unavailable</span>
          </div>
        )}
      </div>

      <div className="flex min-h-32 flex-col p-4">
        {categoryName && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-600">
            {categoryName}
          </p>
        )}
        <h2 className="line-clamp-2 text-base font-semibold leading-snug text-slate-900">
          <Link
            to={`/products/${product._id}`}
            className="hover:text-indigo-700"
          >
            {product.name}
          </Link>
        </h2>
        {variants.length > 0 && (
          <label className="mt-3 text-sm font-medium text-slate-700">
            Choose a variant
            <select
              value={selectedVariantId}
              onChange={(event) => setSelectedVariantId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
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
        <p className="mt-auto pt-4 text-lg font-bold text-slate-900">
          {priceFormatter.format(
            selectedVariant?.effectivePrice ??
              selectedVariant?.price ??
              product.price,
          )}
        </p>
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={
            busy ||
            (variants.length > 0 &&
              (!selectedVariant || selectedVariant.stock <= 0)) ||
            (!variants.length && (product.stock ?? 0) <= 0)
          }
          className="mt-3 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add to cart
        </button>
        {cartMessage && (
          <p
            className={`mt-2 text-sm ${cartMessage === "Added to cart" ? "text-emerald-700" : "text-rose-700"}`}
            role="status"
          >
            {cartMessage}
          </p>
        )}
      </div>
    </article>
  );
}
