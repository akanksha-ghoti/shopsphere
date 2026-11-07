import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  createAddress,
  deleteAddress,
  getAddresses,
  setDefaultAddress,
  updateAddress,
  type Address,
  type AddressInput,
} from "../api/addresses";
import AddressForm from "../components/AddressForm";
import StoreHeader from "../components/StoreHeader";
import { useAuth } from "../context/AuthContext";
import {
  addAddress,
  applyDefaultAddress,
  removeAddress as removeAddressFromList,
  replaceAddress,
} from "../utils/addressBook";

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.message ||
      "We could not update your addresses. Please try again."
    );
  }
  return error instanceof Error
    ? error.message
    : "We could not update your addresses. Please try again.";
}

function AddressCard({
  address,
  busy,
  onEdit,
  onDelete,
  onSetDefault,
}: {
  address: Address;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-950">{address.name}</h2>
          <p className="mt-1 text-sm font-medium text-slate-700">
            {address.phone}
          </p>
        </div>
        {address.isDefault && (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
            Default
          </span>
        )}
      </div>
      <address className="mt-4 flex-1 not-italic leading-relaxed text-slate-600">
        {address.street}
        {address.addressLine2 && <>, {address.addressLine2}</>}
        <br />
        {address.city}, {address.state} {address.pincode}
      </address>
      <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        {!address.isDefault && (
          <button
            type="button"
            disabled={busy}
            onClick={onSetDefault}
            className="rounded-lg border border-indigo-200 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
          >
            Set as default
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={onEdit}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Edit
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onDelete}
          className="rounded-lg px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </article>
  );
}

export default function Addresses() {
  const { user, loading: authLoading } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyAddressId, setBusyAddressId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formAddress, setFormAddress] = useState<Address | null | undefined>(
    undefined,
  );

  const refreshAddresses = useCallback(async (signal?: AbortSignal) => {
    const result = await getAddresses(signal);
    setAddresses(result);
    return result;
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    if (authLoading) {
      return () => controller.abort();
    }

    if (!user) {
      return () => controller.abort();
    }

    getAddresses(controller.signal)
      .then((result) => {
        if (active) {
          setAddresses(result);
          setLoadedUserId(user.uid);
          setError("");
        }
      })
      .catch((requestError: unknown) => {
        if (active && !axios.isCancel(requestError)) {
          setError(getErrorMessage(requestError));
          setLoadedUserId(user.uid);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [authLoading, user]);

  async function submitAddress(input: AddressInput) {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      if (formAddress) {
        const updated = await updateAddress(formAddress._id, input);
        setAddresses((current) => replaceAddress(current, updated));
        setNotice("Address updated.");
      } else {
        const created = await createAddress(input);
        setAddresses((current) => addAddress(current, created));
        setNotice("Address added.");
      }
      setFormAddress(undefined);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      throw new Error(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function handleSetDefault(address: Address) {
    setBusyAddressId(address._id);
    setError("");
    setNotice("");
    try {
      const updated = await setDefaultAddress(address._id);
      setAddresses((current) => applyDefaultAddress(current, updated));
      setNotice("Default address updated.");
    } catch (requestError) {
      try {
        await refreshAddresses();
        setError(getErrorMessage(requestError));
      } catch (refreshError) {
        setError(
          `${getErrorMessage(requestError)} Saved addresses could not be refreshed: ${getErrorMessage(refreshError)}`,
        );
      }
    } finally {
      setBusyAddressId(null);
    }
  }

  async function handleDelete(address: Address) {
    const confirmed = window.confirm(
      `Delete the address for ${address.name} at ${address.street}?`,
    );
    if (!confirmed) return;

    setBusyAddressId(address._id);
    setError("");
    setNotice("");
    try {
      await deleteAddress(address._id);
      setAddresses((current) => removeAddressFromList(current, address._id));
      setNotice("Address deleted.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusyAddressId(null);
    }
  }

  const isLoadedForUser = Boolean(user && loadedUserId === user.uid);
  const userAddresses = isLoadedForUser ? addresses : [];
  const pageLoading =
    authLoading || Boolean(user && (loading || !isLoadedForUser));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <StoreHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-indigo-600">
              Your delivery details
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
              Address book
            </h1>
          </div>
          <Link
            to="/products"
            className="font-semibold text-indigo-700 hover:text-indigo-900"
          >
            Continue shopping
          </Link>
        </div>

        {pageLoading ? (
          <div
            className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600"
            role="status"
          >
            Loading your addresses…
          </div>
        ) : !user ? (
          <section className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center">
            <h2 className="text-xl font-bold text-slate-900">
              Sign in to manage your addresses
            </h2>
            <p className="mt-2 text-slate-600">
              Your saved delivery details are private to your account.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-flex rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700"
            >
              Sign in
            </Link>
          </section>
        ) : error && userAddresses.length === 0 ? (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-10 text-center">
            <p className="text-rose-800" role="alert">
              {error}
            </p>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                void refreshAddresses()
                  .then(() => {
                    setLoadedUserId(user.uid);
                    setError("");
                  })
                  .catch((requestError: unknown) =>
                    setError(getErrorMessage(requestError)),
                  )
                  .finally(() => setLoading(false));
              }}
              className="mt-5 rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-700"
            >
              Try again
            </button>
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
            {notice && (
              <p
                className="mb-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"
                role="status"
              >
                {notice}
              </p>
            )}

            {formAddress !== undefined ? (
              <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <h2 className="mb-5 text-xl font-bold text-slate-950">
                  {formAddress ? "Edit address" : "Add a new address"}
                </h2>
                <AddressForm
                  key={formAddress?._id ?? "new-address"}
                  address={formAddress ?? undefined}
                  submitting={saving}
                  onSubmit={submitAddress}
                  onCancel={() => setFormAddress(undefined)}
                />
              </section>
            ) : userAddresses.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setNotice("");
                  setFormAddress(null);
                }}
                className="mb-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white hover:bg-indigo-700"
              >
                <span aria-hidden="true" className="text-lg leading-none">
                  +
                </span>
                Add an address
              </button>
            ) : null}

            {userAddresses.length === 0 && formAddress === undefined ? (
              <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
                <h2 className="text-xl font-bold text-slate-900">
                  No saved addresses yet
                </h2>
                <p className="mt-2 text-slate-600">
                  Add a delivery address to make checkout easier.
                </p>
                <button
                  type="button"
                  onClick={() => setFormAddress(null)}
                  className="mt-6 rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700"
                >
                  Add your first address
                </button>
              </section>
            ) : (
              <section
                aria-label="Saved addresses"
                className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
              >
                {userAddresses.map((address) => (
                  <AddressCard
                    key={address._id}
                    address={address}
                    busy={saving || busyAddressId !== null}
                    onEdit={() => {
                      setError("");
                      setNotice("");
                      setFormAddress(address);
                    }}
                    onDelete={() => void handleDelete(address)}
                    onSetDefault={() => void handleSetDefault(address)}
                  />
                ))}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
