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
import { useUploadReel } from "@/src/hooks/useUploadReel";
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
  const { recordReel, pickReel } = useUploadReel();
  const dispatch = useAppDispatch();
  const userRole = useAppSelector((state) => state.user.userRole);
  const businessStatus = useAppSelector((state) => state.user.businessStatus);

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

  useEffect(() => {
    if (!visible) {
      setReelPickerVisible(false);
    }
  }, [visible]);

  /** Close both speed-dial and reel picker; keeps center tab as +. */
  const closeAll = useCallback(() => {
    setReelPickerVisible(false);
    onClose();
  }, [onClose]);

  const ensureCanUploadReel = useCallback((): boolean => {
    const gate = getReelUploadGate(businessStatus, userRole);
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
    // Monthly reels only limit AI / template reels — those screens check it.
    return true;
  }, [businessStatus, userRole, closeAll, dispatch]);

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

  const handleRecord = useCallback(() => {
    if (!ensureCanUploadReel()) return;
    closeAll();
    void recordReel();
  }, [closeAll, ensureCanUploadReel, recordReel]);

  const handleUpload = useCallback(() => {
    if (!ensureCanUploadReel()) return;
    closeAll();
    void pickReel();
  }, [closeAll, ensureCanUploadReel, pickReel]);

  const openReelPicker = useCallback(() => {
    const gate = getReelUploadGate(businessStatus, userRole);
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
  }, [businessStatus, userRole, closeAll, dispatch]);

  /**
   * Image / AI reel: AI Tools → that reel screen, so Back lands on AI Tools
   * (same stack as Generate Reel there). Both screens check the monthly limit.
   */
  const openAiToolsReel = useCallback(
    (pathname: "/(main)/templateReels" | "/(main)/reelTemplates") => {
      closeAll();
      router.push({
        pathname: "/(main)/aiTools/toolList",
        params: { mode: "aiTools" },
      } as any);
      setTimeout(() => {
        router.push(pathname as any);
      }, 15);
    },
    [closeAll, router],
  );

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
          // Profile → Business profile settings → Products listing
          router.push("/(main)/dashboard/(account)");
          setTimeout(() => {
            router.push(
              "/(main)/dashboard/(account)/(businessProfileSettings)",
            );
            setTimeout(() => {
              router.push(
                "/(main)/dashboard/(account)/(businessProfileSettings)/products",
              );
            }, 15);
          }, 15);
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
    [closeAll, handleAddEmployee, openReelPicker, router],
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
        onImageReelPress={() => openAiToolsReel("/(main)/templateReels")}
        onAiReelPress={() => openAiToolsReel("/(main)/reelTemplates")}
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
