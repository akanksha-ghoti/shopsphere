import { useState, type FormEvent } from "react";
import type { Address, AddressInput } from "../api/addresses";
import {
  validateAddress,
  type AddressFormValues,
} from "../utils/addressValidation";

interface AddressFormProps {
  address?: Address;
  submitting?: boolean;
  onSubmit: (address: AddressInput) => Promise<void>;
  onCancel?: () => void;
}

function toFormValues(address?: Address): AddressFormValues {
  return {
    name: address?.name ?? "",
    phone: address?.phone ?? "",
    street: address?.street ?? "",
    addressLine2: address?.addressLine2 ?? "",
    city: address?.city ?? "",
    state: address?.state ?? "",
    pincode: address?.pincode ?? "",
    isDefault: address?.isDefault ?? false,
  };
}

const inputClassName =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

export default function AddressForm({
  address,
  submitting = false,
  onSubmit,
  onCancel,
}: AddressFormProps) {
  const [values, setValues] = useState(() => toFormValues(address));
  const [touched, setTouched] = useState<
    Partial<Record<keyof AddressFormValues, boolean>>
  >({});
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const errors = validateAddress(values);

  function updateField<K extends keyof AddressFormValues>(
    field: K,
    value: AddressFormValues[K],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setSubmitError("");
    if (Object.keys(errors).length) return;

    try {
      await onSubmit({
        ...values,
        name: values.name.trim(),
        phone: values.phone.trim(),
        street: values.street.trim(),
        addressLine2: values.addressLine2.trim() || undefined,
        city: values.city.trim(),
        state: values.state.trim(),
        pincode: values.pincode.trim(),
      });
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Could not save this address.",
      );
    }
  }

  function fieldError(field: keyof AddressFormValues) {
    return (touched[field] || submitted) && errors[field]
      ? errors[field]
      : undefined;
  }

  function input(
    field: keyof AddressFormValues,
    label: string,
    options: {
      autoComplete?: string;
      inputMode?: "numeric" | "text" | "tel";
      maxLength?: number;
      required?: boolean;
      type?: string;
    } = {},
  ) {
    const error = fieldError(field);
    return (
      <div>
        <label
          htmlFor={`address-${field}`}
          className="block text-sm font-semibold text-slate-700"
        >
          {label}
          {options.required && <span aria-hidden="true"> *</span>}
        </label>
        <input
          id={`address-${field}`}
          name={field}
          type={options.type ?? "text"}
          value={String(values[field])}
          onChange={(event) => updateField(field, event.target.value)}
          onBlur={() =>
            setTouched((current) => ({ ...current, [field]: true }))
          }
          autoComplete={options.autoComplete}
          inputMode={options.inputMode}
          maxLength={options.maxLength}
          required={options.required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `address-${field}-error` : undefined}
          className={`${inputClassName} ${error ? "border-rose-500 focus:border-rose-500 focus:ring-rose-100" : ""}`}
        />
        {error && (
          <p
            id={`address-${field}-error`}
            className="mt-1 text-sm text-rose-700"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      noValidate
      className="space-y-5"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {input("name", "Recipient name", {
          autoComplete: "name",
          required: true,
        })}
        {input("phone", "10-digit mobile number", {
          autoComplete: "tel",
          inputMode: "tel",
          maxLength: 10,
          required: true,
        })}
        <div className="sm:col-span-2">
          {input("street", "Street address", {
            autoComplete: "street-address",
            required: true,
          })}
        </div>
        <div className="sm:col-span-2">
          {input("addressLine2", "Apartment, suite, landmark (optional)", {
            autoComplete: "address-line2",
          })}
        </div>
        {input("city", "City", {
          autoComplete: "address-level2",
          required: true,
        })}
        {input("state", "State", {
          autoComplete: "address-level1",
          required: true,
        })}
        {input("pincode", "6-digit PIN code", {
          autoComplete: "postal-code",
          inputMode: "numeric",
          maxLength: 6,
          required: true,
        })}
      </div>

      <label className="flex items-start gap-3 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          checked={values.isDefault}
          onChange={(event) => updateField("isDefault", event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        Set as my default address
      </label>

      {submitError && (
        <p
          className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800"
          role="alert"
        >
          {submitError}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-lg border border-slate-300 px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
        >
          {submitting ? "Saving…" : address ? "Save changes" : "Add address"}
        </button>
      </div>
    </form>
  );
}
