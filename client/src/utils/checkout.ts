import axios from "axios";
import type { CheckoutSession, CheckoutSummary } from "../api/checkout";

export function getCheckoutErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const code = error.response?.data?.code;
    const message = error.response?.data?.message;

    if (code === "INSUFFICIENT_STOCK") {
      return "Some items no longer have enough stock. Update your cart and review the order again.";
    }
    if (code === "PRODUCT_UNAVAILABLE" || code === "PRODUCT_NOT_FOUND") {
      return "A product in your cart is no longer available. Remove it from your cart to continue.";
    }
    if (code === "OPEN_CHECKOUT_SESSION_EXISTS") {
      return "You already have an open checkout session. Please refresh checkout or wait for that session to expire.";
    }
    return message || "Checkout could not be completed. Please try again.";
  }

  return error instanceof Error
    ? error.message
    : "Checkout could not be completed. Please try again.";
}

export function hasSummaryChanged(
  previous: CheckoutSummary,
  latest: CheckoutSession["snapshot"],
) {
  if (
    previous.subtotal !== latest.subtotal ||
    previous.shippingFee !== latest.shippingFee ||
    previous.shipping.fee !== latest.shipping.fee ||
    previous.shipping.freeShippingThreshold !==
      latest.shipping.freeShippingThreshold ||
    previous.shipping.isFree !== latest.shipping.isFree ||
    previous.tax.rate !== latest.tax.rate ||
    previous.tax.amount !== latest.tax.amount ||
    previous.grandTotal !== latest.grandTotal ||
    previous.currency !== latest.currency ||
    previous.items.length !== latest.items.length
  ) {
    return true;
  }

  return previous.items.some((item, index) => {
    const updated = latest.items[index];
    const previousItemId = item._id || item.cartItemId;
    const latestItemId = updated.cartItemId || updated._id;
    const previousProductId = item.product._id || item.product.id;
    const latestProductId = updated.product.id || updated.product._id;
    const previousVariantId = item.variant?._id || item.variant?.id || null;
    const latestVariantId = updated.variant?.id || updated.variant?._id || null;

    return (
      previousItemId !== latestItemId ||
      previousProductId !== latestProductId ||
      previousVariantId !== latestVariantId ||
      item.quantity !== updated.quantity ||
      item.unitPrice !== updated.unitPrice ||
      item.lineTotal !== updated.lineTotal
    );
  });
}

export function summaryFromSession(session: CheckoutSession): CheckoutSummary {
  return {
    items: session.snapshot.items,
    subtotal: session.snapshot.subtotal,
    shippingFee: session.snapshot.shippingFee,
    shipping: session.snapshot.shipping,
    tax: session.snapshot.tax,
    grandTotal: session.snapshot.grandTotal,
    currency: session.snapshot.currency,
  };
}
