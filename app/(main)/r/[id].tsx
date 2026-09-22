import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";

/**
 * Universal / App Link path: https://getfreshpass.com/r/{id}
 * Expo Router maps the host path `/r/:id` onto this screen when associated domains are configured.
 */
export default function ReelUniversalLinkScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const params = useLocalSearchParams<{ id?: string }>();
  const reelId = params.id;

  useEffect(() => {
    if (!reelId) {
      router.replace("/(main)/dashboard/(home)" as any);
      return;
    }
    router.replace({
      pathname: "/(main)/reelsFeed" as any,
      params: { first_reel_id: String(reelId) },
    });
  }, [reelId, router]);

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.black,
      }}
    >
      <ActivityIndicator size="large" color={theme.white} />
    </View>
  );
}
