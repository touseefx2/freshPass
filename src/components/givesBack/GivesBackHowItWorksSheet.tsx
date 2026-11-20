import React, { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Modalize } from "react-native-modalize";
import { Portal } from "@gorhom/portal";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { IMAGES } from "@/src/constant/images";

/**
 * "How it works" sheet for FreshPass Gives Back (client sample 11-20):
 * cream sheet, centered icon + title + tagline, 3 numbered steps with
 * dividers, a "does not guarantee assistance" note and a "Got It" button.
 * Own sheet (not ModalizeBottomSheet) because the sample has no header title
 * and a cream background.
 */

const C = {
  sheet: "#FDF5E9",
  ink: "#283618",
  number: "#F5CC7B",
  divider: "#E3DCCB",
  note: "#F8E6BE",
  handle: "#C9C4B8",
  white: "#FFFFFF",
} as const;

// Text may grow with the phone's font size, but only this much
const MAX_FONT_SCALE = 1.3;

const STEPS = [1, 2, 3] as const;

type Props = {
  visible: boolean;
  /** Formatted goal, e.g. "10,000" */
  goal: string;
  onClose: () => void;
};

export default function GivesBackHowItWorksSheet({
  visible,
  goal,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const ref = useRef<Modalize>(null);

  useEffect(() => {
    if (visible) {
      // Portal renders the sheet a frame later, so wait for the ref
      const timer = setTimeout(() => ref.current?.open(), 0);
      return () => clearTimeout(timer);
    }
    ref.current?.close();
  }, [visible]);

  const close = () => ref.current?.close();

  return (
    <Portal>
      <Modalize
        ref={ref}
        onClosed={onClose}
        adjustToContentHeight
        modalTopOffset={insets.top + moderateHeightScale(12)}
        handlePosition="inside"
        handleStyle={styles.handle}
        modalStyle={styles.sheet}
        overlayStyle={styles.overlay}
        onBackButtonPress={() => {
          close();
          return true;
        }}
        HeaderComponent={
          <View style={styles.header}>
            <Pressable
              onPress={close}
              hitSlop={12}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel={t("close")}
            >
              <Feather name="x" size={moderateWidthScale(24)} color={C.ink} />
            </Pressable>
          </View>
        }
        FooterComponent={
          <View
            style={[
              styles.footer,
              { paddingBottom: insets.bottom + moderateHeightScale(14) },
            ]}
          >
            <TouchableOpacity
              style={styles.button}
              onPress={close}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <Text
                style={styles.buttonText}
                numberOfLines={1}
                maxFontSizeMultiplier={MAX_FONT_SCALE}
              >
                {t("givesBackGotIt")}
              </Text>
            </TouchableOpacity>
          </View>
        }
      >
        <View style={styles.content}>
          <Image
            source={IMAGES.givesBackIconOnLight}
            style={styles.icon}
            contentFit="contain"
            accessible={false}
          />
          <Text
            style={styles.title}
            accessibilityRole="header"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            maxFontSizeMultiplier={MAX_FONT_SCALE}
          >
            {t("givesBackTitle")}
          </Text>
          <Text style={styles.tagline} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {t("givesBackHowTagline")}
          </Text>

          <View style={styles.steps}>
            {STEPS.map((n, i) => (
              <View
                key={n}
                style={[styles.step, i > 0 && styles.stepDivider]}
              >
                <View style={styles.number}>
                  <Text
                    style={styles.numberText}
                    maxFontSizeMultiplier={1.2}
                  >
                    {n}
                  </Text>
                </View>
                <View style={styles.stepText}>
                  <Text
                    style={styles.stepTitle}
                    maxFontSizeMultiplier={MAX_FONT_SCALE}
                  >
                    {t(`givesBackHowStep${n}Title`, { goal })}
                  </Text>
                  <Text
                    style={styles.stepBody}
                    maxFontSizeMultiplier={MAX_FONT_SCALE}
                  >
                    {t(`givesBackHowStep${n}Body`, { goal })}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.note}>
            <Feather
              name="info"
              size={moderateWidthScale(18)}
              color={C.ink}
            />
            <Text style={styles.noteText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              {t("givesBackHowDisclaimer")}
            </Text>
          </View>
        </View>
      </Modalize>
    </Portal>
  );
}

const styles = StyleSheet.create({
  overlay: { backgroundColor: "rgba(0, 0, 0, 0.5)" },
  sheet: {
    backgroundColor: C.sheet,
    borderTopLeftRadius: moderateWidthScale(24),
    borderTopRightRadius: moderateWidthScale(24),
  },
  handle: {
    backgroundColor: C.handle,
    width: moderateWidthScale(44),
    height: 5,
  },
  header: {
    alignItems: "flex-end",
    paddingTop: moderateHeightScale(18),
    paddingHorizontal: moderateWidthScale(18),
  },
  closeButton: {
    width: moderateWidthScale(32),
    height: moderateWidthScale(32),
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
    paddingHorizontal: moderateWidthScale(20),
  },
  icon: {
    width: moderateWidthScale(96),
    height: moderateWidthScale(80),
  },
  title: {
    marginTop: moderateHeightScale(8),
    fontSize: fontSize.size28,
    fontFamily: fonts.fontExtraBold,
    color: C.ink,
    textAlign: "center",
  },
  tagline: {
    marginTop: moderateHeightScale(4),
    fontSize: fontSize.size15,
    fontFamily: fonts.fontRegular,
    color: C.ink,
    textAlign: "center",
  },
  steps: {
    alignSelf: "stretch",
    marginTop: moderateHeightScale(18),
  },
  step: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateWidthScale(14),
    paddingVertical: moderateHeightScale(14),
  },
  stepDivider: {
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: C.divider,
  },
  number: {
    width: moderateWidthScale(36),
    height: moderateWidthScale(36),
    borderRadius: moderateWidthScale(18),
    backgroundColor: C.number,
    alignItems: "center",
    justifyContent: "center",
  },
  numberText: {
    fontSize: fontSize.size18,
    fontFamily: fonts.fontBold,
    color: C.ink,
  },
  stepText: { flex: 1, minWidth: 0, gap: moderateHeightScale(3) },
  stepTitle: {
    fontSize: fontSize.size17,
    fontFamily: fonts.fontBold,
    color: C.ink,
  },
  stepBody: {
    fontSize: fontSize.size14,
    fontFamily: fonts.fontRegular,
    color: C.ink,
    lineHeight: fontSize.size14 * 1.4,
  },
  note: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    gap: moderateWidthScale(10),
    marginTop: moderateHeightScale(10),
    marginBottom: moderateHeightScale(16),
    paddingHorizontal: moderateWidthScale(14),
    paddingVertical: moderateHeightScale(12),
    borderRadius: moderateWidthScale(12),
    backgroundColor: C.note,
  },
  noteText: {
    flex: 1,
    fontSize: fontSize.size13,
    fontFamily: fonts.fontMedium,
    color: C.ink,
  },
  footer: {
    paddingHorizontal: moderateWidthScale(20),
    paddingTop: moderateHeightScale(4),
    backgroundColor: C.sheet,
  },
  button: {
    minHeight: heightScale(50),
    borderRadius: moderateWidthScale(14),
    backgroundColor: C.ink,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: moderateWidthScale(16),
  },
  buttonText: {
    fontSize: fontSize.size18,
    fontFamily: fonts.fontBold,
    color: C.white,
  },
});
