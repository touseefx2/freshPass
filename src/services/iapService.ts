import { Platform } from "react-native";
import {
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  getPendingTransactionsIOS,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  type Product,
  type ProductSubscription,
  type Purchase,
  type PurchaseError,
} from "react-native-iap";
import { ApiService } from "@/src/services/api";
import { iapEndpoints } from "@/src/services/endpoints";
import Logger from "@/src/services/logger";

export const APP_STORE_CONFIG_NOT_SET_ERROR =
  "App Store configuration is not set for this plan. Please try again later.";

export type AppleAddonProduct = {
  productId: string;
  name?: string;
  additionalServiceId: number;
  additionalServiceName?: string;
  active?: boolean;
};

export type IosBusinessPlanProductSource = {
  appleProductId?: string | null;
  appleAddonProducts?: AppleAddonProduct[] | null;
};

export type IapPurchaseKind = "business_subscription" | "ai_service";

interface VerifyAiIapResponse {
  success: boolean;
  message: string;
  data?: {
    granted?: boolean;
    credits?: number;
    ai_quota?: number;
  };
}

interface VerifyBusinessPlanIapResponse {
  success: boolean;
  message: string;
  data?: {
    has_subscription?: boolean;
    subscription_status?: string;
  };
}

const PURCHASE_TIMEOUT_MS = 120_000;
const VERIFY_RETRY_DELAYS_MS = [2_000, 5_000, 15_000];

let connectionInitialized = false;
let accountTokenPromise: Promise<string | undefined> | undefined;
let recoveryListener:
  | ReturnType<typeof purchaseUpdatedListener>
  | undefined;
let recoverInFlight: Promise<number> | null = null;

const inFlightProductIds = new Set<string>();
const verifyingTransactionIds = new Set<string>();

const isUserCancelled = (error: PurchaseError | Error): boolean => {
  const code = String(
    "code" in error && error.code != null ? error.code : "",
  ).toLowerCase();
  const message = String(error.message ?? "").toLowerCase();
  return (
    code.includes("cancel") ||
    message.includes("cancel") ||
    code === "user-cancelled"
  );
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const isRetryableVerifyError = (error: unknown): boolean => {
  const status = (error as { response?: { status?: number } })?.response
    ?.status;

  if (typeof status === "number") {
    return status >= 500;
  }

  return true;
};

const verifyWithRetry = async <T>(run: () => Promise<T>): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 0; attempt <= VERIFY_RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      const canRetry =
        isRetryableVerifyError(error) &&
        attempt < VERIFY_RETRY_DELAYS_MS.length;

      if (!canRetry) {
        throw error;
      }

      await sleep(VERIFY_RETRY_DELAYS_MS[attempt]);
    }
  }

  throw lastError;
};

const getPurchaseTransactionId = (purchase: Purchase): string =>
  String(purchase.transactionId ?? purchase.id ?? purchase.productId ?? "");

/** StoreKit only gives a SKU at recovery time; business SKUs include this fragment. */
const isBusinessSubscriptionProduct = (productId?: string | null): boolean =>
  Boolean(productId?.includes("business.plan"));

export const ensureIapConnection = async () => {
  if (Platform.OS !== "ios") {
    throw new Error("In-App Purchase is only available on iOS.");
  }

  if (connectionInitialized) {
    return;
  }

  const result = await initConnection();
  if (!result) {
    throw new Error("Failed to initialize In-App Purchase connection.");
  }

  connectionInitialized = true;
};

export const getAppleAccountToken = async (): Promise<string | undefined> => {
  if (!accountTokenPromise) {
    accountTokenPromise = ApiService.get<{
      success: boolean;
      data?: { appAccountToken?: string };
    }>(iapEndpoints.accountToken)
      .then((response) => response?.data?.appAccountToken)
      .catch((error) => {
        Logger.warn("Could not fetch the Apple account token", error);
        accountTokenPromise = undefined;
        return undefined;
      });
  }

  return accountTokenPromise;
};

/** Dropped on logout so the next user never purchases under the previous one's id. */
export const resetAppleAccountToken = () => {
  accountTokenPromise = undefined;
};

/** Base SKU from `appleProductId`; add-on checkbox uses matching `appleAddonProducts.productId`. */
export const resolveIosBusinessPlanProductId = (
  plan: IosBusinessPlanProductSource,
  selectedAddOnIds: number[],
): string => {
  if (selectedAddOnIds.length === 0) {
    const productId = plan.appleProductId?.trim();
    if (!productId) {
      throw new Error(APP_STORE_CONFIG_NOT_SET_ERROR);
    }
    return productId;
  }

  const addonProductId = plan.appleAddonProducts?.find(
    (addon) =>
      addon.active !== false &&
      selectedAddOnIds.includes(addon.additionalServiceId) &&
      Boolean(addon.productId?.trim()),
  )?.productId?.trim();

  if (!addonProductId) {
    throw new Error(APP_STORE_CONFIG_NOT_SET_ERROR);
  }

  return addonProductId;
};

export const resolveIosAppleProductId = (
  appleProductId?: string | null,
): string => {
  const productId = appleProductId?.trim();
  if (!productId) {
    throw new Error(APP_STORE_CONFIG_NOT_SET_ERROR);
  }
  return productId;
};

const getProductOrThrow = async (
  productId: string,
  kind: IapPurchaseKind,
): Promise<Product | ProductSubscription> => {
  const products =
    (await fetchProducts({
      skus: [productId],
      type: kind === "business_subscription" ? "subs" : "in-app",
    })) ?? [];

  const matchedProduct = products.find((p) => p.id === productId);

  if (!matchedProduct) {
    throw new Error(
      "IAP product not found in App Store Connect. Verify product identifier and status.",
    );
  }

  return matchedProduct;
};

interface VerifyBusinessPlanIapPayload {
  transaction_id: string;
}

const verifyAiIapPurchase = async (transactionId: string) => {
  return ApiService.post<VerifyAiIapResponse>(iapEndpoints.verifyAi, {
    transaction_id: transactionId,
  });
};

const verifyBusinessPlanIapPurchase = async (
  payload: VerifyBusinessPlanIapPayload,
) => {
  return ApiService.post<VerifyBusinessPlanIapResponse>(
    iapEndpoints.verifyBusinessSubscription,
    payload,
  );
};

/**
 * react-native-iap v15 delivers purchases via listeners, not requestPurchase return value.
 */
const requestIosPurchase = (
  productId: string,
  kind: IapPurchaseKind,
  appAccountToken?: string,
): Promise<Purchase> =>
  new Promise((resolve, reject) => {
    let settled = false;
    let updateSub: ReturnType<typeof purchaseUpdatedListener> | undefined;
    let errorSub: ReturnType<typeof purchaseErrorListener> | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    inFlightProductIds.add(productId);

    const cleanup = () => {
      inFlightProductIds.delete(productId);
      updateSub?.remove();
      errorSub?.remove();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };

    const settleResolve = (purchase: Purchase) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(purchase);
    };

    const settleReject = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    updateSub = purchaseUpdatedListener((purchase) => {
      if (purchase.productId !== productId) {
        return;
      }
      settleResolve(purchase);
    });

    errorSub = purchaseErrorListener((error: PurchaseError) => {
      if (isUserCancelled(error)) {
        settleReject(new Error("Purchase cancelled"));
        return;
      }
      settleReject(new Error(error.message || "Purchase failed"));
    });

    timeoutId = setTimeout(() => {
      settleReject(new Error("Purchase timed out. Please try again."));
    }, PURCHASE_TIMEOUT_MS);

    const purchaseType = kind === "business_subscription" ? "subs" : "in-app";

    void requestPurchase({
      request: {
        apple: { sku: productId, appAccountToken },
        google: { skus: [productId] },
      },
      type: purchaseType,
    }).catch((error: unknown) => {
      if (isUserCancelled(error as PurchaseError)) {
        settleReject(new Error("Purchase cancelled"));
        return;
      }
      const message =
        error instanceof Error ? error.message : "Failed to start purchase";
      settleReject(new Error(message));
    });
  });

const recoverPurchase = async (purchase: Purchase): Promise<boolean> => {
  const productId = purchase.productId;
  if (!productId) {
    return false;
  }

  if (inFlightProductIds.has(productId)) {
    return false;
  }

  const transactionId = getPurchaseTransactionId(purchase);
  if (!transactionId) {
    return false;
  }

  if (verifyingTransactionIds.has(transactionId)) {
    return false;
  }

  verifyingTransactionIds.add(transactionId);

  try {
    const isSubscription = isBusinessSubscriptionProduct(productId);

    if (isSubscription) {
      const verifyResponse = await verifyWithRetry(() =>
        verifyBusinessPlanIapPurchase({ transaction_id: transactionId }),
      );

      if (!verifyResponse.success) {
        throw new Error(verifyResponse.message || "IAP verification failed.");
      }

      await finishTransaction({ purchase, isConsumable: false });
    } else {
      const verifyResponse = await verifyWithRetry(() =>
        verifyAiIapPurchase(transactionId),
      );

      if (!verifyResponse.success) {
        throw new Error(verifyResponse.message || "IAP verification failed.");
      }

      await finishTransaction({ purchase, isConsumable: true });
    }

    return true;
  } catch (error) {
    Logger.warn("Could not recover IAP purchase", {
      productId,
      transactionId,
      error,
    });
    return false;
  } finally {
    verifyingTransactionIds.delete(transactionId);
  }
};

export const recoverPendingIosPurchases = async ({
  includeEntitlements = false,
}: { includeEntitlements?: boolean } = {}): Promise<number> => {
  if (Platform.OS !== "ios") {
    return 0;
  }

  if (recoverInFlight) {
    return recoverInFlight;
  }

  recoverInFlight = (async () => {
    try {
      await ensureIapConnection();
    } catch (error) {
      Logger.warn("Could not initialize IAP for recovery", error);
      return 0;
    }

    const pending = await getPendingTransactionsIOS().catch(() => []);
    const entitlements = includeEntitlements
      ? await getAvailablePurchases({
          alsoPublishToEventListenerIOS: false,
        }).catch(() => [])
      : [];

    const byTransactionId = new Map<string, Purchase>();
    for (const purchase of [...pending, ...entitlements]) {
      const transactionId = getPurchaseTransactionId(purchase);
      if (transactionId && !byTransactionId.has(transactionId)) {
        byTransactionId.set(transactionId, purchase);
      }
    }

    let recovered = 0;
    for (const purchase of byTransactionId.values()) {
      const didRecover = await recoverPurchase(purchase);
      if (didRecover) {
        recovered += 1;
      }
    }

    return recovered;
  })().finally(() => {
    recoverInFlight = null;
  });

  return recoverInFlight;
};

export const startIapRecoveryListener = () => {
  if (Platform.OS !== "ios" || recoveryListener) {
    return;
  }

  void ensureIapConnection().catch((error) => {
    Logger.warn("Could not initialize IAP recovery listener", error);
  });

  recoveryListener = purchaseUpdatedListener((purchase) => {
    void recoverPurchase(purchase);
  });
};

export const stopIapRecoveryListener = () => {
  recoveryListener?.remove();
  recoveryListener = undefined;
};

/** AI try-on IAP — verify API receives transaction_id only. */
export const purchaseAndVerifyIosIap = async (params: {
  productId: string;
}) => {
  const { productId } = params;
  const kind: IapPurchaseKind = "ai_service";

  await ensureIapConnection();
  await getProductOrThrow(productId, kind);

  const appAccountToken = await getAppleAccountToken();
  const purchase = await requestIosPurchase(productId, kind, appAccountToken);

  const transactionId = getPurchaseTransactionId(purchase);

  const verifyResponse = await verifyWithRetry(() =>
    verifyAiIapPurchase(transactionId),
  );

  if (!verifyResponse.success) {
    throw new Error(verifyResponse.message || "IAP verification failed.");
  }

  await finishTransaction({
    purchase,
    isConsumable: true,
  });

  return verifyResponse;
};

/** Business plan IAP — separate verify route and full payload. */
export const purchaseAndVerifyBusinessPlanIosIap = async (params: {
  productId: string;
  planId: number;
  additionalServiceIds?: number[];
}) => {
  const { productId } = params;
  const kind: IapPurchaseKind = "business_subscription";

  await ensureIapConnection();
  await getProductOrThrow(productId, kind);

  const appAccountToken = await getAppleAccountToken();
  const purchase = await requestIosPurchase(productId, kind, appAccountToken);

  const transactionId = getPurchaseTransactionId(purchase);

  const verifyResponse = await verifyWithRetry(() =>
    verifyBusinessPlanIapPurchase({ transaction_id: transactionId }),
  );

  if (!verifyResponse.success) {
    throw new Error(verifyResponse.message || "IAP verification failed.");
  }

  await finishTransaction({
    purchase,
    isConsumable: false,
  });

  return verifyResponse;
};
