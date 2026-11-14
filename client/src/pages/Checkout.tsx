import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import {
  createCheckoutSession,
  getCheckoutSummary,
  type CheckoutSession,
  type CheckoutSummary,
} from "../api/checkout";
import type { Address } from "../api/addresses";
import AddressSelector from "../components/AddressSelector";
import OrderSummary from "../components/OrderSummary";
import StoreHeader from "../components/StoreHeader";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import {
  getCheckoutErrorMessage,
  hasSummaryChanged,
  summaryFromSession,
} from "../utils/checkout";

type CheckoutStep = "address" | "review" | "payment";

export default function Checkout() {
  const { user, loading: authLoading } = useAuth();
  const { cart, loading: cartLoading, error: cartError } = useCart();
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [step, setStep] = useState<CheckoutStep>("address");
  const [summary, setSummary] = useState<CheckoutSummary | null>(null);
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [priceChanged, setPriceChanged] = useState(false);

  const handleAddressChange = useCallback((address: Address | null) => {
    setSelectedAddress(address);
    setSummary(null);
    setSession(null);
    setPriceChanged(false);
    setError("");
  }, []);

  async function reviewOrder() {
    if (!selectedAddress || loading || cartLoading) return;

    setLoading(true);
    setError("");
    try {
      const currentSummary = await getCheckoutSummary(selectedAddress._id);
      setSummary(currentSummary);
      setSession(null);
      setPriceChanged(false);
      setStep("review");
    } catch (requestError) {
      setError(getCheckoutErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  async function continueToPayment() {
    if (!selectedAddress || !summary || loading) return;
    if (session) {
      setStep("payment");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const currentSession = await createCheckoutSession(selectedAddress._id);
      const freshSummary = summaryFromSession(currentSession);
      const changed = hasSummaryChanged(summary, freshSummary);
      setSession(currentSession);
      setSummary(freshSummary);
      setPriceChanged(changed);
      if (!changed) setStep("payment");
    } catch (requestError) {
      setError(getCheckoutErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  function goBackToAddress() {
    if (session) return;
    setError("");
    setSummary(null);
    setStep("address");
  }

  const isCartEmpty = Boolean(cart && cart.items.length === 0);
  const isBusy = authLoading || cartLoading || loading;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <StoreHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-indigo-600">
            Secure checkout
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
            Checkout
          </h1>
          <ol
            aria-label="Checkout progress"
            className="mt-6 grid grid-cols-3 gap-2 text-xs font-semibold sm:text-sm"
          >
            {[
              ["address", "1. Delivery address"],
              ["review", "2. Order review"],
              ["payment", "3. Payment"],
            ].map(([stepId, label], index) => {
              const isCurrent = step === stepId;
              const isComplete =
                (step === "review" && index === 0) ||
                (step === "payment" && index < 2);
              return (
                <li
                  key={stepId}
                  aria-current={isCurrent ? "step" : undefined}
                  className={`rounded-lg px-2 py-3 text-center sm:px-4 ${
                    isCurrent
                      ? "bg-indigo-600 text-white"
                      : isComplete
                        ? "bg-indigo-100 text-indigo-800"
                        : "bg-white text-slate-500"
                  }`}
                >
                  {label}
                </li>
              );
            })}
          </ol>
        </div>

        {authLoading ? (
          <div
            className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600"
            role="status"
          >
            Checking your account…
          </div>
        ) : !user ? (
          <section className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
            <h2 className="text-xl font-bold text-slate-950">
              Sign in to check out
            </h2>
            <Link
              to="/login"
              className="mt-5 inline-flex rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700"
            >
              Sign in
            </Link>
          </section>
        ) : cartError && !cart ? (
          <section
            className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900"
            role="alert"
          >
            {cartError}
          </section>
        ) : cartLoading ? (
          <div
            className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600"
            role="status"
          >
            Loading your cart…
          </div>
        ) : isCartEmpty ? (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <h2 className="text-xl font-bold text-slate-950">
              Your cart is empty
            </h2>
            <Link
              to="/products"
              className="mt-5 inline-flex rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700"
            >
              Browse products
            </Link>
          </section>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,0.8fr)] lg:items-start">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              {step === "address" && (
                <>
                  <h2 className="text-xl font-extrabold text-slate-950">
                    Choose a delivery address
                  </h2>
                  <div className="mt-5">
                    <AddressSelector
                      value={selectedAddress?._id}
                      onChange={handleAddressChange}
                    />
                  </div>
                  {error && (
                    <p
                      className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800"
                      role="alert"
                    >
                      {error}
                    </p>
                  )}
                  {cartError && (
                    <p
                      className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
                      role="status"
                    >
                      Cart update notice: {cartError}
                    </p>
                  )}
                  <button
                    type="button"
                    disabled={!selectedAddress || isBusy || isCartEmpty}
                    onClick={() => void reviewOrder()}
                    className="mt-6 w-full rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    {loading ? "Checking prices and stock…" : "Review order"}
                  </button>
                </>
              )}

              {step === "review" && (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-extrabold text-slate-950">
                        Delivery address
                      </h2>
                      <p className="mt-2 font-semibold text-slate-900">
                        {selectedAddress?.name}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">
                        {selectedAddress?.street}
                        {selectedAddress?.addressLine2
                          ? `, ${selectedAddress.addressLine2}`
                          : ""}
                        {selectedAddress &&
                          `, ${selectedAddress.city}, ${selectedAddress.state} ${selectedAddress.pincode}`}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {selectedAddress?.phone}
                      </p>
                    </div>
                    {!session && (
                      <button
                        type="button"
                        onClick={goBackToAddress}
                        className="text-sm font-semibold text-indigo-700 hover:text-indigo-900"
                      >
                        Change
                      </button>
                    )}
                  </div>
                  {priceChanged && (
                    <p
                      className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
                      role="status"
                    >
                      Prices, quantities, or availability changed. Review the
                      updated order totals before continuing.
                    </p>
                  )}
                  {error && (
                    <p
                      className="mt-5 rounded-lg bg-rose-50 p-3 text-sm text-rose-800"
                      role="alert"
                    >
                      {error}
                    </p>
                  )}
                  <button
                    type="button"
                    disabled={!selectedAddress || !summary || isBusy}
                    onClick={() => void continueToPayment()}
                    className="mt-6 w-full rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading
                      ? "Securing your checkout…"
                      : "Continue to payment"}
                  </button>
                </>
              )}

              {step === "payment" && session && (
                <div>
                  <h2 className="text-xl font-extrabold text-slate-950">
                    Checkout session ready
                  </h2>
                  <p className="mt-3 text-slate-600">
                    Your order and current prices have been secured for this
                    checkout session.
                  </p>
                  <dl className="mt-5 rounded-xl bg-slate-50 p-4 text-sm">
                    <div className="flex flex-wrap justify-between gap-2">
                      <dt className="text-slate-600">Session</dt>
                      <dd className="font-mono text-slate-900">
                        {session.sessionId}
                      </dd>
                    </div>
                    <div className="mt-3 flex flex-wrap justify-between gap-2">
                      <dt className="text-slate-600">Expires</dt>
                      <dd className="font-medium text-slate-900">
                        {new Date(session.expiresAt).toLocaleString("en-IN")}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    Payment processing is not configured yet. Your checkout
                    session is ready, but no payment has been taken.
                  </p>
                </div>
              )}
            </section>

            <div className="lg:sticky lg:top-6">
              {step === "address" ? (
                <OrderSummary summary={null} loading={loading} />
              ) : (
                <OrderSummary summary={summary} loading={loading && !summary} />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
