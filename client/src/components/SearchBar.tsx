import { useEffect, useState, type FormEvent } from "react";

interface SearchBarProps {
  value: string;
  onSearch: (query: string) => void;
}

const SEARCH_DEBOUNCE_MS = 400;

export default function SearchBar({ value, onSearch }: SearchBarProps) {
  const [input, setInput] = useState({ sourceValue: value, draft: value });
  const draft = input.sourceValue === value ? input.draft : value;

  useEffect(() => {
    if (draft.trim() === value) {
      return;
    }

    const timer = window.setTimeout(
      () => onSearch(draft.trim()),
      SEARCH_DEBOUNCE_MS,
    );

    return () => window.clearTimeout(timer);
  }, [draft, onSearch, value]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch(draft.trim());
  }

  function clearSearch() {
    setInput({ sourceValue: value, draft: "" });
    onSearch("");
  }

  return (
    <form
      onSubmit={submitSearch}
      role="search"
      className="flex w-full max-w-xl items-center gap-2 rounded-xl border border-slate-300 bg-white p-2 shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100"
    >
      <label htmlFor="product-search" className="sr-only">
        Search products
      </label>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="ml-2 h-5 w-5 shrink-0 text-slate-400"
        fill="none"
      >
        <circle
          cx="10.8"
          cy="10.8"
          r="6.8"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="m16 16 4 4"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
      </svg>
      <input
        id="product-search"
        type="search"
        maxLength={200}
        value={draft}
        onChange={(event) =>
          setInput({ sourceValue: value, draft: event.target.value })
        }
        placeholder="Search products"
        className="min-w-0 flex-1 border-0 bg-transparent px-2 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
      />
      {draft && (
        <button
          type="button"
          onClick={clearSearch}
          aria-label="Clear search"
          className="rounded-lg px-2 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Clear
        </button>
      )}
      <button
        type="submit"
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        Search
      </button>
    </form>
  );
}
