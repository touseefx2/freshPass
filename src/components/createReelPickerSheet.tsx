import React, { useEffect, useMemo, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { MAX_VIDEO_UPLOAD_SECONDS } from "@/src/services/mediaLibraryService";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";

const androidBlurMethod =
  Platform.OS === "android" ? ("dimezisBlurView" as const) : ("none" as const);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 45,
      justifyContent: "flex-end",
      alignItems: "center",
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
    /** Floating card — sits just above the center X. */
    sheet: {
      width: widthScale(340),
      maxWidth: "92%",
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(24),
      paddingHorizontal: moderateWidthScale(16),
      paddingTop: moderateHeightScale(10),
      paddingBottom: moderateHeightScale(14),
      borderWidth: 1,
      borderColor: theme.borderLight,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: moderateHeightScale(10) },
      shadowOpacity: 0.35,
      shadowRadius: moderateWidthScale(20),
      elevation: 20,
    },
    handle: {
      alignSelf: "center",
      width: widthScale(36),
      height: heightScale(4),
      borderRadius: moderateWidthScale(2),
      backgroundColor: theme.borderNormal,
      marginBottom: moderateHeightScale(12),
    },
    title: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
      marginBottom: moderateHeightScale(4),
    },
    subtitle: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      marginBottom: moderateHeightScale(14),
    },
    optionsRow: {
      flexDirection: "row",
      gap: moderateWidthScale(10),
      marginBottom: moderateHeightScale(10),
    },
    optionCard: {
      flex: 1,
      backgroundColor: theme.lightGreen07,
      borderRadius: moderateWidthScale(16),
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(14),
      alignItems: "center",
    },
    optionCardWide: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      marginBottom: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(12),
    },
    optionIconCircle: {
      width: widthScale(44),
      height: widthScale(44),
      borderRadius: moderateWidthScale(22),
      backgroundColor: theme.buttonBack,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: moderateHeightScale(10),
    },
    optionIconCircleInline: {
      marginBottom: 0,
    },
    optionTextCol: {
      flex: 1,
    },
    optionTitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textAlign: "center",
      marginBottom: moderateHeightScale(4),
    },
    optionTitleLeft: {
      textAlign: "left",
      marginBottom: moderateHeightScale(2),
    },
    optionDesc: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      lineHeight: fontSize.size14,
    },
    optionDescLeft: {
      textAlign: "left",
    },
    typeList: {
      gap: moderateHeightScale(10),
      marginBottom: moderateHeightScale(12),
    },
    typeCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      backgroundColor: theme.lightGreen07,
      borderRadius: moderateWidthScale(16),
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(14),
    },
    typeTitle: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(2),
    },
    typeDesc: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size16,
    },
    cancelButton: {
      backgroundColor: theme.lightGreen015,
      borderRadius: moderateWidthScale(999),
      paddingVertical: moderateHeightScale(13),
      alignItems: "center",
      justifyContent: "center",
    },
    cancelText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
  });

export type CreateReelPickerSheetProps = {
  visible: boolean;
  onClose: () => void;
  /**
   * "Upload a Reel" → step-by-step Reel Studio (Add video → Trim → Style →
   * Preview → Publish). When set, the old Record / Upload source step is skipped.
   */
  onSimpleReelPress?: () => void;
  onRecordPress: () => void;
  onUploadPress: () => void;
  onGenerateFromTemplatePress?: () => void;
  /** Image Reel → AI Tools template reel */
  onImageReelPress: () => void;
  /** AI Reel → AI Tools auto reel */
  onAiReelPress: () => void;
  /** Distance from screen bottom so the card sits just above the center X. */
  bottomOffset: number;
  /** Keep tab bar (and X) clear of the dimmed backdrop. */
  tabBarClearance: number;
};

type PickerStep = "type" | "source";

const REEL_TYPES: {
  key: "simple" | "image" | "ai";
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  titleKey: string;
  descKey: string;
}[] = [
  {
    key: "simple",
    icon: "videocam",
    titleKey: "simpleReelTitle",
    descKey: "simpleReelDesc",
  },
  {
    key: "image",
    icon: "photo-library",
    titleKey: "imageReelTitle",
    descKey: "imageReelDesc",
  },
  {
    key: "ai",
    icon: "auto-awesome",
    titleKey: "aiReelTitle",
    descKey: "aiReelDesc",
  },
];

/**
 * Create Reel picker: first the reel type (Upload / Image / AI), then for
 * Upload the video source (Record / Gallery, max 30s).
 * Floating card just above the center tab FAB — tab bar / X stay visible.
 */
export default function CreateReelPickerSheet({
  visible,
  onClose,
  onSimpleReelPress,
  onRecordPress,
  onUploadPress,
  onGenerateFromTemplatePress,
  onImageReelPress,
  onAiReelPress,
  bottomOffset,
  tabBarClearance,
}: CreateReelPickerSheetProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const [step, setStep] = useState<PickerStep>("type");

  // Every opening starts at the reel type
  useEffect(() => {
    if (!visible) setStep("type");
  }, [visible]);

  if (!visible) return null;

  const handleTypePress = (key: (typeof REEL_TYPES)[number]["key"]) => {
    if (key === "simple") {
      if (onSimpleReelPress) onSimpleReelPress();
      else setStep("source");
    } else if (key === "image") onImageReelPress();
    else onAiReelPress();
  };

  const isTypeStep = step === "type";

  return (
    <View style={styles.root} pointerEvents="box-none">
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.backdrop, { bottom: tabBarClearance }]}>
          <BlurView
            intensity={10}
            tint="light"
            style={styles.blurFill}
            experimentalBlurMethod={androidBlurMethod}
          />
        </View>
      </TouchableWithoutFeedback>
      <View style={[styles.sheet, { marginBottom: bottomOffset }]}>
        <View style={styles.handle} />
        <Text style={styles.title}>
          {isTypeStep ? t("createReel") : t("simpleReelTitle")}
        </Text>
        <Text style={styles.subtitle}>
          {isTypeStep ? t("chooseReelType") : t("chooseHowToAddVideo")}
        </Text>

        {isTypeStep ? (
          <View style={styles.typeList}>
            {REEL_TYPES.map((type) => {
              // Step-by-step studio trims any length — say so instead of the 30 s cap
              const descKey =
                type.key === "simple" && onSimpleReelPress
                  ? "simpleReelDescSteps"
                  : type.descKey;
              return (
              <TouchableOpacity
                key={type.key}
                style={styles.typeCard}
                onPress={() => handleTypePress(type.key)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={t(type.titleKey)}
                accessibilityHint={t(descKey, {
                  max_seconds: MAX_VIDEO_UPLOAD_SECONDS,
                })}
              >
                <View
                  style={[
                    styles.optionIconCircle,
                    styles.optionIconCircleInline,
                  ]}
                >
                  <MaterialIcons
                    name={type.icon}
                    size={moderateWidthScale(22)}
                    color={theme.white}
                  />
                </View>
                <View style={styles.optionTextCol}>
                  <Text style={styles.typeTitle}>{t(type.titleKey)}</Text>
                  <Text style={styles.typeDesc}>
                    {t(descKey, { max_seconds: MAX_VIDEO_UPLOAD_SECONDS })}
                  </Text>
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={moderateWidthScale(22)}
                  color={theme.lightGreen}
                />
              </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <>
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.optionCard}
                onPress={onRecordPress}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={t("recordVideoOption")}
              >
                <View style={styles.optionIconCircle}>
                  <MaterialIcons
                    name="videocam"
                    size={moderateWidthScale(24)}
                    color={theme.white}
                  />
                </View>
                <Text style={styles.optionTitle}>{t("recordVideoOption")}</Text>
                <Text style={styles.optionDesc}>
                  {t("recordVideoDescription")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionCard}
                onPress={onUploadPress}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={t("uploadVideoOption")}
              >
                <View style={styles.optionIconCircle}>
                  <MaterialIcons
                    name="file-upload"
                    size={moderateWidthScale(24)}
                    color={theme.white}
                  />
                </View>
                <Text style={styles.optionTitle}>{t("uploadVideoOption")}</Text>
                <Text style={styles.optionDesc}>
                  {t("uploadVideoDescription")}
                </Text>
              </TouchableOpacity>
            </View>

            {onGenerateFromTemplatePress ? (
              <TouchableOpacity
                style={[styles.optionCard, styles.optionCardWide]}
                onPress={onGenerateFromTemplatePress}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={t("generateFromTemplate")}
              >
                <View
                  style={[
                    styles.optionIconCircle,
                    styles.optionIconCircleInline,
                  ]}
                >
                  <MaterialIcons
                    name="auto-awesome"
                    size={moderateWidthScale(22)}
                    color={theme.white}
                  />
                </View>
                <View style={styles.optionTextCol}>
                  <Text style={[styles.optionTitle, styles.optionTitleLeft]}>
                    {t("generateFromTemplate")}
                  </Text>
                  <Text style={[styles.optionDesc, styles.optionDescLeft]}>
                    {t("generateFromTemplateDescription")}
                  </Text>
                </View>
              </TouchableOpacity>
            ) : null}
          </>
        )}

        {/* Source step goes back to the reel type instead of closing */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={isTypeStep ? onClose : () => setStep("type")}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={isTypeStep ? t("cancel") : t("back")}
        >
          <Text style={styles.cancelText}>
            {isTypeStep ? t("cancel") : t("back")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
