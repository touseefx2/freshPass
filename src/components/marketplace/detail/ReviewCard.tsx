import React, { memo, useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import AppImage from "@/src/components/AppImage";
import { useAppDispatch, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { openFullImageModal } from "@/src/state/slices/generalSlice";
import type { ProductReview } from "@/src/types/marketplace";
import StarRow from "./StarRow";

type Props = {
  review: ProductReview;
  /** Own review: Edit / Delete buttons. */
  onEdit?: () => void;
  onDelete?: () => void;
  deleting?: boolean;
  /** Card (own review highlighted) or flat row inside a card. */
  flat?: boolean;
};

const AVATAR = widthScale(40);
const PHOTO = widthScale(76);

export function formatReviewDate(iso: string): string {
  if (!iso) return "";
  const date = dayjs(iso);
  return date.isValid() ? date.format("MMM D, YYYY") : "";
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(18),
      padding: moderateWidthScale(16),
      gap: moderateHeightScale(10),
      shadowColor: theme.darkGreen,
      shadowOffset: { width: 0, height: moderateHeightScale(3) },
      shadowOpacity: 0.06,
      shadowRadius: moderateWidthScale(8),
      elevation: 2,
    },
    cardMine: {
      borderWidth: 1.5,
      borderColor: theme.orangeBrown,
    },
    flat: {
      paddingVertical: moderateHeightScale(14),
      gap: moderateHeightScale(10),
    },
    mineLabel: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(3),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.orangeBrown01,
    },
    mineLabelText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.selectCard,
    },
    head: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
    },
    avatar: {
      width: AVATAR,
      height: AVATAR,
      borderRadius: AVATAR / 2,
      overflow: "hidden",
      backgroundColor: theme.orangeBrown01,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarImage: {
      width: "100%",
      height: "100%",
    },
    initial: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.selectCard,
    },
    headText: {
      flex: 1,
      gap: moderateHeightScale(3),
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: moderateWidthScale(6),
    },
    name: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    verified: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(3),
      paddingHorizontal: moderateWidthScale(7),
      paddingVertical: moderateHeightScale(2),
      borderRadius: moderateWidthScale(9),
      backgroundColor: theme.mintTint,
    },
    verifiedText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.successGreen,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    date: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    option: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    comment: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: fontSize.size14 * 1.5,
    },
    photo: {
      width: PHOTO,
      height: PHOTO,
      borderRadius: moderateWidthScale(12),
      overflow: "hidden",
      backgroundColor: theme.surfaceRaised,
    },
    hiddenNote: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(8),
      padding: moderateWidthScale(10),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.lightRed,
    },
    hiddenText: {
      flex: 1,
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.red,
      lineHeight: fontSize.size13 * 1.45,
    },
    actions: {
      flexDirection: "row",
      gap: moderateWidthScale(10),
    },
    action: {
      flex: 1,
      minHeight: heightScale(44),
      borderRadius: heightScale(22),
      borderWidth: 1.5,
      borderColor: theme.darkGreen,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(6),
    },
    actionDanger: {
      borderColor: theme.red,
    },
    actionText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    actionTextDanger: {
      color: theme.red,
    },
    busy: {
      opacity: 0.5,
    },
  });

/** One product review: reviewer, stars, date, option, comment, photo. */
function ReviewCard({ review, onEdit, onDelete, deleting = false, flat = false }: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const name = review.reviewer.name || t("mpRevCustomer");
  const date = formatReviewDate(review.createdAt);
  const showActions = review.isMine && (onEdit || onDelete);

  return (
    <View
      style={
        flat
          ? styles.flat
          : [styles.card, review.isMine && styles.cardMine]
      }
    >
      {review.isMine ? (
        <View style={styles.mineLabel}>
          <MaterialIcons
            name="person"
            size={moderateWidthScale(14)}
            color={theme.selectCard}
          />
          <Text style={styles.mineLabelText}>{t("avYourReview")}</Text>
        </View>
      ) : null}

      <View style={styles.head}>
        <View style={styles.avatar}>
          {review.reviewer.imageUrl ? (
            <AppImage
              uri={review.reviewer.imageUrl}
              style={styles.avatarImage}
              contentFit="cover"
            />
          ) : (
            <Text style={styles.initial}>{name.charAt(0).toUpperCase()}</Text>
          )}
        </View>
        <View style={styles.headText}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            {review.verifiedBuyer ? (
              <View style={styles.verified}>
                <MaterialIcons
                  name="verified"
                  size={moderateWidthScale(13)}
                  color={theme.successGreen}
                />
                <Text style={styles.verifiedText}>{t("mpRevVerifiedBuyer")}</Text>
              </View>
            ) : null}
          </View>
          <View
            style={styles.metaRow}
            accessible
            accessibilityLabel={[
              t("avStarsLabel", { count: review.rating }),
              date,
            ]
              .filter(Boolean)
              .join(", ")}
          >
            <StarRow value={review.rating} size={moderateWidthScale(15)} />
            {date ? <Text style={styles.date}>{date}</Text> : null}
          </View>
        </View>
      </View>

      {review.variantName ? (
        <Text style={styles.option}>
          {t("mpRevOption", { name: review.variantName })}
        </Text>
      ) : null}

      {review.comment ? <Text style={styles.comment}>{review.comment}</Text> : null}

      {review.photoUrl ? (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() =>
            dispatch(
              openFullImageModal({ images: [review.photoUrl!], initialIndex: 0 }),
            )
          }
          style={styles.photo}
          accessibilityRole="imagebutton"
          accessibilityLabel={t("rvViewPhoto")}
        >
          <AppImage
            uri={review.photoUrl}
            style={styles.avatarImage}
            contentFit="cover"
          />
        </TouchableOpacity>
      ) : null}

      {review.isMine && review.hidden ? (
        <View style={styles.hiddenNote} accessibilityRole="alert">
          <MaterialIcons
            name="visibility-off"
            size={moderateWidthScale(18)}
            color={theme.red}
          />
          <Text style={styles.hiddenText}>{t("mpRevHiddenNote")}</Text>
        </View>
      ) : null}

      {showActions ? (
        <View style={styles.actions}>
          {onEdit ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onEdit}
              disabled={deleting}
              style={[styles.action, deleting && styles.busy]}
              accessibilityRole="button"
              accessibilityLabel={t("mpRevEditTitle")}
              accessibilityState={{ disabled: deleting }}
            >
              <MaterialIcons
                name="edit"
                size={moderateWidthScale(18)}
                color={theme.darkGreen}
              />
              <Text style={styles.actionText}>{t("edit")}</Text>
            </TouchableOpacity>
          ) : null}
          {onDelete ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onDelete}
              disabled={deleting}
              style={[styles.action, styles.actionDanger, deleting && styles.busy]}
              accessibilityRole="button"
              accessibilityLabel={t("mpRevDeleteTitle")}
              accessibilityState={{ disabled: deleting, busy: deleting }}
            >
              <MaterialIcons
                name="delete-outline"
                size={moderateWidthScale(18)}
                color={theme.red}
              />
              <Text style={[styles.actionText, styles.actionTextDanger]}>
                {t("delete")}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export default memo(ReviewCard);
