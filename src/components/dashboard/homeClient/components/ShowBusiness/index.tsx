import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import AppImage from "@/src/components/AppImage";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { heightScale, widthScale } from "@/src/theme/dimensions";
import { PlatformVerifiedStarIcon, StarIconSmall } from "@/assets/icons";
import RetryButton from "@/src/components/retryButton";
import {
  BusinessCornerBadges,
  hasBusinessGoldFrame,
} from "@/src/components/jobs/jobBadges";
import { createStyles } from "./styles";
import ClassDealCard from "@/src/components/masterClasses/ClassDealCard";
import type { MasterClass } from "@/src/types/masterClass";
import { mixDealsWithClasses } from "@/src/utils/masterClassHelpers";
import InviteProBanner, {
  withInviteBanners,
} from "@/src/components/invitePro/InviteProBanner";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface VerifiedSalon {
  id: number;
  businessName: string;
  address: string;
  rating: number;
  reviewCount: number;
  image: string | null;
  ownerName?: string | null;
  isHiring?: boolean;
  hasClass?: boolean;
}

interface ShowBusinessProps {
  businessesLoading: boolean;
  businessesError: boolean;
  verifiedSalons: VerifiedSalon[];
  onRetry: () => void;
  /** FreshPass Deals only: listed master classes mixed into the row. */
  classes?: MasterClass[];
  /** FreshPass Deals only: Invite a Pro banner after every 3 cards. */
  showInviteBanner?: boolean;
}

const NO_CLASSES: MasterClass[] = [];

export default function ShowBusiness({
  businessesLoading,
  businessesError,
  verifiedSalons,
  onRetry,
  classes = NO_CLASSES,
  showInviteBanner = false,
}: ShowBusinessProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();
  const hasHiring = verifiedSalons.some(hasBusinessGoldFrame);
  const hasClasses = classes.length > 0;
  const hasCornerBadge = hasHiring || hasClasses;
  const dealItems = useMemo(
    () => (hasClasses ? mixDealsWithClasses(verifiedSalons, classes) : []),
    [hasClasses, verifiedSalons, classes],
  );
  // Banner count runs over every card shown (businesses + classes, mixed)
  const rowItems = useMemo(() => {
    const cards = hasClasses
      ? dealItems
      : verifiedSalons.map((item) => ({ kind: "business" as const, item }));
    return showInviteBanner
      ? withInviteBanners(cards)
      : cards.map((item) => ({ kind: "item" as const, item }));
  }, [hasClasses, dealItems, verifiedSalons, showInviteBanner]);

  const renderRowItems = () =>
    rowItems.map((entry) =>
      entry.kind === "banner" ? (
        <InviteProBanner key={entry.key} variant="row" />
      ) : entry.item.kind === "business" ? (
        renderSalon(entry.item.item)
      ) : (
        <ClassDealCard
          key={`class-${entry.item.item.id}`}
          masterClass={entry.item.item}
        />
      ),
    );

  const renderSalon = (salon: VerifiedSalon) => (
    <TouchableOpacity
      onPress={() => {
        router.push({
          pathname: "/(main)/businessDetail",
          params: { business_id: salon.id.toString() },
        } as any);
      }}
      activeOpacity={0.9}
      key={salon.id}
      style={[
        styles.verifiedSalonCardNew,
        hasBusinessGoldFrame(salon) && styles.verifiedSalonCardHiring,
      ]}
    >
      <BusinessCornerBadges hiring={salon.isHiring} hasClass={salon.hasClass} />
      <AppImage
        uri={salon.image}
        style={styles.verifiedSalonImage}
        iconSize={widthScale(36)}
        iconColor={theme.white50}
      />

      <View style={styles.verifiedSalonContent}>
        <View style={styles.platformVerifiedBadge}>
          <PlatformVerifiedStarIcon
            width={widthScale(10)}
            height={heightScale(10)}
          />
          <Text style={styles.platformVerifiedText}>
            Platform verified
          </Text>
        </View>
        <View style={styles.businessInfoContainer}>
          <Text
            numberOfLines={1}
            style={styles.verifiedSalonBusinessName}
          >
            {salon.businessName}
          </Text>
          {!!salon.ownerName && (
            <Text numberOfLines={1} style={styles.verifiedSalonOwnerName}>
              {t("ownedBy", { name: salon.ownerName })}
            </Text>
          )}
          <Text numberOfLines={1} style={styles.verifiedSalonAddress}>
            {salon.address}
          </Text>
        </View>
        <View style={styles.verifiedSalonBottomRow}>
          <View style={styles.verifiedSalonRatingButton}>
            <StarIconSmall
              width={widthScale(12)}
              height={heightScale(12)}
              color={theme.orangeBrown}
            />
            <Text style={styles.verifiedSalonRatingText}>
              {salon.rating || 0}/ {salon.reviewCount || 0} reviews
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      decelerationRate={0.8}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={hasCornerBadge ? styles.appCardHiring : styles.appCard}
      contentContainerStyle={[
        styles.appointmentsScroll,
        hasCornerBadge && styles.appointmentsScrollHiring,
      ]}
      nestedScrollEnabled={true}
    >
      {businessesLoading && verifiedSalons.length <= 0 && !hasClasses ? (
        <View
          style={[
            styles.loadingContainer,
            {
              width: SCREEN_WIDTH,
            },
          ]}
        >
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : businessesError && !hasClasses ? (
        <View
          style={[
            styles.errorContainer,
            {
              width: SCREEN_WIDTH,
            },
          ]}
        >
          <Text style={styles.errorText}>Failed to load businesses</Text>
          <RetryButton onPress={onRetry} loading={businessesLoading} />
        </View>
      ) : hasClasses ? (
        <>
          {renderRowItems()}
          {businessesLoading && verifiedSalons.length <= 0 ? (
            <View style={styles.classesTrailingState}>
              <ActivityIndicator size="small" color={theme.primary} />
            </View>
          ) : businessesError ? (
            <View style={styles.classesTrailingState}>
              <Text style={styles.errorText}>
                {t("failedToLoadBusinesses")}
              </Text>
              <RetryButton onPress={onRetry} loading={businessesLoading} />
            </View>
          ) : null}
        </>
      ) : verifiedSalons.length > 0 ? (
        renderRowItems()
      ) : (
        <View
          style={[
            styles.emptyContainer,
            {
              width: SCREEN_WIDTH,
            },
          ]}
        >
          <Text style={styles.emptyText}>No businesses found</Text>
        </View>
      )}
    </ScrollView>
  );
}
