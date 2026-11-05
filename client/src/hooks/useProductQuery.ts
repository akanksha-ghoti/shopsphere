import { useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { ProductQuery, ProductSort } from "../api/products";

const SORT_OPTIONS: ProductSort[] = [
  "price_asc",
  "price_desc",
  "newest",
  "oldest",
  "name_asc",
  "name_desc",
];

const FILTER_KEYS = new Set([
  "q",
  "category",
  "minPrice",
  "maxPrice",
  "inStock",
  "sort",
]);

export interface ProductQueryState {
  q: string;
  category: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort: ProductSort;
  page: number;
  limit: number;
}

export type ProductQueryUpdates = Partial<
  Pick<
    ProductQueryState,
    "q" | "category" | "minPrice" | "maxPrice" | "inStock" | "sort" | "page"
  >
>;

interface UpdateOptions {
  replace?: boolean;
  resetPage?: boolean;
}

function readPrice(params: URLSearchParams, key: "minPrice" | "maxPrice") {
  const value = params.get(key);

  if (value === null || value.trim() === "") {
    return undefined;
  }

  const price = Number(value);
  return Number.isFinite(price) && price >= 0 ? price : undefined;
}

export function useProductQuery(defaultLimit: number) {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const normalized = new URLSearchParams(searchParams);

    for (const key of [
      "q",
      "search",
      "category",
      "minPrice",
      "maxPrice",
      "inStock",
      "sort",
      "page",
      "limit",
    ]) {
      if (normalized.getAll(key).length > 1) {
        normalized.delete(key);
      }
    }

    const q = normalized.get("q");
    const legacySearch = normalized.get("search");
    const searchValue = q ?? legacySearch;
    if (searchValue !== null) {
      if (!searchValue.trim() || searchValue.trim().length > 200) {
        normalized.delete("q");
        normalized.delete("search");
      } else {
        normalized.set("q", searchValue.trim());
        normalized.delete("search");
      }
    }

    const category = normalized.get("category");
    if (category !== null && !/^[0-9a-fA-F]{24}$/.test(category)) {
      normalized.delete("category");
    }

    for (const key of ["minPrice", "maxPrice"] as const) {
      const value = normalized.get(key);
      if (value !== null) {
        const price = Number(value);
        if (
          !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value) ||
          !Number.isFinite(price) ||
          price < 0
        ) {
          normalized.delete(key);
        }
      }
    }

    const minPrice = readPrice(normalized, "minPrice");
    const maxPrice = readPrice(normalized, "maxPrice");
    if (
      minPrice !== undefined &&
      maxPrice !== undefined &&
      minPrice > maxPrice
    ) {
      normalized.delete("minPrice");
      normalized.delete("maxPrice");
    }

    const inStock = normalized.get("inStock");
    if (inStock !== null && inStock !== "true" && inStock !== "false") {
      normalized.delete("inStock");
    }

    const sort = normalized.get("sort");
    if (
      sort === "newest" ||
      (sort !== null && !SORT_OPTIONS.some((option) => option === sort))
    ) {
      normalized.delete("sort");
    }

    const page = normalized.get("page");
    if (
      page !== null &&
      (!/^[1-9]\d*$/.test(page) ||
        !Number.isSafeInteger(Number(page)) ||
        Number(page) === 1)
    ) {
      normalized.delete("page");
    }

    const limit = normalized.get("limit");
    if (
      limit !== null &&
      (!/^[1-9]\d*$/.test(limit) ||
        !Number.isSafeInteger(Number(limit)) ||
        Number(limit) > 100)
    ) {
      normalized.delete("limit");
    } else if (limit === String(defaultLimit)) {
      normalized.delete("limit");
    }

    if (normalized.toString() !== searchParams.toString()) {
      setSearchParams(normalized, { replace: true });
    }
  }, [defaultLimit, searchParams, setSearchParams]);

  const filters = useMemo<ProductQueryState>(() => {
    const rawPage = Number(searchParams.get("page"));
    const inStockParam = searchParams.get("inStock");
    const sortParam = searchParams.get("sort");

    return {
      q: (searchParams.get("q") || searchParams.get("search"))?.trim() || "",
      category: searchParams.get("category") || "",
      minPrice: readPrice(searchParams, "minPrice"),
      maxPrice: readPrice(searchParams, "maxPrice"),
      inStock:
        inStockParam === "true"
          ? true
          : inStockParam === "false"
            ? false
            : undefined,
      sort: SORT_OPTIONS.find((option) => option === sortParam) || "newest",
      page: Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1,
      limit: (() => {
        const rawLimit = Number(searchParams.get("limit"));
        return Number.isInteger(rawLimit) && rawLimit >= 1 && rawLimit <= 100
          ? rawLimit
          : defaultLimit;
      })(),
    };
  }, [defaultLimit, searchParams]);

  const query = useMemo<ProductQuery>(
    () => ({
      page: filters.page,
      limit: filters.limit,
      ...(filters.q ? { q: filters.q } : {}),
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.minPrice !== undefined ? { minPrice: filters.minPrice } : {}),
      ...(filters.maxPrice !== undefined ? { maxPrice: filters.maxPrice } : {}),
      ...(filters.inStock !== undefined ? { inStock: filters.inStock } : {}),
      ...(filters.sort !== "newest" ? { sort: filters.sort } : {}),
    }),
    [
      filters.page,
      filters.limit,
      filters.q,
      filters.category,
      filters.minPrice,
      filters.maxPrice,
      filters.inStock,
      filters.sort,
    ],
  );

  const updateQuery = useCallback(
    (updates: ProductQueryUpdates, options: UpdateOptions = {}) => {
      const updatedKeys = Object.keys(updates);
      const shouldResetPage =
        options.resetPage ?? updatedKeys.some((key) => FILTER_KEYS.has(key));

      setSearchParams(
        (currentParams) => {
          const nextParams = new URLSearchParams(currentParams);

          for (const [key, value] of Object.entries(updates)) {
            if (
              value === undefined ||
              value === "" ||
              (key === "page" && value === 1) ||
              (key === "sort" && value === "newest")
            ) {
              nextParams.delete(key);
            } else {
              nextParams.set(key, String(value));
            }
          }

          if (Object.hasOwn(updates, "q")) {
            nextParams.delete("search");
          }

          if (shouldResetPage && !Object.hasOwn(updates, "page")) {
            nextParams.delete("page");
          }

          return nextParams;
        },
        { replace: options.replace ?? false },
      );
    },
    [setSearchParams],
  );

  const clearFilters = useCallback(
    () =>
      updateQuery(
        {
          category: "",
          minPrice: undefined,
          maxPrice: undefined,
          inStock: undefined,
          sort: "newest",
        },
        { resetPage: true },
      ),
    [updateQuery],
  );

  const clearAll = useCallback(
    () =>
      updateQuery(
        {
          q: "",
          category: "",
          minPrice: undefined,
          maxPrice: undefined,
          inStock: undefined,
          sort: "newest",
        },
        { resetPage: true },
      ),
    [updateQuery],
  );

  return { filters, query, updateQuery, clearFilters, clearAll };
}
