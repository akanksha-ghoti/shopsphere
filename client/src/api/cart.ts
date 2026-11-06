import api from "../services/api";

export interface CartItemSummary {
  _id: string;
  product: {
    _id: string;
    name: string;
    slug: string;
    images?: string[];
  };
  variant: {
    _id: string;
    size: string;
    color: string;
    sku: string;
  } | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface CartSummary {
  cart: {
    _id: string;
    items: Array<{
      _id: string;
      product: string;
      variant: string | null;
      quantity: number;
    }>;
  } | null;
  items: CartItemSummary[];
  subtotal: number;
  itemCount: number;
}

interface CartResponse {
  success: boolean;
  message?: string;
  data: CartSummary;
}

export async function getCart(signal?: AbortSignal): Promise<CartSummary> {
  const response = await api.get<CartResponse>("/cart", { signal });
  return response.data.data;
}

export async function addCartItem(input: {
  productId: string;
  variantId?: string;
  quantity: number;
}): Promise<CartSummary> {
  const response = await api.post<CartResponse>("/cart/items", input);
  return response.data.data;
}

export async function updateCartItem(
  itemId: string,
  quantity: number,
): Promise<CartSummary> {
  const response = await api.patch<CartResponse>(
    `/cart/items/${encodeURIComponent(itemId)}`,
    { quantity },
  );
  return response.data.data;
}

export async function removeCartItem(itemId: string): Promise<CartSummary> {
  const response = await api.delete<CartResponse>(
    `/cart/items/${encodeURIComponent(itemId)}`,
  );
  return response.data.data;
}

export async function clearCart(): Promise<CartSummary> {
  const response = await api.delete<CartResponse>("/cart");
  return response.data.data;
}
