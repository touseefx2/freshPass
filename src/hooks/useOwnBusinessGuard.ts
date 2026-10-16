import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "@/src/hooks/hooks";
import { isOwnBusinessInCustomerMode } from "@/src/state/slices/userSlice";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { resetToDashboardHome } from "@/src/utils/navigation";

/**
 * Booking / membership screens can be opened from many places (Explore deals,
 * reels, try-on results, notifications). In customer mode the server refuses
 * them for the user's own business, so leave right away with a short note.
 * Returns true while the screen is for the user's own business.
 */
export function useOwnBusinessGuard(
  businessId: string | number | null | undefined,
): boolean {
  const router = useRouter();
  const { t } = useTranslation();
  const { showBanner } = useNotificationContext();
  const isOwn = useAppSelector((state) =>
    isOwnBusinessInCustomerMode(state.user, businessId),
  );

  useEffect(() => {
    if (!isOwn) return;
    showBanner(
      t("ownBusinessBlockedTitle"),
      t("ownBusinessBlockedMessage"),
      "info",
      3500,
    );
    if (router.canGoBack()) {
      router.back();
    } else {
      resetToDashboardHome();
    }
    // Once per own-business visit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwn]);

  return isOwn;
}
