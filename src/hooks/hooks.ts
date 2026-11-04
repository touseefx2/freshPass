import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import { useMemo } from "react";
import { AppDispatch, RootState } from "../state/store";
import { themes } from "../theme/colors";

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// ✅ Optimized useTheme hook to prevent unnecessary re-renders
export const useTheme = () => {
  // Select the two primitives only (not the whole `general` slice), so other
  // `general` changes don't re-render every useTheme() caller.
  // Safety check: Handle undefined state during Redux rehydration
  // Fallback to default values if state is not yet rehydrated
  const theme = useAppSelector((s) => s.general?.theme ?? "light");
  const themeType = useAppSelector((s) => s.general?.themeType ?? "default");
  
  // Memoize colors object to prevent unnecessary re-renders
  // Safety check: Use fallback theme if current theme is invalid
  const colors = useMemo(() => {
    return themes[theme] ?? themes.light;
  }, [theme]);
  
  return { colors, theme, themeType };
};
 