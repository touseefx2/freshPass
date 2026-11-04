import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { moderateWidthScale, widthScale } from "@/src/theme/dimensions";
import { setGuestModeModalVisible } from "@/src/state/slices/generalSlice";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import {
  setProductFavorite,
  subscribeToFavoriteChanges,
} from "@/src/services/marketplaceService";
import { isRequestCanceled } from "@/src/services/api";

type Props = {
  productId: string;
  isFavorite: boolean;
  /** Called after the optimistic flip and again on rollback. */
  onChange?: (isFavorite: boolean) => void;
  /** overlay = white round disc on photos; plain = bare icon. */
  variant?: "overlay" | "plain";
  style?: StyleProp<ViewStyle>;
};

const DISC = widthScale(36);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      width: DISC,
      height: DISC,
      borderRadius: DISC / 2,
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: 2,
    },
    plain: {
      width: widthScale(44),
      height: widthScale(44),
      alignItems: "center",
      justifyContent: "center",
    },
  });

/**
 * Save / unsave heart. Flips at once, rolls back with a banner if the call
 * fails; guests get the sign-in popup. Stays in sync with every other heart
 * for the same product through subscribeToFavoriteChanges.
 */
export default function FavoriteHeartButton({
  productId,
  isFavorite,
  onChange,
  variant = "overlay",
  style,
}: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { showBanner } = useNotificationContext();
  const isGuest = useAppSelector((s) => s.user.isGuest);
  const [on, setOn] = useState(isFavorite);
  const busy = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    setOn(isFavorite);
  }, [isFavorite]);

  useEffect(
    () =>
      subscribeToFavoriteChanges((id, value) => {
        if (id === productId) setOn(value);
      }),
    [productId],
  );

  const handlePress = useCallback(async () => {
    if (isGuest) {
      dispatch(setGuestModeModalVisible(true));
      return;
    }
    if (busy.current) return;
    busy.current = true;
    const next = !on;
    setOn(next);
    onChangeRef.current?.(next);
    try {
      await setProductFavorite(productId, next);
    } catch (err: any) {
      setOn(!next);
      onChangeRef.current?.(!next);
      if (!isRequestCanceled(err)) {
        showBanner(
          t("mpFavoriteErrorTitle"),
          err?.data?.message || err?.message || t("somethingWentWrong"),
          "error",
        );
      }
    } finally {
      busy.current = false;
    }
  }, [dispatch, isGuest, on, productId, showBanner, t]);

  const overlay = variant === "overlay";
  const iconSize = overlay ? moderateWidthScale(20) : moderateWidthScale(26);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      style={[overlay ? styles.overlay : styles.plain, style]}
      hitSlop={overlay ? { top: 6, bottom: 6, left: 6, right: 6 } : undefined}
      accessibilityRole="button"
      accessibilityLabel={on ? t("mpRemoveFromSaved") : t("mpSaveProduct")}
      accessibilityState={{ selected: on }}
    >
      <MaterialCommunityIcons
        name={on ? "heart" : "heart-outline"}
        size={iconSize}
        color={on ? theme.red : theme.darkGreen}
      />
    </TouchableOpacity>
  );
}
