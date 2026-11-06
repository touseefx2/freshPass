import { Stack } from "expo-router";

// Pro Master Classes screens: inside the (main) stack, no bottom tabs.
export default function MasterClassesLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
