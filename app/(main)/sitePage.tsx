import React from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import WebViewModal from "@/src/components/webViewModal";
import { resetToDashboardHome } from "@/src/utils/navigation";

/**
 * A getfreshpass.com page Android sent to the app (/privacy, /terms…).
 * Android claims every one-page site link for business links, and the
 * browser would hand it straight back, so the page is shown in a WebView.
 */
export default function SitePageScreen() {
  const router = useRouter();
  const { url } = useLocalSearchParams<{ url?: string }>();
  const pageUrl = typeof url === "string" && /^https:\/\//i.test(url) ? url : "";

  const close = () => {
    if (router.canGoBack()) router.back();
    else resetToDashboardHome();
  };

  return (
    <View style={{ flex: 1 }}>
      <WebViewModal visible={!!pageUrl} url={pageUrl} title="FreshPass" onClose={close} />
    </View>
  );
}
