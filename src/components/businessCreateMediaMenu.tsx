import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import BuyBusinessPlanModal from "@/src/components/BuyBusinessPlanModal";
import CreateReelPickerSheet from "@/src/components/createReelPickerSheet";
import UpgradeToBusinessModal from "@/src/components/UpgradeToBusinessModal";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import Logger from "@/src/services/logger";
import { getMediaLimits } from "@/src/services/mediaLibraryService";
import {
  handleCameraPermission,
  handleMediaLibraryPermission,
} from "@/src/services/mediaPermissionService";
import {
  setBusinessPlansModalBusinessOnly,
  setBusinessPlansModalVisible,
  setStripeConnectModalVisible,
} from "@/src/state/slices/generalSlice";
import {
  canAddStaffMembers,
  isSoloSubscription,
  isStripeOnboardingCompleted,
} from "@/src/state/slices/userSlice";
import type { MediaLimits, MediaUploadSourceType } from "@/src/types/media";
import { REEL_LIMIT_FALLBACK } from "@/src/utils/reelLimits";
import { getReelUploadGate } from "@/src/utils/reelUploadGate";

const androidBlurMethod =
  Platform.OS === "android" ? ("dimezisBlurView" as const) : ("none" as const);

type CreateMenuAction =
  | "newAppointment"
  | "addEmployee"
  | "addProduct"
  | "createReel"
  | "blockTime";

type IconSet = "material" | "community";

type MenuItem = {
  id: CreateMenuAction;
  labelKey: string;
  icon: string;
  iconSet: IconSet;
  highlighted?: boolean;
};

const MENU_ITEMS: MenuItem[] = [
  {
    id: "newAppointment",
    labelKey: "newAppointment",
    icon: "calendar-plus",
    iconSet: "community",
  },
  {
    id: "addEmployee",
    labelKey: "addEmployee",
    icon: "account-multiple-plus-outline",
    iconSet: "community",
  },
  {
    id: "addProduct",
    labelKey: "addProduct",
    icon: "package-variant-closed",
    iconSet: "community",
  },
  {
    id: "createReel",
    labelKey: "createReel",
    icon: "movie-open-outline",
    iconSet: "community",
    highlighted: true,
  },
  {
    id: "blockTime",
    labelKey: "blockTime",
    icon: "clock-outline",
    iconSet: "community",
  },
];

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 40,
    },
    backdrop: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      overflow: "hidden",
    },
    blurFill: {
      ...StyleSheet.absoluteFillObject,
    },
    menuWrap: {
      position: "absolute",
      left: 0,
      right: 0,
      alignItems: "center",
    },
    menu: {
      alignItems: "stretch",
      gap: moderateHeightScale(8),
    },
    menuOption: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "center",
      gap: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(8),
      paddingLeft: moderateWidthScale(8),
      paddingRight: moderateWidthScale(18),
      backgroundColor: theme.buttonBack,
      borderRadius: moderateWidthScale(999),
      borderWidth: 1,
      borderColor: theme.white50,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: moderateHeightScale(3) },
      shadowOpacity: 0.25,
      shadowRadius: moderateWidthScale(6),
      elevation: 7,
    },
    menuOptionHighlighted: {
      borderColor: theme.orangeBrown,
      borderWidth: 2,
      shadowColor: theme.orangeBrown,
      shadowOpacity: 0.45,
      shadowRadius: moderateWidthScale(8),
    },
    menuOptionIconCircle: {
      width: widthScale(32),
      height: widthScale(32),
      borderRadius: moderateWidthScale(16),
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
    },
    menuOptionLabel: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
  });

type BusinessCreateMediaMenuProps = {
  visible: boolean;
  onClose: () => void;
  /** Exact tab bar height from dashboard layout — keeps blur flush with tab top. */
  tabBarHeight: number;
};

export default function BusinessCreateMediaMenu({
  visible,
  onClose,
  tabBarHeight,
}: BusinessCreateMediaMenuProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const router = useRouter();
  const { showBanner } = useNotificationContext();
  const dispatch = useAppDispatch();
  const businessStatus = useAppSelector((state) => state.user.businessStatus);

  const [limits, setLimits] = useState<MediaLimits | null>(null);
  const [buyPlanModalVisible, setBuyPlanModalVisible] = useState(false);
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
  const [reelPickerVisible, setReelPickerVisible] = useState(false);
  const canAddStaff = canAddStaffMembers(businessStatus);
  const isSoloPlan = isSoloSubscription(businessStatus);

  /** Blur ends exactly at tab bar top — no clear gap strip. */
  const tabBarClearance = tabBarHeight;
  const menuBottom = tabBarClearance + moderateHeightScale(10);
  /**
   * Sit just above the center X (FAB protrudes ~6–12px above tab bar).
   * Keep only a small gap — matches design sample.
   */
  const reelPickerBottom = tabBarClearance + moderateHeightScale(12);

  const maxSeconds = limits?.max_seconds ?? REEL_LIMIT_FALLBACK.max_seconds;

  useEffect(() => {
    if (!visible) {
      setReelPickerVisible(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible && !reelPickerVisible) return;
    void getMediaLimits()
      .then(setLimits)
      .catch((error) => {
        Logger.error("Failed to load media limits:", error);
      });
  }, [visible, reelPickerVisible]);

  /** Close both speed-dial and reel picker; keeps center tab as +. */
  const closeAll = useCallback(() => {
    setReelPickerVisible(false);
    onClose();
  }, [onClose]);

  const ensureCanUploadReel = useCallback((): boolean => {
    const gate = getReelUploadGate(businessStatus);
    if (gate === "stripe") {
      closeAll();
      dispatch(setStripeConnectModalVisible(true));
      return false;
    }
    if (gate === "plan") {
      closeAll();
      setBuyPlanModalVisible(true);
      return false;
    }
    return true;
  }, [businessStatus, closeAll, dispatch]);

  const handleViewPlans = useCallback(() => {
    setBuyPlanModalVisible(false);
    dispatch(setBusinessPlansModalVisible(true));
  }, [dispatch]);

  const handleUpgradePlan = useCallback(() => {
    setUpgradeModalVisible(false);
    dispatch(setBusinessPlansModalBusinessOnly(true));
    dispatch(setBusinessPlansModalVisible(true));
  }, [dispatch]);

  const handleAddEmployee = useCallback(() => {
    closeAll();
    if (!isStripeOnboardingCompleted(businessStatus)) {
      dispatch(setStripeConnectModalVisible(true));
      return;
    }
    if (isSoloPlan) {
      setUpgradeModalVisible(true);
      return;
    }
    if (!canAddStaff) {
      setBuyPlanModalVisible(true);
      return;
    }
    router.push("/(main)/addStaff");
  }, [
    businessStatus,
    canAddStaff,
    closeAll,
    dispatch,
    isSoloPlan,
    router,
  ]);

  const openEditor = useCallback(
    (
      asset: ImagePicker.ImagePickerAsset,
      sourceType: MediaUploadSourceType,
      seconds: number,
    ) => {
      if (!asset.uri) return;
      router.push({
        pathname: "/(main)/editVideo" as any,
        params: {
          uri: encodeURIComponent(asset.uri),
          mimeType: asset.mimeType || "video/mp4",
          fileName: asset.fileName || "video.mp4",
          sourceType,
          maxSeconds: String(seconds),
        },
      });
    },
    [router],
  );

  const resolveMaxSeconds = useCallback(async () => {
    let seconds = maxSeconds;
    try {
      const data = await getMediaLimits();
      setLimits(data);
      seconds = data.max_seconds;
    } catch {
      // keep last known / default
    }
    return seconds;
  }, [maxSeconds]);

  const handleRecord = useCallback(async () => {
    if (!ensureCanUploadReel()) return;
    closeAll();
    const hasPermission = await handleCameraPermission();
    if (!hasPermission) return;

    const seconds = await resolveMaxSeconds();

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["videos"],
        quality: 1,
        videoMaxDuration: seconds,
        ...(Platform.OS === "ios" && {
          preferredAssetRepresentationMode:
            ImagePicker.UIImagePickerPreferredAssetRepresentationMode
              .Compatible,
        }),
      });
      if (!result.canceled && result.assets?.[0]) {
        openEditor(result.assets[0], "camera", seconds);
      }
    } catch (error) {
      Logger.error("Error recording video:", error);
      showBanner(t("error"), t("failedToRecordVideo"), "error", 3000);
    }
  }, [
    closeAll,
    ensureCanUploadReel,
    openEditor,
    resolveMaxSeconds,
    showBanner,
    t,
  ]);

  const handleUpload = useCallback(async () => {
    if (!ensureCanUploadReel()) return;
    closeAll();
    const hasPermission = await handleMediaLibraryPermission();
    if (!hasPermission) return;

    const seconds = await resolveMaxSeconds();

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        allowsMultipleSelection: false,
        quality: 1,
        ...(Platform.OS === "ios" && {
          preferredAssetRepresentationMode:
            ImagePicker.UIImagePickerPreferredAssetRepresentationMode
              .Compatible,
        }),
      });
      if (!result.canceled && result.assets?.[0]) {
        openEditor(result.assets[0], "device", seconds);
      }
    } catch (error) {
      Logger.error("Error selecting video:", error);
      showBanner(t("error"), t("failedToSelectMedia"), "error", 3000);
    }
  }, [
    closeAll,
    ensureCanUploadReel,
    openEditor,
    resolveMaxSeconds,
    showBanner,
    t,
  ]);

  const openReelPicker = useCallback(() => {
    const gate = getReelUploadGate(businessStatus);
    if (gate === "stripe") {
      closeAll();
      dispatch(setStripeConnectModalVisible(true));
      return;
    }
    if (gate === "plan") {
      closeAll();
      setBuyPlanModalVisible(true);
      return;
    }
    // Keep parent `visible` true so center tab stays as X while picker is open.
    setReelPickerVisible(true);
  }, [businessStatus, closeAll, dispatch]);

  const handleMenuAction = useCallback(
    (action: CreateMenuAction) => {
      switch (action) {
        case "createReel":
          openReelPicker();
          return;
        case "newAppointment":
          closeAll();
          router.push("/(main)/dashboard/(calendar)");
          return;
        case "addEmployee":
          handleAddEmployee();
          return;
        case "addProduct":
          closeAll();
          showBanner(t("addProduct"), t("comingSoon"), "info", 2500);
          return;
        case "blockTime":
          closeAll();
          router.push({
            pathname: "/(main)/applyLeave",
            params: { type: "break" },
          });
          return;
        default:
          closeAll();
      }
    },
    [closeAll, handleAddEmployee, openReelPicker, router, showBanner, t],
  );

  const renderMenuIcon = (item: MenuItem) => {
    const size = moderateWidthScale(18);
    const color = theme.buttonBack;
    if (item.iconSet === "community") {
      return (
        <MaterialCommunityIcons
          name={item.icon as React.ComponentProps<typeof MaterialCommunityIcons>["name"]}
          size={size}
          color={color}
        />
      );
    }
    return (
      <MaterialIcons
        name={item.icon as React.ComponentProps<typeof MaterialIcons>["name"]}
        size={size}
        color={color}
      />
    );
  };

  if (!visible && !buyPlanModalVisible && !upgradeModalVisible) {
    return null;
  }

  const showSpeedDial = visible && !reelPickerVisible;

  return (
    <>
      {showSpeedDial ? (
        <View style={styles.root} pointerEvents="box-none">
          <TouchableWithoutFeedback onPress={closeAll}>
            <View style={[styles.backdrop, { bottom: tabBarClearance }]}>
              <BlurView
                intensity={10}
                tint="light"
                style={styles.blurFill}
                experimentalBlurMethod={androidBlurMethod}
              />
            </View>
          </TouchableWithoutFeedback>
          <View
            style={[styles.menuWrap, { bottom: menuBottom }]}
            pointerEvents="box-none"
          >
            <View style={styles.menu}>
              {MENU_ITEMS.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.menuOption,
                    item.highlighted && styles.menuOptionHighlighted,
                  ]}
                  onPress={() => handleMenuAction(item.id)}
                  activeOpacity={0.9}
                  accessibilityRole="button"
                  accessibilityLabel={t(item.labelKey)}
                >
                  <View style={styles.menuOptionIconCircle}>
                    {renderMenuIcon(item)}
                  </View>
                  <Text style={styles.menuOptionLabel}>{t(item.labelKey)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      ) : null}

      <CreateReelPickerSheet
        visible={visible && reelPickerVisible}
        onClose={closeAll}
        onRecordPress={handleRecord}
        onUploadPress={handleUpload}
        bottomOffset={reelPickerBottom}
        tabBarClearance={tabBarClearance}
      />

      <BuyBusinessPlanModal
        visible={buyPlanModalVisible}
        onClose={() => setBuyPlanModalVisible(false)}
        onViewPlans={handleViewPlans}
      />

      <UpgradeToBusinessModal
        visible={upgradeModalVisible}
        onClose={() => setUpgradeModalVisible(false)}
        onUpgradePlan={handleUpgradePlan}
      />
    </>
  );
}
