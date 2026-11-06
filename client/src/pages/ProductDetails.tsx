import axios from "axios";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getProduct, type Product } from "../api/products";
import StoreHeader from "../components/StoreHeader";
import { useCart } from "../context/CartContext";

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export default function ProductDetails() {
  const { id = "" } = useParams();
  const { addItem, busy } = useCart();
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [productState, setProductState] = useState<{
    id: string;
    product: Product | null;
    error: string;
  } | null>(null);
  const [cartMessage, setCartMessage] = useState("");
  const loading = productState?.id !== id;
  const product = productState?.id === id ? productState.product : null;
  const error = productState?.id === id ? productState.error : "";

  useEffect(() => {
    const controller = new AbortController();

    getProduct(id, controller.signal)
      .then((response) =>
        setProductState({ id, product: response.data, error: "" }),
      )
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setProductState({
            id,
            product: null,
            error:
              axios.isAxiosError(requestError) &&
              requestError.response?.status === 404
                ? "This product could not be found."
                : "We could not load this product. Please try again.",
          });
        }
      });

    return () => controller.abort();
  }, [id]);

  const variant = product?.variants?.find(
    (item) => item._id === selectedVariantId,
  );

  async function handleAdd() {
    if (!product) return;
    setCartMessage("");
    try {
      await addItem(product._id, 1, selectedVariantId || undefined);
      setCartMessage("Added to cart");
    } catch (requestError) {
      setCartMessage(
        requestError instanceof Error
          ? requestError.message
          : "Could not add item to cart",
      );
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <StoreHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <Link
          to="/products"
          className="font-semibold text-indigo-700 hover:text-indigo-900"
        >
          ← Back to products
        </Link>
        {loading ? (
          <p
            className="mt-8 rounded-2xl bg-white p-8 text-center"
            role="status"
          >
            Loading product…
          </p>
        ) : error || !product ? (
          <p
            className="mt-8 rounded-2xl bg-rose-50 p-8 text-center text-rose-800"
            role="alert"
          >
            {error || "Product unavailable."}
          </p>
        ) : (
          <article className="mt-6 grid gap-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 md:grid-cols-2">
            {product.images?.[0] ? (
              <img
                src={product.images[0]}
                alt={product.name}
                className="aspect-square w-full rounded-xl bg-slate-100 object-cover"
              />
            ) : (
              <div className="flex aspect-square items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                No image available
              </div>
            )}
            <div className="flex flex-col">
              <h1 className="text-3xl font-extrabold text-slate-950">
                {product.name}
              </h1>
              <p className="mt-4 whitespace-pre-line text-slate-600">
                {product.description}
              </p>
              {product.variants?.length ? (
                <label className="mt-6 text-sm font-semibold text-slate-700">
                  Variant
                  <select
                    value={selectedVariantId}
                    onChange={(event) =>
                      setSelectedVariantId(event.target.value)
                    }
                    className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-3"
                  >
                    <option value="">Select size and colour</option>
                    {product.variants.map((item) => (
                      <option
                        key={item._id}
                        value={item._id}
                        disabled={item.stock <= 0}
                      >
                        {item.size} / {item.color}
                        {item.stock <= 0 ? " - Out of stock" : ""}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <p className="mt-6 text-2xl font-extrabold text-slate-900">
                {money.format(
                  variant?.effectivePrice ?? variant?.price ?? product.price,
                )}
              </p>
              <button
                type="button"
                onClick={handleAdd}
                disabled={
                  busy ||
                  (Boolean(product.variants?.length) &&
                    (!variant || variant.stock <= 0)) ||
                  (!product.variants?.length && (product.stock ?? 0) <= 0)
                }
                className="mt-5 rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add to cart
              </button>
              {cartMessage && (
                <p className="mt-3 text-sm text-slate-700" role="status">
                  {cartMessage}
                </p>
              )}
            </div>
          </article>
        )}
      </main>
    </div>
  );
}
