import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { resetToDashboardHome } from "@/src/utils/navigation";
import {
  isAppShellReady,
  parseBookingLink,
  setPendingBookingLink,
} from "@/src/services/pendingBookingLink";

/**
 * Universal / App Link path: https://getfreshpass.com/book?businessId=&staffId=
 * Normally app/+native-intent.tsx catches this link first; this screen is the
 * fallback. It holds the link and goes through the splash / home, which then
 * opens booking (after login if needed).
 */
export default function BookLinkScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const params = useLocalSearchParams<{
    businessId?: string;
    staffId?: string;
  }>();

  useEffect(() => {
    setPendingBookingLink(
      parseBookingLink(
        `/book?businessId=${params.businessId ?? ""}&staffId=${params.staffId ?? ""}`,
      ),
    );
    if (isAppShellReady()) {
      resetToDashboardHome();
    } else {
      router.replace("/" as any);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.darkGreen,
      }}
    >
      <ActivityIndicator size="large" color={theme.white} />
    </View>
  );
}
