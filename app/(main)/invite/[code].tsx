import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { store } from "@/src/state/store";
import { resetToDashboardHome } from "@/src/utils/navigation";
import { isAppShellReady } from "@/src/services/pendingBookingLink";
import {
  holdInviteFromLink,
  openPendingInviteNotice,
} from "@/src/services/pendingInviteCode";

/**
 * Invite a Pro link: https://getfreshpass.com/invite/{code} (this route) and
 * com.freshpass://invite?code={CODE} (invite/index.tsx re-exports this screen).
 * Normally app/+native-intent.tsx catches the link first; this screen is the
 * fallback so the link never shows "Unmatched Route". It holds the code for
 * business signup and goes back to where the user was.
 */
export default function InviteLinkScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const params = useLocalSearchParams<{ code?: string | string[] }>();

  useEffect(() => {
    const code = Array.isArray(params.code) ? params.code[0] : params.code;
    holdInviteFromLink(code ?? null);

    // Launched straight onto this route: run the splash like any launch
    if (!isAppShellReady()) {
      router.replace("/" as any);
      return;
    }

    const user = store.getState().user;
    const signedIn = !!user.accessToken && !!user.userRole && !user.isGuest;
    if (router.canGoBack()) {
      router.back();
      // Signed in → "This invite is for new businesses"; otherwise silent
      openPendingInviteNotice();
    } else if (signedIn) {
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
