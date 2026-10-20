import React, { useMemo } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import AppImage from "@/src/components/AppImage";
import { resolveApiImageUrl } from "@/src/utils/media";
import type { ReviewListItem } from "@/src/types/reviews";
import { parseRating, ReviewMediaStrip } from "./reviewMedia";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      width: widthScale(264),
      padding: moderateWidthScale(14),
      borderRadius: moderateWidthScale(18),
      borderWidth: 1,
      borderColor: theme.borderLight,
      backgroundColor: theme.lightGreen05,
      gap: moderateHeightScale(8),
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
    },
    avatar: {
      width: widthScale(36),
      height: widthScale(36),
      borderRadius: widthScale(18),
      overflow: "hidden",
      backgroundColor: theme.lightGreen1,
      alignItems: "center",
      justifyContent: "center",
    },
    initial: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    who: { flex: 1 },
    name: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    date: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginTop: moderateHeightScale(1),
    },
    stars: { flexDirection: "row", gap: moderateWidthScale(1) },
    suggestion: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.selectCard,
    },
    comment: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: fontSize.size18,
    },
  });

/** Compact review for a horizontal row (staff profile). */
export default function ReviewPreviewCard({
  review,
  style,
}: {
  review: ReviewListItem;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const rating = parseRating(review.overall_rating);
  const name =
    review.user?.name || review.user?.email?.split("@")[0] || "User";
  const avatar = resolveApiImageUrl(
    review.user?.profile_image_url || review.user?.avatar,
  );
  const fallback = (
    <View style={styles.avatar}>
      <Text style={styles.initial}>{name.charAt(0).toUpperCase()}</Text>
    </View>
  );
  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        {avatar ? (
          <AppImage uri={avatar} style={styles.avatar} fallback={fallback} />
        ) : (
          fallback
        )}
        <View style={styles.who}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {review.created_at ? (
            <Text style={styles.date} numberOfLines={1}>
              {review.created_at}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <MaterialIcons
            key={star}
            name={
              rating >= star
                ? "star"
                : rating >= star - 0.5
                  ? "star-half"
                  : "star-border"
            }
            size={moderateWidthScale(16)}
            color={rating >= star - 0.5 ? theme.orangeBrown : theme.lightGreen2}
          />
        ))}
      </View>
      {review.review_suggestion?.title ? (
        <Text style={styles.suggestion} numberOfLines={1}>
          {review.review_suggestion.title}
        </Text>
      ) : null}
      {review.comment ? (
        <Text style={styles.comment} numberOfLines={3}>
          {review.comment}
        </Text>
      ) : null}
      <ReviewMediaStrip
        imageUrl={review.image_url}
        videoUrl={review.video_url}
        size={widthScale(52)}
      />
    </View>
  );
}
