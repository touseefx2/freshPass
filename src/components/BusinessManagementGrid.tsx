import React, { useMemo } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { useBusinessOrdersCount } from "@/src/hooks/useBusinessOrdersCount";
import { useDealsPlanGate } from "@/src/hooks/useDealsPlanGate";
import { useHiringPlanGate } from "@/src/hooks/useHiringPlanGate";
import { markGoldTapped } from "@/src/state/slices/generalSlice";
import { canShowStaffManagement } from "@/src/state/slices/userSlice";
import { Theme } from "@/src/theme/colors";
import { moderateHeightScale, moderateWidthScale } from "@/src/theme/dimensions";
import { fontSize, fonts } from "@/src/theme/fonts";
import { goldTapOwner } from "@/src/utils/goldFrames";

const SETTINGS_ROUTE = "/(main)/dashboard/(account)/(businessProfileSettings)";
/** Kept per user on this phone only (never sent to the server) */
const MASTER_CLASSES_OPENED_KEY = "masterClassesOpened";

type IconVariant = "dark" | "accent" | "cream";

type Tile = {
  key: string;
  title: string;
  icon: string;
  family: "material" | "community";
  variant: IconVariant;
  badge?: number;
  featured?: boolean;
  onPress: () => void;
};

/**
 * Business plan Profile page: every Business Management item as a 3-column
 * tile (client PDF, Design 1).
 *
 * @param horizontalPadding the parent's side padding, used to size the tiles
 */
export default function BusinessManagementGrid({
  horizontalPadding,
}: {
  horizontalPadding: number;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(theme), [colors]);

  const businessStatus = useAppSelector((s) => s.user.businessStatus);
  const userBusinessId = useAppSelector((s) => s.user.business_id);
  const userId = useAppSelector((s) => s.user.id);
  const userRole = useAppSelector((s) => s.user.userRole);
  const tapOwner = goldTapOwner(userRole, userId);
  // NEW look until the owner opens Master Classes once, then a normal tile
  const masterClassesOpened = useAppSelector(
    (s) =>
      tapOwner != null &&
      !!s.general.goldTapped?.[tapOwner]?.includes(MASTER_CLASSES_OPENED_KEY),
  );
  const ordersCount = useBusinessOrdersCount(true) ?? 0;
  const { ensureCanHire, planModals } = useHiringPlanGate();
  const { ensureCanPostDeals, planModal } = useDealsPlanGate();

  const gap = moderateWidthScale(8);
  // Fixed width (not space-between) so a short last row stays left aligned
  const tileWidth = Math.floor((width - horizontalPadding * 2 - gap * 2) / 3);

  const open = (screen: string) =>
    router.push(`${SETTINGS_ROUTE}/${screen}` as any);

  const businessId = userBusinessId ?? businessStatus?.business_id;

  const tiles: Tile[] = [
    {
      key: "businessProfile",
      title: t("businessProfileTitle"),
      icon: "storefront",
      family: "material",
      variant: "dark",
      onPress: () => open("businessProfileMenu"),
    },
    {
      key: "services",
      title: t("servicesAndMemberships"),
      icon: "content-cut",
      family: "material",
      variant: "accent",
      onPress: () => open("servicesAndMemberships"),
    },
    ...(canShowStaffManagement(businessStatus)
      ? [
          {
            key: "team",
            title: t("manageTeamTitle"),
            icon: "account-group",
            family: "community" as const,
            variant: "dark" as const,
            onPress: () => open("team"),
          },
        ]
      : []),
    {
      key: "appointments",
      title: t("appointments"),
      icon: "event-note",
      family: "material",
      variant: "cream",
      onPress: () =>
        router.push("/(main)/dashboard/(account)/allAppointments" as any),
    },
    {
      key: "masterClasses",
      title: t("mcMasterClasses"),
      icon: "school-outline",
      family: "community",
      variant: "dark",
      featured: !masterClassesOpened,
      onPress: () => {
        if (tapOwner) {
          dispatch(
            markGoldTapped({
              owner: tapOwner,
              key: MASTER_CLASSES_OPENED_KEY,
            }),
          );
        }
        router.push("/(main)/masterClasses" as any);
      },
    },
    {
      key: "socialMedia",
      title: t("bmSocialMedia"),
      icon: "share-variant",
      family: "community",
      variant: "dark",
      onPress: () => open("socialMedia"),
    },
    {
      key: "products",
      title: t("productsInventoryShort"),
      icon: "inventory-2",
      family: "material",
      variant: "dark",
      onPress: () => open("products"),
    },
    {
      key: "orders",
      title: t("ordersTitle"),
      icon: "receipt-long",
      family: "material",
      variant: "dark",
      badge: ordersCount,
      onPress: () => open("orders"),
    },
    {
      key: "hiring",
      title: t("jobHiringTitle"),
      icon: "work-outline",
      family: "material",
      variant: "accent",
      onPress: () => {
        if (ensureCanHire()) open("jobPosts");
      },
    },
    {
      key: "myDeals",
      title: t("sdMyDeals"),
      icon: "local-offer",
      family: "material",
      variant: "accent",
      onPress: () => {
        if (ensureCanPostDeals()) router.push("/(main)/myDeals" as any);
      },
    },
    ...(businessStatus?.subscription_status === "active" &&
    businessStatus?.subscription_is_single === false
      ? [
          {
            key: "affiliationRequests",
            title: t("bmAffiliationRequests"),
            icon: "handshake",
            family: "community" as const,
            variant: "dark" as const,
            onPress: () => open("affiliationRequests"),
          },
        ]
      : []),
    {
      key: "mediaLibrary",
      title: t("mediaLibrary"),
      icon: "video-library",
      family: "material",
      variant: "dark",
      onPress: () => router.push("/(main)/aiTools/toolList" as any),
    },
    {
      key: "aiTools",
      title: t("aiTools"),
      icon: "smart-toy",
      family: "material",
      variant: "dark",
      onPress: () =>
        router.push({
          pathname: "/(main)/aiTools/toolList",
          params: { mode: "aiTools" },
        } as any),
    },
    ...(businessId
      ? [
          {
            key: "viewBusinessProfile",
            title: t("viewBusinessProfile"),
            icon: "visibility",
            family: "material" as const,
            variant: "cream" as const,
            onPress: () =>
              router.push({
                pathname: "/(main)/businessDetail",
                params: {
                  business_id: businessId.toString(),
                  viewMode: "true",
                },
              } as any),
          },
        ]
      : []),
  ];

  return (
    <>
      <View style={[styles.grid, { columnGap: gap }]}>
        {tiles.map((tile) => {
          const iconBg =
            tile.variant === "dark"
              ? theme.darkGreen
              : tile.variant === "accent"
                ? theme.selectCard
                : theme.orangeBrown015;
          const iconColor =
            tile.featured || tile.variant !== "cream"
              ? theme.white
              : theme.darkGreen;
          const Icon: any =
            tile.family === "community" ? MaterialCommunityIcons : MaterialIcons;
          const hasBadge = (tile.badge ?? 0) > 0;
          const a11yLabel = [
            tile.title,
            hasBadge ? String(tile.badge) : null,
            tile.featured ? t("mcNewTag") : null,
          ]
            .filter(Boolean)
            .join(", ");

          return (
            <TouchableOpacity
              key={tile.key}
              onPress={tile.onPress}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={a11yLabel}
              style={[styles.tileWrap, { width: tileWidth }]}
            >
              <View style={styles.shadow}>
                <View style={[styles.base, tile.featured && styles.baseFeatured]}>
                  <View style={[styles.face, tile.featured && styles.faceFeatured]}>
                    {tile.featured ? (
                      <Icon
                        name={tile.icon}
                        size={moderateWidthScale(38)}
                        color={theme.white}
                      />
                    ) : (
                      <View
                        style={[
                          styles.iconWrap,
                          { backgroundColor: iconBg },
                          tile.variant === "cream" && styles.iconWrapCream,
                        ]}
                      >
                        <Icon
                          name={tile.icon}
                          size={moderateWidthScale(24)}
                          color={iconColor}
                        />
                      </View>
                    )}
                    <Text
                      style={[
                        styles.title,
                        tile.featured && styles.titleFeatured,
                      ]}
                      numberOfLines={2}
                      maxFontSizeMultiplier={1.2}
                    >
                      {tile.title}
                    </Text>
                  </View>
                </View>
                {tile.featured ? (
                  <View style={styles.newTag} pointerEvents="none">
                    <Text style={styles.newTagText}>{t("mcNewTag")}</Text>
                  </View>
                ) : null}
                {hasBadge ? (
                  <View style={styles.badge} pointerEvents="none">
                    <Text style={styles.badgeText}>
                      {(tile.badge ?? 0) > 9 ? "9+" : tile.badge}
                    </Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      {planModals}
      {planModal}
    </>
  );
}

const TILE_RADIUS = moderateWidthScale(14);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      rowGap: moderateHeightScale(10),
    },
    tileWrap: {
      alignSelf: "stretch",
    },
    shadow: {
      flex: 1,
      borderRadius: TILE_RADIUS,
      ...Platform.select({
        ios: {
          shadowColor: theme.darkGreen,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.18,
          shadowRadius: moderateWidthScale(6),
        },
        android: { elevation: 4, shadowColor: theme.darkGreen },
        default: {},
      }),
    },
    base: {
      flex: 1,
      borderRadius: TILE_RADIUS,
      paddingBottom: moderateHeightScale(2.5),
      backgroundColor: theme.lightGreen16,
    },
    baseFeatured: {
      backgroundColor: theme.orangeBrown,
    },
    face: {
      flex: 1,
      minHeight: moderateHeightScale(112),
      alignItems: "center",
      justifyContent: "center",
      gap: moderateHeightScale(5),
      paddingHorizontal: moderateWidthScale(4),
      paddingVertical: moderateHeightScale(10),
      borderRadius: TILE_RADIUS,
      borderWidth: 1,
      borderColor: theme.lightGreen1,
      backgroundColor: theme.background,
    },
    faceFeatured: {
      backgroundColor: theme.darkGreen,
      borderWidth: 2,
      borderColor: theme.orangeBrown,
    },
    iconWrap: {
      width: moderateWidthScale(44),
      height: moderateWidthScale(44),
      borderRadius: moderateWidthScale(12),
      alignItems: "center",
      justifyContent: "center",
    },
    iconWrapCream: {
      borderWidth: 1,
      borderColor: theme.lightGreen1,
    },
    title: {
      // Full tile width: a shrink-wrapped label can clip its 2nd line on Android
      alignSelf: "stretch",
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      lineHeight: fontSize.size16,
      textAlign: "center",
    },
    titleFeatured: {
      color: theme.white,
    },
    newTag: {
      position: "absolute",
      top: 0,
      right: 0,
      paddingHorizontal: moderateWidthScale(7),
      paddingVertical: moderateHeightScale(2),
      borderTopRightRadius: TILE_RADIUS,
      borderBottomLeftRadius: moderateWidthScale(8),
      backgroundColor: theme.orangeBrown,
    },
    newTagText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      letterSpacing: 0.4,
    },
    badge: {
      position: "absolute",
      top: moderateHeightScale(4),
      right: moderateWidthScale(4),
      minWidth: moderateWidthScale(20),
      height: moderateWidthScale(20),
      borderRadius: moderateWidthScale(10),
      paddingHorizontal: moderateWidthScale(4),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.red,
    },
    badgeText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
  });
