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

/** Look of every Business Management tile (client PDF, Design 1) */
const TILE_META = {
  barberProfile: { titleKey: "myBarberProfile", icon: "person", family: "material", variant: "dark" },
  schedule: { titleKey: "mySchedule", icon: "event-available", family: "material", variant: "accent" },
  portfolio: { titleKey: "myPortfolio", icon: "photo-library", family: "material", variant: "dark" },
  businessProfile: { titleKey: "businessProfileTitle", icon: "storefront", family: "material", variant: "dark" },
  services: { titleKey: "servicesAndMemberships", icon: "content-cut", family: "material", variant: "accent" },
  team: { titleKey: "manageTeamTitle", icon: "account-group", family: "community", variant: "dark" },
  appointments: { titleKey: "appointments", icon: "event-note", family: "material", variant: "cream" },
  masterClasses: { titleKey: "mcTeachAndEarn", icon: "school-outline", family: "community", variant: "dark" },
  socialMedia: { titleKey: "bmSocialMedia", icon: "share-variant", family: "community", variant: "dark" },
  products: { titleKey: "productsInventoryShort", icon: "inventory-2", family: "material", variant: "dark" },
  orders: { titleKey: "ordersTitle", icon: "receipt-long", family: "material", variant: "dark" },
  hiring: { titleKey: "jobHiringTitle", icon: "work-outline", family: "material", variant: "accent" },
  myDeals: { titleKey: "sdMyDeals", icon: "local-offer", family: "material", variant: "accent" },
  offers: { titleKey: "proListTitle", icon: "sell", family: "material", variant: "dark" },
  affiliation: { titleKey: "bmAffiliationRequests", icon: "handshake", family: "community", variant: "dark" },
  mediaLibrary: { titleKey: "mediaLibrary", icon: "video-library", family: "material", variant: "dark" },
  aiTools: { titleKey: "aiTools", icon: "smart-toy", family: "material", variant: "dark" },
  publicProfile: { titleKey: "viewBusinessProfile", icon: "visibility", family: "material", variant: "cream" },
  availability: { titleKey: "mySchedule", icon: "event-available", family: "material", variant: "dark" },
  myAppointments: { titleKey: "myAppointments", icon: "event-note", family: "material", variant: "accent" },
  uploadWork: { titleKey: "myPortfolio", icon: "photo-library", family: "material", variant: "dark" },
  leaveRequest: { titleKey: "leaveRequest", icon: "event-busy", family: "material", variant: "accent" },
} as const satisfies Record<
  string,
  {
    titleKey: string;
    icon: string;
    family: "material" | "community";
    variant: IconVariant;
  }
>;

export type ManagementTileKey = keyof typeof TILE_META;

export type ManagementTile = {
  key: ManagementTileKey;
  /** Replaces the tile's usual title */
  title?: string;
  /** Short status line under the title */
  note?: string;
  onPress: () => void;
};

/**
 * Tiles in 3 columns. Master Classes has its NEW look until the owner opens it
 * once; Orders shows the live count.
 *
 * @param horizontalPadding the parent's side padding, used to size the tiles
 */
export function ManagementTileGrid({
  tiles,
  horizontalPadding,
}: {
  tiles: ManagementTile[];
  horizontalPadding: number;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const dispatch = useAppDispatch();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(theme), [colors]);

  const userId = useAppSelector((s) => s.user.id);
  const userRole = useAppSelector((s) => s.user.userRole);
  const tapOwner = goldTapOwner(userRole, userId);
  const masterClassesOpened = useAppSelector(
    (s) =>
      tapOwner != null &&
      !!s.general.goldTapped?.[tapOwner]?.includes(MASTER_CLASSES_OPENED_KEY),
  );
  // Orders API is owner-only: staff have no Orders tile, so no call for them
  const ordersCount =
    useBusinessOrdersCount(tiles.some((tile) => tile.key === "orders")) ?? 0;

  const gap = moderateWidthScale(8);
  // Fixed width (not space-between) so a short last row stays left aligned
  const tileWidth = Math.floor((width - horizontalPadding * 2 - gap * 2) / 3);

  return (
    <View style={[styles.grid, { columnGap: gap }]}>
      {tiles.map((tile) => {
        const meta = TILE_META[tile.key];
        const title = tile.title ?? t(meta.titleKey);
        const featured = tile.key === "masterClasses" && !masterClassesOpened;
        const badge = tile.key === "orders" ? ordersCount : 0;
        const iconBg =
          meta.variant === "dark"
            ? theme.darkGreen
            : meta.variant === "accent"
              ? theme.selectCard
              : theme.orangeBrown015;
        const iconColor =
          featured || meta.variant !== "cream" ? theme.white : theme.darkGreen;
        const Icon: any =
          meta.family === "community" ? MaterialCommunityIcons : MaterialIcons;
        const a11yLabel = [
          title,
          tile.note,
          badge > 0 ? String(badge) : null,
          featured ? t("mcNewTag") : null,
        ]
          .filter(Boolean)
          .join(", ");

        return (
          <TouchableOpacity
            key={tile.key}
            onPress={() => {
              if (tile.key === "masterClasses" && tapOwner) {
                dispatch(
                  markGoldTapped({
                    owner: tapOwner,
                    key: MASTER_CLASSES_OPENED_KEY,
                  }),
                );
              }
              tile.onPress();
            }}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={a11yLabel}
            style={[styles.tileWrap, { width: tileWidth }]}
          >
            <View style={styles.shadow}>
              <View style={[styles.base, featured && styles.baseFeatured]}>
                <View style={[styles.face, featured && styles.faceFeatured]}>
                  {featured ? (
                    <Icon
                      name={meta.icon}
                      size={moderateWidthScale(38)}
                      color={theme.white}
                    />
                  ) : (
                    <View
                      style={[
                        styles.iconWrap,
                        { backgroundColor: iconBg },
                        meta.variant === "cream" && styles.iconWrapCream,
                      ]}
                    >
                      <Icon
                        name={meta.icon}
                        size={moderateWidthScale(24)}
                        color={iconColor}
                      />
                    </View>
                  )}
                  <Text
                    style={[styles.title, featured && styles.titleFeatured]}
                    numberOfLines={2}
                    maxFontSizeMultiplier={1.2}
                  >
                    {title}
                  </Text>
                  {tile.note ? (
                    <Text
                      style={styles.note}
                      numberOfLines={2}
                      maxFontSizeMultiplier={1.2}
                    >
                      {tile.note}
                    </Text>
                  ) : null}
                </View>
              </View>
              {featured ? (
                <View style={styles.newTag} pointerEvents="none">
                  <Text style={styles.newTagText}>{t("mcNewTag")}</Text>
                </View>
              ) : null}
              {badge > 0 ? (
                <View style={styles.badge} pointerEvents="none">
                  <Text style={styles.badgeText}>
                    {badge > 9 ? "9+" : badge}
                  </Text>
                </View>
              ) : null}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/** Business plan owner: every Business Management item on the Profile page. */
export default function BusinessManagementGrid({
  horizontalPadding,
}: {
  horizontalPadding: number;
}) {
  const router = useRouter();
  const businessStatus = useAppSelector((s) => s.user.businessStatus);
  const userBusinessId = useAppSelector((s) => s.user.business_id);
  const { ensureCanHire, planModals } = useHiringPlanGate();
  const { ensureCanPostDeals, planModal } = useDealsPlanGate();

  const open = (screen: string) =>
    router.push(`${SETTINGS_ROUTE}/${screen}` as any);
  const businessId = userBusinessId ?? businessStatus?.business_id;

  const tiles: ManagementTile[] = [
    { key: "businessProfile", onPress: () => open("businessProfileMenu") },
    { key: "services", onPress: () => open("servicesAndMemberships") },
    ...(canShowStaffManagement(businessStatus)
      ? [{ key: "team" as const, onPress: () => open("team") }]
      : []),
    {
      key: "appointments",
      onPress: () =>
        router.push("/(main)/dashboard/(account)/allAppointments" as any),
    },
    {
      key: "masterClasses",
      onPress: () => router.push("/(main)/masterClasses" as any),
    },
    { key: "socialMedia", onPress: () => open("socialMedia") },
    { key: "products", onPress: () => open("products") },
    { key: "orders", onPress: () => open("orders") },
    {
      key: "hiring",
      onPress: () => {
        if (ensureCanHire()) open("jobPosts");
      },
    },
    {
      key: "myDeals",
      onPress: () => {
        if (ensureCanPostDeals()) router.push("/(main)/myDeals" as any);
      },
    },
    // Profile Promotions: owner / Solo only (staff get 403); the list
    // itself asks for a plan before creating
    {
      key: "offers",
      onPress: () => router.push("/(main)/promotions" as any),
    },
    ...(businessStatus?.subscription_status === "active" &&
    businessStatus?.subscription_is_single === false
      ? [
          {
            key: "affiliation" as const,
            onPress: () => open("affiliationRequests"),
          },
        ]
      : []),
    {
      key: "mediaLibrary",
      onPress: () => router.push("/(main)/aiTools/toolList" as any),
    },
    {
      key: "aiTools",
      onPress: () =>
        router.push({
          pathname: "/(main)/aiTools/toolList",
          params: { mode: "aiTools" },
        } as any),
    },
    ...(businessId
      ? [
          {
            key: "publicProfile" as const,
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
      <ManagementTileGrid tiles={tiles} horizontalPadding={horizontalPadding} />
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
    note: {
      alignSelf: "stretch",
      fontSize: fontSize.size11,
      lineHeight: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.textMuted,
      textAlign: "center",
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
