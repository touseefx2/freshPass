import { StatusBar } from "react-native";
import { useTheme } from "../hooks/hooks";
import { Theme, themes } from "../theme/colors";

export function ThemedStatusBar() {
  const { colors, theme } = useTheme();

  // Safety check: Use fallback if colors is undefined (during Redux rehydration)
  const safeColors = colors || themes.light;
  const safeTheme = theme || "light";

  return (
    <StatusBar
      animated
      translucent
      backgroundColor={(safeColors as Theme).background}
      barStyle={
        safeTheme === "dark" || safeTheme === "blue" ? "light-content" : "dark-content"
      }
    />
  );
}
