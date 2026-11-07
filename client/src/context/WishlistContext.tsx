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
  addWishlistProduct,
  getWishlist,
  moveWishlistProductToCart,
  removeWishlistProduct,
  type WishlistEntry,
} from "../api/wishlist";
import { useCart } from "./CartContext";
import { useAuth } from "./AuthContext";

interface WishlistContextValue {
  entries: WishlistEntry[];
  loading: boolean;
  busyProductId: string | null;
  error: string;
  isSaved: (productId: string) => boolean;
  toggleProduct: (productId: string) => Promise<void>;
  removeProduct: (productId: string) => Promise<void>;
  moveToCart: (productId: string, variantId?: string) => Promise<void>;
  refreshWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextValue | undefined>(
  undefined,
);

function removeWishlistEntry(
  current: { userId: string; entries: WishlistEntry[] } | null,
  userId: string,
  productId: string,
) {
  if (!current || current.userId !== userId) return current;
  return {
    ...current,
    entries: current.entries.filter(
      (entry) => entry.product?._id !== productId,
    ),
  };
}

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.message ||
      "We could not update your wishlist. Please try again."
    );
  }
  return error instanceof Error
    ? error.message
    : "We could not update your wishlist. Please try again.";
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { refreshCart } = useCart();
  const [wishlistState, setWishlistState] = useState<{
    userId: string;
    entries: WishlistEntry[];
  } | null>(null);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const [errorState, setErrorState] = useState<{
    userId: string;
    message: string;
  } | null>(null);

  const entries = useMemo(
    () =>
      user && wishlistState?.userId === user.uid ? wishlistState.entries : [],
    [user, wishlistState],
  );
  const loading = authLoading || Boolean(user && loadedUserId !== user.uid);
  const error =
    user && errorState?.userId === user.uid ? errorState.message : "";

  const refreshWishlist = useCallback(async () => {
    if (!user) return;
    try {
      const result = await getWishlist();
      setWishlistState({ userId: user.uid, entries: result });
      setErrorState({ userId: user.uid, message: "" });
      setLoadedUserId(user.uid);
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
    if (authLoading || !user) return () => controller.abort();

    getWishlist(controller.signal)
      .then((result) => {
        if (active) setWishlistState({ userId: user.uid, entries: result });
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
    async (productId: string, operation: () => Promise<void>) => {
      if (!user) throw new Error("Sign in to manage your wishlist.");
      setBusyProductId(productId);
      try {
        await operation();
        setErrorState({ userId: user.uid, message: "" });
      } catch (requestError) {
        setErrorState({
          userId: user.uid,
          message: getErrorMessage(requestError),
        });
        throw requestError;
      } finally {
        setBusyProductId(null);
      }
    },
    [user],
  );

  const toggleProduct = useCallback(
    async (productId: string) => {
      const userId = user?.uid;
      if (!userId) throw new Error("Sign in to manage your wishlist.");
      const saved = entries.some((entry) => entry.product?._id === productId);
      await perform(productId, async () => {
        if (saved) {
          await removeWishlistProduct(productId);
          setWishlistState((current) =>
            removeWishlistEntry(current, userId, productId),
          );
        } else {
          await addWishlistProduct(productId);
          await refreshWishlist();
        }
      });
    },
    [entries, perform, refreshWishlist, user],
  );

  const removeProduct = useCallback(
    async (productId: string) => {
      const userId = user?.uid;
      if (!userId) throw new Error("Sign in to manage your wishlist.");
      await perform(productId, async () => {
        await removeWishlistProduct(productId);
        setWishlistState((current) =>
          removeWishlistEntry(current, userId, productId),
        );
      });
    },
    [perform, user],
  );

  const moveToCart = useCallback(
    async (productId: string, variantId?: string) => {
      const userId = user?.uid;
      if (!userId) throw new Error("Sign in to manage your wishlist.");
      await perform(productId, async () => {
        await moveWishlistProductToCart(productId, variantId);
        setWishlistState((current) =>
          removeWishlistEntry(current, userId, productId),
        );
        await refreshCart();
      });
    },
    [perform, refreshCart, user],
  );

  const value = useMemo<WishlistContextValue>(
    () => ({
      entries,
      loading,
      busyProductId,
      error,
      isSaved: (productId) =>
        entries.some((entry) => entry.product?._id === productId),
      toggleProduct,
      removeProduct,
      moveToCart,
      refreshWishlist,
    }),
    [
      entries,
      loading,
      busyProductId,
      error,
      toggleProduct,
      removeProduct,
      moveToCart,
      refreshWishlist,
    ],
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used inside WishlistProvider");
  }
  return context;
}
