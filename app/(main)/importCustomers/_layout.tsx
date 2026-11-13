import { Stack } from "expo-router";

// Import Customers screens: inside the (main) stack, no bottom tabs.
export default function ImportCustomersLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
