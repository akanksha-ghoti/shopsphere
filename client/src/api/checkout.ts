import api from "../services/api";

export interface CheckoutItemSummary {
  _id?: string;
  cartItemId?: string;
  product: {
    _id?: string;
    id?: string;
    name: string;
    slug: string;
    images: string[];
  };
  variant: {
    _id?: string;
    id?: string;
    size: string;
    color: string;
    sku: string;
  } | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface CheckoutSummary {
  items: CheckoutItemSummary[];
  subtotal: number;
  shippingFee: number;
  shipping: {
    fee: number;
    freeShippingThreshold: number;
    isFree: boolean;
  };
  tax: {
    rate: number;
    amount: number;
  };
  grandTotal: number;
  currency: "INR";
}

export interface CheckoutSession {
  sessionId: string;
  expiresAt: string;
  snapshot: {
    items: CheckoutItemSummary[];
    subtotal: number;
    shippingFee: number;
    shipping: CheckoutSummary["shipping"];
    tax: CheckoutSummary["tax"];
    grandTotal: number;
    currency: "INR";
  };
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export async function getCheckoutSummary(
  addressId: string,
): Promise<CheckoutSummary> {
  const response = await api.post<ApiResponse<CheckoutSummary>>(
    "/checkout/summary",
    { addressId },
  );
  return response.data.data;
}

export async function createCheckoutSession(
  addressId: string,
): Promise<CheckoutSession> {
  const response = await api.post<ApiResponse<CheckoutSession>>(
    "/checkout/sessions",
    { addressId },
  );
  return response.data.data;
}
