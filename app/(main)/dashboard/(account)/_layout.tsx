import { Stack } from "expo-router";
import { useAppSelector } from "@/src/hooks/hooks";

export default function AccountStackLayout() {
  const activeMode = useAppSelector((state) => state.user.active_mode);
  // Re-key the Stack when the mode switches so stale business-only screens
  // (e.g. subscription) don't persist into customer mode and vice-versa.
  return <Stack key={activeMode ?? "init"} screenOptions={{ headerShown: false }} />;
}
