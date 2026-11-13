import { Stack } from "expo-router";

// Bring Customers Back (offer emails): inside the (main) stack, no bottom tabs.
export default function BringCustomersBackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
