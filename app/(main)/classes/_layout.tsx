import { Stack } from "expo-router";

// Customer class screens (detail, enroll, my classes): no bottom tabs.
export default function ClassesLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
