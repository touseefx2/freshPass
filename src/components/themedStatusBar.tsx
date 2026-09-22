import { StatusBar } from "react-native";
import { useTheme } from "../hooks/hooks";

export function ThemedStatusBar() {
  const { theme } = useTheme();

  const safeTheme = theme || "light";

  // Transparent + translucent so content draws edge-to-edge (reels, heroes).
  // Solid status-bar colors fight Android/iOS edge-to-edge and leave a black gap.
  return (
    <StatusBar
      animated
      translucent={true}
      backgroundColor="transparent"
      barStyle={
        safeTheme === "dark" || safeTheme === "blue"
          ? "light-content"
          : "dark-content"
      }
    />
  );
}
