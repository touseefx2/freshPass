import React, { useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Image,
} from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import Button from "@/src/components/button";

export interface ServiceItem {
  id: number;
  title: string;
  price: number;
  originalPrice: number;
  description: string;
  duration: string;
}

export interface SubscriptionItem {
  id: number;
  title: string;
  price: number;
  originalPrice: number;
  offer: string;
  offer2?: string;
  inclusions: string[];
  image: string | null;
}

export interface BusinessListData {
  businessName: string;
  type: "individual" | "subscription";
  services?: ServiceItem[];
  subscriptions?: SubscriptionItem[];
}

interface BusinessListProps {
  data: BusinessListData | null;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    contentContainer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(50),
    },
    listContent: {
      paddingBottom: moderateHeightScale(20),
    },
    // Service Card Styles
    serviceCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(12),
      paddingVertical: moderateWidthScale(12),
      marginBottom: moderateHeightScale(12),
      width: "100%",
      minHeight: heightScale(120),
      justifyContent: "space-between",
    },
    shadow: {
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.18,
      shadowRadius: 1.0,
      elevation: 1,
    },
    serviceTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    servicePrice: {
      alignItems: "flex-end",
      gap: moderateWidthScale(4),
    },
    priceCurrent: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    priceOriginal: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen4,
      textDecorationLine: "line-through",
    },
    serviceDescription: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(8),
    },
    line: {
      height: 0.5,
      width: "100%",
      backgroundColor: theme.borderLight,
    },
    serviceBottomRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(12),
    },
    serviceDuration: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      maxWidth: "65%",
    },
    serviceButtonContainer: {
      alignSelf: "flex-end",
    },
    button: {
      backgroundColor: theme.bookNowButton,
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(6),
      height: moderateHeightScale(28),
      borderRadius: moderateWidthScale(999),
    },
    buttonText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
    },
    // Subscription Card Styles
    subscriptionCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(12),
      width: "100%",
      minHeight: heightScale(330),
      overflow: "hidden",
      marginBottom: moderateHeightScale(12),
    },
    subscriptionImage: {
      width: "100%",
      height: heightScale(140),
      borderTopLeftRadius: moderateWidthScale(8),
      borderTopRightRadius: moderateWidthScale(8),
      marginBottom: moderateHeightScale(12),
      backgroundColor: theme.lightGreen2,
      overflow: "hidden",
    },
    offerBadgesContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: moderateWidthScale(4),
    },
    offerBadge: {
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(999),
      alignSelf: "flex-start",
    },
    offerBadgeOrange: {
      backgroundColor: theme.selectCard,
    },
    offerBadgeGreen: {
      borderWidth: 1,
      borderColor: theme.lightGreen,
      borderRadius: moderateWidthScale(999),
    },
    offerText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    subscriptionTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginVertical: moderateHeightScale(8),
    },
    inclusionItem: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(2),
    },
    subscriptionPrice: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(8),
    },
    subscriptionPriceContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
    },
    subscriptionButtonContainer: {
      alignSelf: "flex-end",
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(40),
    },
    emptyStateText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
  });

export default function BusinessList({ data }: BusinessListProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);

  if (!data) {
    return (
      <View style={styles.container}>
        <StackHeader title="Business List" />
        <View style={styles.contentContainer}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No data available</Text>
          </View>
        </View>
      </View>
    );
  }

  const items = data.type === "individual" ? data.services || [] : data.subscriptions || [];

  const renderServiceItem = ({ item }: { item: ServiceItem }) => {
    return (
      <View style={[styles.serviceCard, styles.shadow]}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            paddingHorizontal: moderateWidthScale(12),
          }}
        >
          <View
            style={{
              gap: moderateHeightScale(8),
              width: "70%",
            }}
          >
            <Text style={styles.serviceTitle}>{item.title}</Text>
            <Text
              numberOfLines={2}
              style={styles.serviceDescription}
            >
              {item.description}
            </Text>
          </View>
          <View style={styles.servicePrice}>
            <Text style={styles.priceCurrent}>
              ${item.price}
            </Text>
            <Text style={styles.priceOriginal}>
              ${item.originalPrice}
            </Text>
          </View>
        </View>

        <View style={styles.line} />
        <View style={styles.serviceBottomRow}>
          <Text numberOfLines={1} style={styles.serviceDuration}>
            {item.duration}
          </Text>
          <View style={styles.serviceButtonContainer}>
            <Button
              title="Book Now"
              onPress={() => {}}
              containerStyle={styles.button}
              textStyle={styles.buttonText}
            />
          </View>
        </View>
      </View>
    );
  };

  const renderSubscriptionItem = ({ item }: { item: SubscriptionItem }) => {
    return (
      <View style={[styles.subscriptionCard, styles.shadow]}>
        <Image
          source={{
            uri:
              item.image ||
              "https://imgcdn.stablediffusionweb.com/2024/3/24/3b153c48-649f-4ee2-b1cc-3d45333db028.jpg",
          }}
          style={styles.subscriptionImage}
          resizeMode="cover"
        />
        <View
          style={{
            paddingHorizontal: moderateWidthScale(8),
            flex: 1,
            justifyContent: "space-between",
          }}
        >
          <View style={styles.offerBadgesContainer}>
            {item.offer && (
              <View
                style={[
                  styles.offerBadge,
                  styles.offerBadgeOrange,
                ]}
              >
                <Text style={styles.offerText}>
                  {item.offer}
                </Text>
              </View>
            )}
            {item.offer2 && (
              <View
                style={[
                  styles.offerBadge,
                  styles.offerBadgeGreen,
                ]}
              >
                <Text
                  style={[
                    styles.offerText,
                    { color: theme.darkGreen },
                  ]}
                >
                  {item.offer2}
                </Text>
              </View>
            )}
          </View>
          <View>
            <Text
              numberOfLines={1}
              style={styles.subscriptionTitle}
            >
              {item.title}
            </Text>
            {item.inclusions && item.inclusions.length > 0 && (
              <View>
                {item.inclusions.slice(0, 3).map((inclusion, index) => (
                  <Text
                    key={index}
                    numberOfLines={1}
                    style={styles.inclusionItem}
                  >
                    {inclusion}
                  </Text>
                ))}
                {item.inclusions.length > 3 && (
                  <Text style={styles.inclusionItem}>...</Text>
                )}
              </View>
            )}
          </View>
          <View style={styles.subscriptionPrice}>
            <View style={styles.subscriptionPriceContainer}>
              <Text style={styles.priceCurrent}>
                ${item.price}
              </Text>
              <Text style={styles.priceOriginal}>
                ${item.originalPrice}
              </Text>
            </View>
            <View style={styles.subscriptionButtonContainer}>
              <Button
                title="Book Now"
                onPress={() => {}}
                containerStyle={styles.button}
                textStyle={styles.buttonText}
              />
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StackHeader title={data.businessName} />
      <FlatList
        data={items}
        renderItem={data.type === "individual" ? renderServiceItem : renderSubscriptionItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[styles.contentContainer, styles.listContent]}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

