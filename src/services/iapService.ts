import { Platform } from "react-native";
import {
  fetchProducts,
  finishTransaction,
  getReceiptIOS,
  getTransactionJwsIOS,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  type Product,
  type ProductSubscription,
  type Purchase,
  type PurchaseError,
  type PurchaseIOS,
} from "react-native-iap";
import { ApiService } from "@/src/services/api";
import { iapEndpoints } from "@/src/services/endpoints";

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

let connectionInitialized = false;

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

export const resolveBusinessPlanProductId = (
  planId: number,
  explicitProductId?: string | null,
) => {
  if (explicitProductId && explicitProductId.trim().length > 0) {
    return explicitProductId.trim();
  }

  const standardProductId =
    process.env.EXPO_PUBLIC_IAP_BUSINESS_PLAN_STANDARD_PRODUCT_ID;
  if (standardProductId?.trim()) {
    return standardProductId.trim();
  }

  const prefix = process.env.EXPO_PUBLIC_IAP_BUSINESS_PLAN_PREFIX;
  if (!prefix || !prefix.trim()) {
    throw new Error(
      "IAP product mapping is missing. Set EXPO_PUBLIC_IAP_BUSINESS_PLAN_STANDARD_PRODUCT_ID, EXPO_PUBLIC_IAP_BUSINESS_PLAN_PREFIX, or return app_store_product_id from API.",
    );
  }

  return `${prefix.trim()}.${planId}`;
};

/** Standard base vs Standard + Featured (separate App Store subscription SKUs). */
export const resolveBusinessPlanProductIdWithFeatured = (
  planId: number,
  hasFeaturedAddOn: boolean,
  explicitBaseProductId?: string | null,
) => {
  if (!hasFeaturedAddOn) {
    return resolveBusinessPlanProductId(planId, explicitBaseProductId);
  }

  const featuredProductId =
    process.env.EXPO_PUBLIC_IAP_BUSINESS_PLAN_FEATURED_PRODUCT_ID;
  if (featuredProductId?.trim()) {
    return featuredProductId.trim();
  }

  const baseId = resolveBusinessPlanProductId(planId, explicitBaseProductId);
  return `${baseId}.featured`;
};

export const resolveAiServiceProductId = (
  serviceId: number,
  explicitProductId?: string | null,
) => {
  if (explicitProductId && explicitProductId.trim().length > 0) {
    return explicitProductId.trim();
  }

  const prefix = process.env.EXPO_PUBLIC_IAP_AI_SERVICE_PREFIX;
  if (!prefix || !prefix.trim()) {
    throw new Error(
      "IAP product mapping is missing. Set EXPO_PUBLIC_IAP_AI_SERVICE_PREFIX or return app_store_product_id from API.",
    );
  }

  return `${prefix.trim()}.${serviceId}`;
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

const getReceiptFromPurchase = async (
  purchase: Purchase,
  productId: string,
): Promise<string> => {
  if (purchase.purchaseToken?.trim()) {
    return purchase.purchaseToken.trim();
  }

  const legacyReceipt = (
    purchase as Purchase & { transactionReceipt?: string }
  ).transactionReceipt;
  if (legacyReceipt?.trim()) {
    return legacyReceipt.trim();
  }

  try {
    const jws = await getTransactionJwsIOS(productId);
    if (jws?.trim()) {
      return jws.trim();
    }
  } catch {
    // Fall through to app receipt
  }

  const appReceipt = await getReceiptIOS();
  if (appReceipt?.trim()) {
    return appReceipt.trim();
  }

  throw new Error("Purchase receipt missing. Please try again.");
};

interface VerifyBusinessPlanIapPayload {
  transaction_id: string;
  // productId: string;
  // transactionId: string;
  // transactionReceipt: string;
  // originalTransactionId?: string;
  // purchaseToken?: string;
  // referenceId: number;
  // additional_service_ids?: number[];
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
): Promise<Purchase> =>
  new Promise((resolve, reject) => {
    let settled = false;
    let updateSub: ReturnType<typeof purchaseUpdatedListener> | undefined;
    let errorSub: ReturnType<typeof purchaseErrorListener> | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const cleanup = () => {
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
        apple: { sku: productId },
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

/** AI try-on IAP — verify API receives transaction_id only. */
export const purchaseAndVerifyIosIap = async (params: {
  productId: string;
  referenceId: number;
}) => {
  const { productId } = params;
  const kind: IapPurchaseKind = "ai_service";

  await ensureIapConnection();
  await getProductOrThrow(productId, kind);

  const purchase = await requestIosPurchase(productId, kind);

  const transactionId =
    purchase.transactionId ?? purchase.id ?? purchase.productId;

  const verifyResponse = await verifyAiIapPurchase(transactionId);

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
  const { productId, planId, additionalServiceIds } = params;
  const kind: IapPurchaseKind = "business_subscription";

  await ensureIapConnection();
  await getProductOrThrow(productId, kind);

  const purchase = await requestIosPurchase(productId, kind);

  const transactionReceipt = await getReceiptFromPurchase(purchase, productId);
  const transactionId =
    purchase.transactionId ?? purchase.id ?? purchase.productId;

  const iosPurchase =
    purchase.platform === "ios" ? (purchase as PurchaseIOS) : null;

  const verifyPayload: VerifyBusinessPlanIapPayload = {
    transaction_id: transactionId,
    // productId: purchase.productId,
    // transactionId,
    // transactionReceipt,
    // originalTransactionId:
    //   iosPurchase?.originalTransactionIdentifierIOS ?? undefined,
    // purchaseToken: purchase.purchaseToken ?? undefined,
    // referenceId: planId,
    // ...(additionalServiceIds?.length
    //   ? { additional_service_ids: additionalServiceIds }
    //   : {}),
  };

  console.log("verifyPayload", verifyPayload);
   
  // alert(JSON.stringify(verifyPayload));

  const verifyResponse = await verifyBusinessPlanIapPurchase(verifyPayload);

  if (!verifyResponse.success) {
    throw new Error(verifyResponse.message || "IAP verification failed.");
  }

  await finishTransaction({
    purchase,
    isConsumable: false,
  });

  return verifyResponse;
};
