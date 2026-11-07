import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { getAddresses, type Address } from "../api/addresses";
import { useAuth } from "../context/AuthContext";
import { selectAddress } from "../utils/addressBook";

interface AddressSelectorProps {
  value?: string;
  onChange: (address: Address | null) => void;
}

function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message ?? "Could not load your addresses.";
  }
  return error instanceof Error
    ? error.message
    : "Could not load your addresses.";
}

export default function AddressSelector({
  value,
  onChange,
}: AddressSelectorProps) {
  const { user, loading: authLoading } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading || !user) return;

    const controller = new AbortController();
    let active = true;

    getAddresses(controller.signal)
      .then((result) => {
        if (!active) return;
        setAddresses(result);
        setError("");
        setLoadedUserId(user.uid);
      })
      .catch((requestError: unknown) => {
        if (active && !axios.isCancel(requestError)) {
          setError(errorMessage(requestError));
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

  const isLoading =
    authLoading || Boolean(user && (loading || loadedUserId !== user.uid));

  useEffect(() => {
    if (isLoading || !user) return;
    const selected = selectAddress(addresses, value);
    if (selected?._id !== value) onChange(selected);
  }, [addresses, isLoading, onChange, user, value]);

  const selectedAddress =
    addresses.find((address) => address._id === value) ?? null;

  if (isLoading) {
    return (
      <div
        className="rounded-xl border border-slate-200 bg-white p-4 text-slate-600"
        role="status"
      >
        Loading saved addresses…
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800"
        role="alert"
      >
        {error}
      </div>
    );
  }

  if (!addresses.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5">
        <p className="text-slate-700">
          {user
            ? "You have no saved delivery addresses."
            : "Sign in to choose a saved delivery address."}
        </p>
        <Link
          to={user ? "/addresses" : "/login"}
          className="mt-3 inline-flex font-semibold text-indigo-700 hover:text-indigo-900"
        >
          {user ? "Add an address" : "Sign in"}
        </Link>
      </div>
    );
  }

  return (
    <fieldset className="space-y-3">
      <legend className="mb-3 text-lg font-bold text-slate-900">
        Delivery address
      </legend>
      {addresses.map((address) => (
        <label
          key={address._id}
          className={`flex cursor-pointer gap-3 rounded-xl border bg-white p-4 transition ${
            value === address._id
              ? "border-indigo-500 ring-2 ring-indigo-100"
              : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <input
            type="radio"
            name="delivery-address"
            value={address._id}
            checked={value === address._id}
            onChange={() => onChange(address)}
            className="mt-1 h-4 w-4 shrink-0 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="min-w-0 text-sm text-slate-700">
            <span className="flex flex-wrap items-center gap-2 font-bold text-slate-900">
              {address.name}
              {address.isDefault && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                  Default
                </span>
              )}
            </span>
            <span className="mt-1 block">{address.phone}</span>
            <span className="mt-1 block">
              {[
                address.street,
                address.addressLine2,
                address.city,
                address.state,
                address.pincode,
              ]
                .filter(Boolean)
                .join(", ")}
            </span>
          </span>
        </label>
      ))}
      {selectedAddress && (
        <p className="sr-only" aria-live="polite">
          {selectedAddress.name} selected for delivery.
        </p>
      )}
      <Link
        to="/addresses"
        className="inline-flex font-semibold text-indigo-700 hover:text-indigo-900"
      >
        Manage addresses
      </Link>
    </fieldset>
  );
}
