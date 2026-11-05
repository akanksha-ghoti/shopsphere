import { useState, type FormEvent } from "react";
import type { Category, ProductSort } from "../api/products";
import type { ProductQueryState } from "../hooks/useProductQuery";

interface FilterPanelProps {
  categories: Category[];
  filters: ProductQueryState;
  onApply: (filters: {
    category: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    sort: ProductSort;
  }) => void;
  onClear: () => void;
  categoriesLoading: boolean;
}

interface FilterDraft {
  category: string;
  minPrice: string;
  maxPrice: string;
  inStock: string;
  sort: ProductSort;
}

function makeDraft(filters: ProductQueryState): FilterDraft {
  return {
    category: filters.category,
    minPrice: filters.minPrice?.toString() || "",
    maxPrice: filters.maxPrice?.toString() || "",
    inStock: filters.inStock === undefined ? "" : String(filters.inStock),
    sort: filters.sort,
  };
}

const fieldClassName =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

export default function FilterPanel({
  categories,
  filters,
  onApply,
  onClear,
  categoriesLoading,
}: FilterPanelProps) {
  const appliedFiltersKey = JSON.stringify([
    filters.category,
    filters.minPrice,
    filters.maxPrice,
    filters.inStock,
    filters.sort,
  ]);
  const [draftState, setDraftState] = useState(() => ({
    key: appliedFiltersKey,
    value: makeDraft(filters),
  }));
  const [errorState, setErrorState] = useState({
    key: appliedFiltersKey,
    message: "",
  });
  const draft =
    draftState.key === appliedFiltersKey
      ? draftState.value
      : makeDraft(filters);
  const error = errorState.key === appliedFiltersKey ? errorState.message : "";

  function updateDraft<Key extends keyof FilterDraft>(
    key: Key,
    value: FilterDraft[Key],
  ) {
    setDraftState({
      key: appliedFiltersKey,
      value: { ...draft, [key]: value },
    });
  }

  function setError(message: string) {
    setErrorState({ key: appliedFiltersKey, message });
  }

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const minPrice = draft.minPrice === "" ? undefined : Number(draft.minPrice);
    const maxPrice = draft.maxPrice === "" ? undefined : Number(draft.maxPrice);

    if (
      (minPrice !== undefined &&
        (!Number.isFinite(minPrice) || minPrice < 0)) ||
      (maxPrice !== undefined && (!Number.isFinite(maxPrice) || maxPrice < 0))
    ) {
      setError("Enter valid non-negative prices.");
      return;
    }

    if (
      minPrice !== undefined &&
      maxPrice !== undefined &&
      minPrice > maxPrice
    ) {
      setError("Minimum price cannot be greater than maximum price.");
      return;
    }

    onApply({
      category: draft.category,
      minPrice,
      maxPrice,
      inStock: draft.inStock === "" ? undefined : draft.inStock === "true",
      sort: draft.sort,
    });
  }

  function clearFilters() {
    setDraftState({
      key: appliedFiltersKey,
      value: {
        category: "",
        minPrice: "",
        maxPrice: "",
        inStock: "",
        sort: "newest",
      },
    });
    setError("");
    onClear();
  }

  return (
    <form
      onSubmit={submitFilters}
      aria-label="Product filters"
      className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-sm font-semibold text-slate-700">
          Category
          <select
            value={draft.category}
            onChange={(event) => updateDraft("category", event.target.value)}
            disabled={categoriesLoading}
            className={fieldClassName}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-semibold text-slate-700">
          Minimum price
          <input
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            value={draft.minPrice}
            onChange={(event) => updateDraft("minPrice", event.target.value)}
            placeholder="No minimum"
            className={fieldClassName}
          />
        </label>

        <label className="text-sm font-semibold text-slate-700">
          Maximum price
          <input
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            value={draft.maxPrice}
            onChange={(event) => updateDraft("maxPrice", event.target.value)}
            placeholder="No maximum"
            className={fieldClassName}
          />
        </label>

        <label className="text-sm font-semibold text-slate-700">
          Availability
          <select
            value={draft.inStock}
            onChange={(event) => updateDraft("inStock", event.target.value)}
            className={fieldClassName}
          >
            <option value="">All products</option>
            <option value="true">In stock</option>
            <option value="false">Out of stock</option>
          </select>
        </label>

        <label className="text-sm font-semibold text-slate-700">
          Sort by
          <select
            value={draft.sort}
            onChange={(event) =>
              updateDraft("sort", event.target.value as ProductSort)
            }
            className={fieldClassName}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="name_asc">Name: A to Z</option>
            <option value="name_desc">Name: Z to A</option>
          </select>
        </label>
      </div>

      {error && (
        <p className="mt-3 text-sm text-rose-700" role="alert">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Apply filters
        </button>
        <button
          type="button"
          onClick={clearFilters}
          className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Clear filters
        </button>
      </div>
    </form>
  );
}
