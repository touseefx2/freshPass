import { useEffect } from "react";
import { useRouter } from "expo-router";
import { setSessionExpiredHandler, setToastHandler } from "@/src/services/api";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { MAIN_ROUTES } from "@/src/constant/routes";

export default function SessionExpiredHandler() {
  const router = useRouter();
  const { showBanner } = useNotificationContext();

  useEffect(() => {
    // Set up session expired handler
    setSessionExpiredHandler(() => {
      // Show toast notification
      showBanner(
        "Session Expired",
        "Your session has expired. Please login again.",
        "error",
        4000
      );

      // // Navigate to social login screen
      // router.replace(`/(main)/${MAIN_ROUTES.SOCIAL_LOGIN}`);
    });

    // Set up toast handler for API service (timeout, no internet, etc.)
    setToastHandler((title: string, message: string, type: "success" | "error" | "warning" | "info") => {
      showBanner(title, message, type, 4000);
    });

    // Cleanup on unmount
    return () => {
      setSessionExpiredHandler(() => {});
      setToastHandler(() => {});
    };
  }, [router, showBanner]);

  return null;
}

