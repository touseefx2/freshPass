import React, { useCallback, useEffect } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import WebViewModal from "@/src/components/webViewModal";
import { safeSitePageUrl } from "@/src/services/pendingBusinessLink";
import { resetToDashboardHome } from "@/src/utils/navigation";

/**
 * A getfreshpass.com page that reached the app (/privacy-policy, /pricing…).
 * Android / iOS hand these links to the app and the browser would hand them
 * straight back, so the page is shown in a WebView.
 * Only getfreshpass.com (and subdomains) load here, always over https —
 * anything else (e.g. com.freshpass://sitePage?url=https://other.site) closes.
 */
export default function SitePageScreen() {
  const router = useRouter();
  const { url } = useLocalSearchParams<{ url?: string }>();
  const pageUrl = safeSitePageUrl(url);

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else resetToDashboardHome();
  }, [router]);

  // Bad / foreign url: never leave an empty screen behind
  useEffect(() => {
    if (!pageUrl) close();
  }, [pageUrl, close]);

  return (
    <View style={{ flex: 1 }}>
      <WebViewModal
        visible={!!pageUrl}
        url={pageUrl ?? ""}
        title="FreshPass"
        onClose={close}
      />
    </View>
  );
}
