import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { PlatformVerifiedStarIcon, StarIconSmall } from "@/assets/icons";
import RetryButton from "@/src/components/retryButton";
import Button from "@/src/components/button";
import InclusionsModal from "@/src/components/inclusionsModal";
import { createStyles } from "./styles";
import type {
  ServiceItem,
  SubscriptionItem,
} from "@/src/components/businessList";

export interface VerifiedSalon {
  id: number;
  businessName: string;
  address: string;
  rating: number;
  reviewCount: number;
  image: string | null;
  services?: ServiceItem[];
  subscriptions?: SubscriptionItem[];
}

export type ListStyles = ReturnType<typeof createStyles>;

export function BusinessCard({
  item: salon,
  styles,
}: {
  item: VerifiedSalon;
  styles: ListStyles;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const router = useRouter();

  return (
    <View style={styles.verifiedSalonCardNew}>
      <Image
        source={{ uri: salon.image ?? "" }}
        style={styles.verifiedSalonImage}
        resizeMode="cover"
      />
      <View style={styles.verifiedSalonContent}>
        <View style={styles.platformVerifiedBadge}>
          <PlatformVerifiedStarIcon
            width={widthScale(10)}
            height={heightScale(10)}
          />
          <Text style={styles.platformVerifiedText}>
            {t("platformVerified")}
          </Text>
        </View>
        <View style={styles.businessInfoContainer}>
          <Text numberOfLines={1} style={styles.verifiedSalonBusinessName}>
            {salon.businessName}
          </Text>
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
          <TouchableOpacity
            style={styles.verifiedSalonViewDetail}
            onPress={() => {
              router.push({
                pathname: "/(main)/businessDetail",
                params: { business_id: salon.id.toString() },
              } as any);
            }}
          >
            <Text style={styles.verifiedSalonViewDetailText}>
              {t("viewDetail")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export function ListEmptySection({
  businessesLoading,
  businessesError,
  onRetry,
  styles,
}: {
  businessesLoading: boolean;
  businessesError: boolean;
  onRetry: () => void;
  styles: ListStyles;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;

  if (businessesLoading) {
    return (
      <View style={[styles.loadingContainer, { alignSelf: "stretch" }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }
  if (businessesError) {
    return (
      <View style={[styles.errorContainer, { alignSelf: "stretch" }]}>
        <Text style={styles.errorText}>{t("failedToLoadBusinesses")}</Text>
        <RetryButton onPress={onRetry} loading={businessesLoading} />
      </View>
    );
  }
  return (
    <View style={[styles.emptyContainer, { alignSelf: "stretch" }]}>
      <Text style={styles.emptyText}>{t("noBusinessesFound")}</Text>
    </View>
  );
}

export function BusinessCardType({
  item: salon,
  styles,
  type,
  index,
}: {
  item: VerifiedSalon;
  styles: ListStyles;
  type: "individual" | "subscriptions";
  index?: number;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const router = useRouter();
  const [inclusionsModalVisible, setInclusionsModalVisible] = useState(false);
  const [selectedInclusions, setSelectedInclusions] = useState<string[]>([]);

  const hasServices = (salon.services?.length ?? 0) > 0;
  const hasSubscriptions = (salon.subscriptions?.length ?? 0) > 0;
  const isIndividual = type === "individual";

  const handleBusinessDetailPress = () => {
    router.push({
      pathname: "/(main)/businessDetail",
      params: { business_id: salon.id.toString() },
    } as any);
  };

  return (
    <View>
      <View
        style={[
          styles.sectionHeader,
          {
            marginTop: moderateHeightScale(16),
            marginBottom: moderateHeightScale(10),
          },
        ]}
      >
        <Text
          onPress={handleBusinessDetailPress}
          style={styles.sectionSubTitle}
        >
          {salon.businessName}
        </Text>
        <Text
          onPress={handleBusinessDetailPress}
          style={styles.sectionSubTitle2}
        >
          {t("viewDetail")}
        </Text>
      </View>

      {isIndividual && hasServices && (
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.servicesScroll}
        >
          {salon.services!.map((service) => (
            <View key={service.id} style={[styles.serviceCard, styles.shadow]}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingHorizontal: moderateWidthScale(12),
                }}
              >
                <View style={{ gap: moderateHeightScale(8), width: "70%" }}>
                  <Text style={styles.serviceTitle}>{service.title}</Text>
                  <Text numberOfLines={2} style={styles.serviceDescription}>
                    {service.description}
                  </Text>
                </View>
                <View style={styles.servicePrice}>
                  <Text style={styles.priceCurrent}>${service.price}</Text>
                  <Text style={styles.priceOriginal}>
                    ${service.originalPrice}
                  </Text>
                </View>
              </View>
              <View style={styles.line} />
              <View style={styles.serviceBottomRow}>
                <Text numberOfLines={1} style={styles.serviceDuration}>
                  {service.duration}
                </Text>
                <View style={styles.serviceButtonContainer}>
                  <Button
                    title={t("bookNow")}
                    onPress={() => {
                      router.push({
                        pathname: "/(main)/bookingNow",
                        params: {
                          business_id: salon.id.toString(),
                          service_id: service.id.toString(),
                        },
                      } as any);
                    }}
                    containerStyle={styles.button}
                    textStyle={styles.buttonText}
                  />
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {isIndividual && !hasServices && (
        <View style={styles.noListFoundContainer}>
          <Text style={styles.noListFoundText}>{t("noServicesFound")}</Text>
        </View>
      )}

      {!isIndividual && hasSubscriptions && (
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.servicesScroll}
        >
          {salon.subscriptions!.map((subscription) => (
            <View
              key={subscription.id}
              style={[styles.subscriptionCard, styles.shadow]}
            >
              <View
                style={{
                  paddingHorizontal: moderateWidthScale(16),
                  padding: moderateHeightScale(16),
                  flex: 1,
                  justifyContent: "space-between",
                }}
              >
                <View style={styles.offerBadgesContainer}>
                  {subscription.offer && (
                    <View style={[styles.offerBadge, styles.offerBadgeOrange]}>
                      <Text style={styles.offerText}>{subscription.offer}</Text>
                    </View>
                  )}
                  {subscription.offer2 && (
                    <View style={[styles.offerBadge, styles.offerBadgeGreen]}>
                      <Text
                        style={[styles.offerText, { color: theme.darkGreen }]}
                      >
                        {subscription.offer2}
                      </Text>
                    </View>
                  )}
                </View>
                <View>
                  <Text numberOfLines={1} style={styles.subscriptionTitle}>
                    {subscription.title}
                  </Text>
                  {subscription.inclusions.length > 2 ? (
                    <>
                      {subscription.inclusions
                        .slice(0, 2)
                        .map((inclusion, index) => (
                          <Text
                            numberOfLines={1}
                            key={index}
                            style={styles.inclusionItem}
                          >
                            {inclusion}
                          </Text>
                        ))}
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedInclusions(subscription.inclusions);
                          setInclusionsModalVisible(true);
                        }}
                      >
                        <Text style={styles.moreText}>
                          and +{subscription.inclusions.length - 2} more
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    subscription.inclusions.map((inclusion, index) => (
                      <Text
                        numberOfLines={1}
                        key={index}
                        style={styles.inclusionItem}
                      >
                        {inclusion}
                      </Text>
                    ))
                  )}
                </View>
                <View style={styles.subscriptionPrice}>
                  <View style={styles.subscriptionPriceContainer}>
                    <Text style={styles.priceCurrent}>
                      ${subscription.price}
                    </Text>
                    {subscription.originalPrice ? (
                      <Text style={styles.priceOriginal}>
                        ${subscription.originalPrice}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.subscriptionButtonContainer}>
                    <Button
                      title={t("bookNow")}
                      onPress={() => {
                        router.push({
                          pathname: "/(main)/bookingNow/checkoutSubscription",
                          params: {
                            subscriptionId: subscription.id.toString(),
                            businessId: salon.id.toString(),
                            screenName: "Explore",
                          },
                        } as any);
                      }}
                      containerStyle={styles.button}
                      textStyle={styles.buttonText}
                    />
                  </View>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {!isIndividual && !hasSubscriptions && (
        <View style={styles.noListFoundContainer}>
          <Text style={styles.noListFoundText}>No subscription list found</Text>
        </View>
      )}

      <InclusionsModal
        visible={inclusionsModalVisible}
        onClose={() => setInclusionsModalVisible(false)}
        inclusions={selectedInclusions}
      />
    </View>
  );
}
