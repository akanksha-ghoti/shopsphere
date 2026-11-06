import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import {
  getAllCategories,
  getProducts,
  type Category,
  type PaginationMetadata,
  type Product,
  type ProductSort,
} from "../api/products";
import FilterPanel from "../components/FilterPanel";
import ProductCard from "../components/ProductCard";
import SearchBar from "../components/SearchBar";
import StoreHeader from "../components/StoreHeader";
import { useProductQuery } from "../hooks/useProductQuery";

const PAGE_SIZE = 8;

function getCatalogError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return "We could not connect to the catalog. Check your connection and try again.";
    }

    if (error.response.status === 404) {
      return "The catalog could not be found. Please try again later.";
    }

    if (error.response.status >= 500) {
      return "The catalog is temporarily unavailable. Please try again shortly.";
    }
  }

  return "We could not load the catalog. Please try again.";
}

function ProductSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
      aria-hidden="true"
    >
      <div className="aspect-square animate-pulse bg-slate-200" />
      <div className="space-y-3 p-4">
        <div className="h-3 w-1/3 animate-pulse rounded bg-slate-200" />
        <div className="h-5 w-3/4 animate-pulse rounded bg-slate-200" />
        <div className="h-5 w-1/2 animate-pulse rounded bg-slate-200" />
      </div>
    </div>
  );
}

export default function Products() {
  const { filters, query, updateQuery, clearFilters, clearAll } =
    useProductQuery(PAGE_SIZE);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [productsError, setProductsError] = useState("");
  const [categoriesError, setCategoriesError] = useState("");
  const [productsRetry, setProductsRetry] = useState(0);
  const [categoriesRetry, setCategoriesRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCategories() {
      setLoadingCategories(true);
      setCategoriesError("");

      try {
        const result = await getAllCategories(controller.signal);
        setCategories(result);
      } catch (error) {
        if (!controller.signal.aborted) {
          setCategoriesError(getCatalogError(error));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingCategories(false);
        }
      }
    }

    void loadCategories();

    return () => controller.abort();
  }, [categoriesRetry]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      setLoadingProducts(true);
      setProductsError("");

      try {
        const result = await getProducts(query, controller.signal);

        setProducts(result.data);
        setPagination(result.pagination);
      } catch (error) {
        if (!controller.signal.aborted) {
          setProductsError(getCatalogError(error));
          setProducts([]);
          setPagination(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingProducts(false);
        }
      }
    }

    void loadProducts();

    return () => controller.abort();
  }, [query, productsRetry]);

  const handleSearch = useCallback(
    (q: string) => updateQuery({ q }, { resetPage: true, replace: true }),
    [updateQuery],
  );

  const handleApplyFilters = useCallback(
    (nextFilters: {
      category: string;
      minPrice?: number;
      maxPrice?: number;
      inStock?: boolean;
      sort: ProductSort;
    }) => updateQuery(nextFilters, { resetPage: true }),
    [updateQuery],
  );

  function categoryFor(product: Product): string | undefined {
    if (product.category && typeof product.category === "object") {
      return product.category.name;
    }

    if (typeof product.category === "string") {
      return categories.find((category) => category._id === product.category)
        ?.name;
    }

    return undefined;
  }

  const hasFilters =
    Boolean(filters.q || filters.category) ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined ||
    filters.inStock !== undefined ||
    filters.sort !== "newest";

  return (
    <div className="min-h-screen bg-slate-50 text-left text-slate-800">
      <StoreHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <section className="mb-8 flex flex-col justify-between gap-6 sm:mb-10 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.16em] text-indigo-600">
              Find your next favorite
            </p>
            <h1 className="m-0 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              Explore our products
            </h1>
            <p className="mt-3 text-base text-slate-600">
              Browse the latest picks across the ShopSphere catalog.
            </p>
          </div>

          <SearchBar value={filters.q} onSearch={handleSearch} />
        </section>

        <FilterPanel
          categories={categories}
          filters={filters}
          onApply={handleApplyFilters}
          onClear={clearFilters}
          categoriesLoading={loadingCategories}
        />
        {categoriesError && (
          <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-rose-700">
            <p>{categoriesError}</p>
            <button
              type="button"
              onClick={() => setCategoriesRetry((retry) => retry + 1)}
              className="font-semibold underline underline-offset-2"
            >
              Retry categories
            </button>
          </div>
        )}
        {!loadingCategories && !categoriesError && categories.length === 0 && (
          <p className="mb-6 text-sm text-slate-500">
            No categories are available yet. You can still browse all products.
          </p>
        )}

        <section aria-label="Products">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="m-0 text-xl font-bold text-slate-900">
              {filters.category
                ? categories.find(
                    (category) => category._id === filters.category,
                  )?.name || "Filtered products"
                : "All products"}
            </h2>
            {!loadingProducts && pagination && (
              <p className="text-sm text-slate-500">
                {pagination.total}{" "}
                {pagination.total === 1 ? "product" : "products"}
              </p>
            )}
          </div>

          {productsError ? (
            <div
              className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-10 text-center"
              role="alert"
            >
              <h3 className="text-lg font-bold text-slate-900">
                Products could not be loaded
              </h3>
              <p className="mt-2 text-sm text-slate-600">{productsError}</p>
              <button
                type="button"
                onClick={() => setProductsRetry((retry) => retry + 1)}
                className="mt-5 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                Retry
              </button>
            </div>
          ) : loadingProducts ? (
            <div
              className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              role="status"
              aria-label="Loading products"
            >
              {Array.from({ length: PAGE_SIZE }, (_, index) => (
                <ProductSkeleton key={index} />
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  categoryName={categoryFor(product)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <h3 className="text-lg font-bold text-slate-900">
                {filters.q && filters.category
                  ? "No products match your search in this category"
                  : filters.q
                    ? "No products match your search"
                    : filters.category
                      ? "No products in this category yet"
                      : hasFilters
                        ? "No products match these filters"
                        : "No products available yet"}
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                {hasFilters
                  ? "Try another search or clear your filters."
                  : "Please check back soon for new products."}
              </p>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="mt-5 font-semibold text-indigo-700 hover:text-indigo-900"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

          {!productsError && !loadingProducts && pagination && (
            <nav
              aria-label="Product pagination"
              className="mt-8 flex items-center justify-center gap-4"
            >
              <button
                type="button"
                onClick={() =>
                  updateQuery(
                    { page: Math.max(1, pagination.page - 1) },
                    { resetPage: false },
                  )
                }
                disabled={pagination.page <= 1}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <span
                className="text-sm font-medium text-slate-600"
                aria-live="polite"
              >
                Page {pagination.page} of {Math.max(pagination.totalPages, 1)}
              </span>
              <button
                type="button"
                onClick={() =>
                  updateQuery(
                    {
                      page: Math.min(
                        pagination.totalPages,
                        pagination.page + 1,
                      ),
                    },
                    { resetPage: false },
                  )
                }
                disabled={pagination.page >= pagination.totalPages}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </nav>
          )}
        </section>
      </main>
    </div>
  );
}
