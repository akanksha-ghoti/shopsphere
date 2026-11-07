import api from "../services/api";

export interface WishlistProduct {
  _id: string;
  name: string;
  slug: string;
  price: number;
  images?: string[];
  stock?: number;
  variants?: Array<{
    _id: string;
    size: string;
    color: string;
    price?: number;
    effectivePrice?: number;
    stock: number;
  }>;
}

export interface WishlistEntry {
  _id: string;
  product: WishlistProduct | null;
  createdAt?: string;
}

interface WishlistResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export async function getWishlist(
  signal?: AbortSignal,
): Promise<WishlistEntry[]> {
  const response = await api.get<WishlistResponse<WishlistEntry[]>>(
    "/wishlist",
    { signal },
  );
  return response.data.data;
}

export async function addWishlistProduct(productId: string): Promise<void> {
  await api.post("/wishlist", { productId });
}

export async function removeWishlistProduct(productId: string): Promise<void> {
  await api.delete(`/wishlist/${encodeURIComponent(productId)}`);
}

export async function moveWishlistProductToCart(
  productId: string,
  variantId?: string,
): Promise<void> {
  await api.post(
    `/wishlist/${encodeURIComponent(productId)}/move-to-cart`,
    variantId ? { variantId } : {},
  );
}
