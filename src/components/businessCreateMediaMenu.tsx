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
import * as Haptics from "expo-haptics";
import Animated, {
  Extrapolation,
  FadeIn,
  FadeOut,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
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
      gap: moderateHeightScale(10),
    },
    // Every pill stretches to the widest label, so the stack is one even column
    menuOption: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(7),
      paddingLeft: moderateWidthScale(7),
      paddingRight: moderateWidthScale(14),
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(999),
      borderWidth: 1,
      borderColor: theme.darkGreen15,
      shadowColor: theme.darkGreenDeep,
      shadowOffset: { width: 0, height: moderateHeightScale(6) },
      shadowOpacity: 0.16,
      shadowRadius: moderateWidthScale(12),
      elevation: 6,
    },
    menuOptionPrimary: {
      backgroundColor: theme.darkGreen,
      borderColor: theme.darkGreen,
      shadowOpacity: 0.3,
    },
    menuOptionIconCircle: {
      width: widthScale(34),
      height: widthScale(34),
      borderRadius: widthScale(17),
      backgroundColor: theme.darkGreen15,
      alignItems: "center",
      justifyContent: "center",
    },
    menuOptionIconCirclePrimary: {
      backgroundColor: theme.orangeBrown,
    },
    menuOptionLabel: {
      // Not flex: 1 — its 0 basis would shrink the menu to the icons
      flexGrow: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    menuOptionLabelPrimary: {
      color: theme.white,
    },
  });

type Styles = ReturnType<typeof createStyles>;

/** Gap between pills plus one pill's height, roughly — how far each one rises */
const PILL_STEP = moderateHeightScale(58);
/** Pills leave the + button one after another, nearest first */
const STAGGER_MS = 38;
/** Low damping = the little hop past the spot before it settles */
const HOP_SPRING = { damping: 13, stiffness: 320, mass: 0.7 };

function MenuPill({
  item,
  fromBottom,
  label,
  icon,
  styles,
  theme,
  onPress,
}: {
  item: MenuItem;
  /** 0 = the pill right above the + button */
  fromBottom: number;
  label: string;
  icon: React.ReactNode;
  styles: Styles;
  theme: Theme;
  onPress: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = reduceMotion
      ? withTiming(1, { duration: 160 })
      : withDelay(fromBottom * STAGGER_MS, withSpring(1, HOP_SPRING));
  }, [fromBottom, progress, reduceMotion]);

  // Starts squeezed into the + button, then springs up to its row
  const rise = (fromBottom + 1) * PILL_STEP;
  const motion = useAnimatedStyle(() => {
    if (reduceMotion) return { opacity: progress.value };
    return {
      opacity: interpolate(
        progress.value,
        [0, 0.35],
        [0, 1],
        Extrapolation.CLAMP,
      ),
      transform: [
        { translateY: (1 - progress.value) * rise },
        { scale: interpolate(progress.value, [0, 1], [0.4, 1]) },
      ],
    };
  });

  const primary = !!item.highlighted;
  return (
    <Animated.View style={motion}>
      <TouchableOpacity
        style={[styles.menuOption, primary && styles.menuOptionPrimary]}
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <View
          style={[
            styles.menuOptionIconCircle,
            primary && styles.menuOptionIconCirclePrimary,
          ]}
        >
          {icon}
        </View>
        <Text
          style={[
            styles.menuOptionLabel,
            primary && styles.menuOptionLabelPrimary,
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
        <MaterialIcons
          name="chevron-right"
          size={moderateWidthScale(20)}
          color={primary ? theme.orangeBrown : theme.buttonBack}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

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

  // A light tap as the menu pops open
  useEffect(() => {
    if (visible) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

  /** Upload a Reel → step-by-step Reel Studio, starting at "Add your video". */
  const openReelStudio = useCallback(() => {
    if (!ensureCanUploadReel()) return;
    closeAll();
    router.push("/(main)/reelStudio" as any);
  }, [closeAll, ensureCanUploadReel, router]);

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
   * AI Reels → template gallery on the Video tab. Both reel screens behind
   * it check the monthly limit.
   */
  const openTemplateGallery = useCallback(() => {
    closeAll();
    router.push({
      pathname: "/(main)/templateGallery",
      params: { kind: "video" },
    } as any);
  }, [closeAll, router]);

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
    const color = item.highlighted ? theme.darkGreen : theme.buttonBack;
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
        <Animated.View
          style={styles.root}
          pointerEvents="box-none"
          exiting={FadeOut.duration(120)}
        >
          <TouchableWithoutFeedback onPress={closeAll}>
            <Animated.View
              style={[styles.backdrop, { bottom: tabBarClearance }]}
              entering={FadeIn.duration(180)}
            >
              <BlurView
                intensity={10}
                tint="light"
                style={styles.blurFill}
                experimentalBlurMethod={androidBlurMethod}
              />
            </Animated.View>
          </TouchableWithoutFeedback>
          <View
            style={[styles.menuWrap, { bottom: menuBottom }]}
            pointerEvents="box-none"
          >
            <View style={styles.menu}>
              {MENU_ITEMS.map((item, i) => (
                <MenuPill
                  key={item.id}
                  item={item}
                  fromBottom={MENU_ITEMS.length - 1 - i}
                  label={t(item.labelKey)}
                  icon={renderMenuIcon(item)}
                  styles={styles}
                  theme={theme}
                  onPress={() => handleMenuAction(item.id)}
                />
              ))}
            </View>
          </View>
        </Animated.View>
      ) : null}

      <CreateReelPickerSheet
        visible={visible && reelPickerVisible}
        onClose={closeAll}
        onSimpleReelPress={openReelStudio}
        onRecordPress={handleRecord}
        onUploadPress={handleUpload}
        onAiReelPress={openTemplateGallery}
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
