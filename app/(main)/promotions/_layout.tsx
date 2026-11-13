import { Stack } from "expo-router";

// Owner Profile Promotions screens: inside the (main) stack, no bottom tabs.
export default function PromotionsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
