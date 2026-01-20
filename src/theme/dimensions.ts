import { Dimensions, PixelRatio, Platform } from "react-native";
import {
  scale,
  verticalScale,
  moderateScale,
  moderateVerticalScale,
} from "react-native-size-matters";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const BASE_WIDTH = 393;
const BASE_HEIGHT = 852;

/**
 * ============================================================================
 * RESPONSIVE DIMENSIONS - USAGE GUIDE
 * ============================================================================
 * 
 * Ye functions use karo taake aapka UI har device par responsive ho:
 * - Phone (iOS & Android)
 * - Tablet (iOS & Android)  
 * - iPad
 * - Web (responsive breakpoints ke saath)
 * 
 * ----------------------------------------------------------------------------
 * KAB KIS FUNCTION KO USE KARNA HAI:
 * ----------------------------------------------------------------------------
 * 
 * 1. widthScale(size) - Use karo jab:
 *    ✅ width property ke liye
 *    ✅ minWidth, maxWidth ke liye
 *    ✅ Horizontal spacing jo proportionally scale hona chahiye
 * 
 *    Example:
 *    width: widthScale(100),
 *    minWidth: widthScale(200),
 * 
 * 2. heightScale(size) - Use karo jab:
 *    ✅ height property ke liye
 *    ✅ minHeight, maxHeight ke liye
 *    ✅ Vertical spacing jo proportionally scale hona chahiye
 * 
 *    Example:
 *    height: heightScale(100),
 *    minHeight: heightScale(200),
 * 
 * 3. moderateWidthScale(size, factor?) - Use karo jab:
 *    ✅ padding, paddingLeft, paddingRight, paddingHorizontal ke liye
 *    ✅ margin, marginLeft, marginRight, marginHorizontal ke liye
 *    ✅ borderRadius ke liye (horizontal values)
 *    ✅ gap (horizontal) ke liye
 *    ✅ left, right positioning ke liye
 * 
 *    Factor parameter (optional):
 *    - Default: 0.5 (balanced scaling)
 *    - 0.3: Less aggressive scaling (smaller devices par zyada scale nahi hoga)
 *    - 0.7: More aggressive scaling (larger devices par zyada scale hoga)
 * 
 *    Example:
 *    padding: moderateWidthScale(16),
 *    borderRadius: moderateWidthScale(8),
 *    paddingHorizontal: moderateWidthScale(16, 0.3), // Less scaling
 * 
 * 4. moderateHeightScale(size, factor?) - Use karo jab:
 *    ✅ paddingTop, paddingBottom, paddingVertical ke liye
 *    ✅ marginTop, marginBottom, marginVertical ke liye
 *    ✅ top, bottom positioning ke liye
 *    ✅ gap (vertical) ke liye
 * 
 *    Factor parameter (optional):
 *    - Default: 0.5 (balanced scaling)
 *    - 0.3: Less aggressive scaling
 *    - 0.7: More aggressive scaling
 * 
 *    Example:
 *    paddingVertical: moderateHeightScale(12),
 *    marginTop: moderateHeightScale(20),
 *    marginBottom: moderateHeightScale(16, 0.3), // Less scaling
 * 
 * ----------------------------------------------------------------------------
 * COMPLETE EXAMPLE:
 * ----------------------------------------------------------------------------
 * 
 * import { widthScale, heightScale, moderateWidthScale, moderateHeightScale } from "@/src/theme/dimensions";
 * 
 * const createStyles = (theme: Theme) =>
 *   StyleSheet.create({
 *     container: {
 *       width: widthScale(300),              // ✅ Width ke liye
 *       height: heightScale(200),            // ✅ Height ke liye
 *       padding: moderateWidthScale(16),     // ✅ Padding ke liye
 *       marginTop: moderateHeightScale(20),  // ✅ Vertical margin ke liye
 *       borderRadius: moderateWidthScale(8), // ✅ Border radius ke liye
 *       gap: moderateWidthScale(12),         // ✅ Gap ke liye
 *     },
 *     button: {
 *       paddingHorizontal: moderateWidthScale(24),
 *       paddingVertical: moderateHeightScale(12),
 *       borderRadius: moderateWidthScale(8),
 *       minWidth: widthScale(100),
 *     },
 *   });
 * 
 * ----------------------------------------------------------------------------
 * SPECIAL CASES (Direct use kar sakte ho):
 * ----------------------------------------------------------------------------
 * ✅ flex: 1, flex: 0 - Direct use karo (flexbox values hain)
 * ✅ Percentage: width: "100%" - Direct use karo
 * ✅ aspectRatio: aspectRatio: 16/9 - Direct use karo
 * ✅ borderWidth: 1 - Small fixed values OK (but larger ke liye moderateWidthScale use karo)
 * 
 * ----------------------------------------------------------------------------
 * ❌ NEVER DO THIS:
 * ----------------------------------------------------------------------------
 * ❌ width: 100              // WRONG - use widthScale(100)
 * ❌ height: 200             // WRONG - use heightScale(200)
 * ❌ padding: 16             // WRONG - use moderateWidthScale(16)
 * ❌ marginTop: 20           // WRONG - use moderateHeightScale(20)
 * ❌ borderRadius: 8         // WRONG - use moderateWidthScale(8)
 * 
 * ============================================================================
 */

/**
 * Responsive width calculator
 * Scales widths based on screen width for consistent appearance across devices
 * Works on: Phone, Tablet, Web, iOS, iPad, Android
 * @param size - Width value based on BASE_WIDTH (393)
 * @returns Responsive width value
 */
export const widthScale = (size: number): number => {
  // For web, use different scaling based on window width
  if (Platform.OS === "web") {
    // Small screens (mobile-like on web)
    if (SCREEN_WIDTH <= 640) {
      return Math.round((SCREEN_WIDTH / BASE_WIDTH) * size);
    }
    // Medium screens (tablets)
    else if (SCREEN_WIDTH <= 1024) {
      return Math.round(size * 1.1);
    }
    // Large screens (desktop)
    else {
      return Math.round(size * 1.2);
    }
  }

  // For native platforms, use react-native-size-matters for better scaling
  return Math.round(scale(size));
};

/**
 * Responsive height calculator
 * Scales heights based on screen height for consistent appearance across devices
 * Works on: Phone, Tablet, Web, iOS, iPad, Android
 * @param size - Height value based on BASE_HEIGHT (852)
 * @returns Responsive height value
 */
export const heightScale = (size: number): number => {
  // For web, use different scaling based on window height
  if (Platform.OS === "web") {
    // Small screens (mobile-like on web)
    if (SCREEN_HEIGHT <= 800) {
      return Math.round((SCREEN_HEIGHT / BASE_HEIGHT) * size);
    }
    // Medium screens (tablets)
    else if (SCREEN_HEIGHT <= 1200) {
      return Math.round(size * 1.1);
    }
    // Large screens (desktop)
    else {
      return Math.round(size * 1.2);
    }
  }

  // For native platforms, use react-native-size-matters for better scaling
  return Math.round(verticalScale(size));
};

/**
 * Moderate scale for padding, margins, and borders
 * Provides more moderate scaling (less aggressive) for better UX
 * Works on: Phone, Tablet, Web, iOS, iPad, Android
 * @param size - Size value based on BASE_WIDTH (393)
 * @param factor - Scaling factor (default: 0.5, recommended: 0.3-0.7)
 * @returns Responsive size value
 */
export const moderateWidthScale = (
  size: number,
  factor: number = 0.5
): number => {
  if (Platform.OS === "web") {
    if (SCREEN_WIDTH <= 640) {
      return Math.round((SCREEN_WIDTH / BASE_WIDTH) * size);
    } else if (SCREEN_WIDTH <= 1024) {
      return Math.round(size * 1.05);
    } else {
      return Math.round(size * 1.1);
    }
  }

  return Math.round(moderateScale(size, factor));
};

/**
 * Moderate vertical scale for padding, margins, and borders
 * Provides more moderate scaling (less aggressive) for better UX
 * Works on: Phone, Tablet, Web, iOS, iPad, Android
 * @param size - Size value based on BASE_HEIGHT (852)
 * @param factor - Scaling factor (default: 0.5, recommended: 0.3-0.7)
 * @returns Responsive size value
 */
export const moderateHeightScale = (
  size: number,
  factor: number = 0.5
): number => {
  if (Platform.OS === "web") {
    if (SCREEN_HEIGHT <= 800) {
      return Math.round((SCREEN_HEIGHT / BASE_HEIGHT) * size);
    } else if (SCREEN_HEIGHT <= 1200) {
      return Math.round(size * 1.05);
    } else {
      return Math.round(size * 1.1);
    }
  }

  return Math.round(moderateVerticalScale(size, factor));
};

/**
 * Responsive font size calculator
 * Scales font sizes based on screen width for consistent appearance across devices
 * Works on: Phone, Tablet, Web, iOS, iPad, Android
 * @param size - Font size value based on BASE_WIDTH (393)
 * @returns Responsive font size value
 */
export const fontScale = (size: number): number => {
  // For web, use different scaling based on window width
  if (Platform.OS === "web") {
    // Small screens (mobile-like on web)
    if (SCREEN_WIDTH <= 640) {
      return Math.round((SCREEN_WIDTH / BASE_WIDTH) * size);
    }
    // Medium screens (tablets)
    else if (SCREEN_WIDTH <= 1024) {
      return Math.round(size * 1.1); // Slightly larger
    }
    // Large screens (desktop)
    else {
      return Math.round(size * 1.15); // Even larger for desktop
    }
  }

  // For native platforms, use react-native-size-matters for better scaling
  const scaledSize = scale(size);
  return Math.round(PixelRatio.roundToNearestPixel(scaledSize));
};

