import axios from "axios";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  addCartItem,
  clearCart,
  getCart,
  removeCartItem,
  updateCartItem,
  type CartSummary,
} from "../api/cart";
import { useAuth } from "./AuthContext";

interface CartContextValue {
  cart: CartSummary | null;
  loading: boolean;
  busy: boolean;
  error: string;
  refreshCart: () => Promise<void>;
  addItem: (
    productId: string,
    quantity?: number,
    variantId?: string,
  ) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clear: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.message ||
      "We could not update your cart. Please try again."
    );
  }
  return error instanceof Error
    ? error.message
    : "We could not update your cart. Please try again.";
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [cartState, setCartState] = useState<{
    userId: string;
    value: CartSummary;
  } | null>(null);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorState, setErrorState] = useState<{
    userId: string;
    message: string;
  } | null>(null);
  const cart = user && cartState?.userId === user.uid ? cartState.value : null;
  const error =
    user && errorState?.userId === user.uid ? errorState.message : "";
  const loading = authLoading || Boolean(user && loadedUserId !== user.uid);

  const refreshCart = useCallback(async () => {
    if (!user) {
      return;
    }

    try {
      const result = await getCart();
      setCartState({ userId: user.uid, value: result });
      setErrorState({ userId: user.uid, message: "" });
    } catch (requestError) {
      setErrorState({
        userId: user.uid,
        message: getErrorMessage(requestError),
      });
      throw requestError;
    }
  }, [user]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    if (authLoading) {
      return () => controller.abort();
    }

    if (!user) {
      return () => controller.abort();
    }

    getCart(controller.signal)
      .then((result) => {
        if (active) setCartState({ userId: user.uid, value: result });
      })
      .catch((requestError: unknown) => {
        if (active && !axios.isCancel(requestError)) {
          setErrorState({
            userId: user.uid,
            message: getErrorMessage(requestError),
          });
        }
      })
      .finally(() => {
        if (active) setLoadedUserId(user.uid);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [authLoading, user]);

  const perform = useCallback(
    async (operation: () => Promise<CartSummary>) => {
      if (!user) {
        throw new Error("Sign in to manage your cart.");
      }

      setBusy(true);
      try {
        const result = await operation();
        setCartState({ userId: user.uid, value: result });
        setErrorState({ userId: user.uid, message: "" });
      } catch (operationError) {
        setErrorState({
          userId: user.uid,
          message: getErrorMessage(operationError),
        });
        throw operationError;
      } finally {
        setBusy(false);
      }
    },
    [user],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      loading,
      busy,
      error,
      refreshCart,
      addItem: (productId, quantity = 1, variantId) =>
        perform(() => addCartItem({ productId, quantity, variantId })),
      updateQuantity: (itemId, quantity) =>
        perform(() => updateCartItem(itemId, quantity)),
      removeItem: (itemId) => perform(() => removeCartItem(itemId)),
      clear: () => perform(clearCart),
    }),
    [busy, cart, error, loading, perform, refreshCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return context;
}
