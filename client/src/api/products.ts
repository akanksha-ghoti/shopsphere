import api from "../services/api";

export interface Category {
  _id: string;
  name: string;
  slug: string;
}

export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  stock?: number;
  images?: (string | null)[] | null;
  category?: Category | string | null;
  variants?: ProductVariant[];
}

export interface ProductVariant {
  _id: string;
  size: string;
  color: string;
  sku: string;
  price?: number;
  effectivePrice?: number;
  stock: number;
}

export interface PaginationMetadata {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  pagination?: PaginationMetadata;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination: PaginationMetadata;
}

export type ProductSort =
  "price_asc" | "price_desc" | "newest" | "oldest" | "name_asc" | "name_desc";

export interface ProductQuery {
  page: number;
  limit: number;
  q?: string;
  /** @deprecated Use q for new product search requests. */
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort?: ProductSort;
}

export async function getProducts(
  query: ProductQuery,
  signal?: AbortSignal,
): Promise<PaginatedResponse<Product[]>> {
  const response = await api.get<PaginatedResponse<Product[]>>("/products", {
    params: query,
    signal,
  });

  return response.data;
}

export async function getProduct(
  id: string,
  signal?: AbortSignal,
): Promise<ApiResponse<Product>> {
  const response = await api.get<ApiResponse<Product>>(
    `/products/${encodeURIComponent(id)}`,
    { signal },
  );

  return response.data;
}

export async function getCategories(
  page: number,
  signal?: AbortSignal,
): Promise<PaginatedResponse<Category[]>> {
  const response = await api.get<PaginatedResponse<Category[]>>("/categories", {
    params: { page, limit: 100 },
    signal,
  });

  return response.data;
}

export async function getAllCategories(
  signal?: AbortSignal,
): Promise<Category[]> {
  const firstPage = await getCategories(1, signal);
  const categories = [...firstPage.data];

  for (let page = 2; page <= firstPage.pagination.totalPages; page += 1) {
    const response = await getCategories(page, signal);
    categories.push(...response.data);
  }

  return categories;
}
