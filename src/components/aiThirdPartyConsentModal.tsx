import React, { useMemo, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateWidthScale,
  moderateHeightScale,
  widthScale,
  iconScale,
} from "@/src/theme/dimensions";
import Button from "@/src/components/button";
import { Feather } from "@expo/vector-icons";

const PRIVACY_POLICY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL || "";

export type AiThirdPartyConsentVariant = "chat" | "voice";

interface AiThirdPartyConsentModalProps {
  variant: AiThirdPartyConsentVariant;
  visible: boolean;
  onAgree: () => void;
  onDecline: () => void;
}

const VARIANT_KEYS: Record<
  AiThirdPartyConsentVariant,
  { title: string; intro: string; bullets: string[] }
> = {
  chat: {
    title: "aiChatConsentTitle",
    intro: "aiChatConsentIntro",
    bullets: [
      "aiChatConsentBulletData",
      "aiChatConsentBulletRecipient",
      "aiChatConsentBulletRetention",
      "aiChatConsentBulletOptional",
    ],
  },
  voice: {
    title: "aiVoiceConsentTitle",
    intro: "aiVoiceConsentIntro",
    bullets: [
      "aiVoiceConsentBulletData",
      "aiVoiceConsentBulletRecipient",
      "aiVoiceConsentBulletRetention",
      "aiVoiceConsentBulletOptional",
    ],
  },
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(20),
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.shadow,
      opacity: 0.45,
    },
    modalContainer: {
      backgroundColor: theme.background,
      borderRadius: moderateWidthScale(24),
      width: widthScale(340),
      maxWidth: "92%",
      maxHeight: "85%",
      paddingHorizontal: moderateWidthScale(24),
      paddingTop: moderateHeightScale(28),
      paddingBottom: moderateHeightScale(24),
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: moderateHeightScale(8),
      },
      shadowOpacity: 0.4,
      shadowRadius: moderateWidthScale(16),
      elevation: 12,
    },
    iconContainer: {
      width: moderateWidthScale(70),
      height: moderateWidthScale(70),
      borderRadius: moderateWidthScale(35),
      backgroundColor: theme.orangeBrown30,
      justifyContent: "center",
      alignItems: "center",
      alignSelf: "center",
      marginBottom: moderateHeightScale(16),
    },
    title: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.text,
      textAlign: "center",
      marginBottom: moderateHeightScale(12),
    },
    scrollContent: {
      paddingBottom: moderateHeightScale(8),
    },
    message: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      lineHeight: moderateHeightScale(22),
      marginBottom: moderateHeightScale(12),
    },
    bulletItem: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: moderateHeightScale(20),
      marginBottom: moderateHeightScale(6),
      paddingLeft: moderateWidthScale(4),
    },
    buttonContainer: {
      width: "100%",
      marginTop: moderateHeightScale(16),
      marginBottom: moderateHeightScale(12),
    },
    declineContainer: {
      marginBottom: moderateHeightScale(8),
    },
    declineText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textAlign: "center",
    },
    privacyLink: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.link,
      textDecorationLine: "underline",
      textDecorationColor: theme.link,
      textAlign: "center",
    },
  });

export default function AiThirdPartyConsentModal({
  variant,
  visible,
  onAgree,
  onDecline,
}: AiThirdPartyConsentModalProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;
  const config = VARIANT_KEYS[variant];

  const handlePrivacyPress = useCallback(async () => {
    if (!PRIVACY_POLICY_URL) {
      Alert.alert(t("error"), t("urlNotConfigured"));
      return;
    }
    try {
      const supported = await Linking.canOpenURL(PRIVACY_POLICY_URL);
      if (supported) {
        await Linking.openURL(PRIVACY_POLICY_URL);
      } else {
        Alert.alert(t("error"), `${t("cannotOpen")} Privacy Policy`);
      }
    } catch {
      Alert.alert(t("error"), t("failedToOpenLink"));
    }
  }, [t]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDecline}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onDecline} />
        <Pressable
          style={styles.modalContainer}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.iconContainer}>
            <Feather
              name="shield"
              size={iconScale(32)}
              color={theme.darkGreen}
            />
          </View>

          <Text style={styles.title}>{t(config.title)}</Text>

          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <Text style={styles.message}>{t(config.intro)}</Text>
            {config.bullets.map((key) => (
              <Text key={key} style={styles.bulletItem}>
                {t(key)}
              </Text>
            ))}
          </ScrollView>

          <View style={styles.buttonContainer}>
            <Button title={t("aiDataConsentAgree")} onPress={onAgree} />
          </View>

          <TouchableOpacity
            style={styles.declineContainer}
            onPress={onDecline}
            activeOpacity={0.7}
          >
            <Text style={styles.declineText}>{t("aiDataConsentDecline")}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handlePrivacyPress} activeOpacity={0.7}>
            <Text style={styles.privacyLink}>
              {t("aiHairTryOnConsentPrivacyLink")}
            </Text>
          </TouchableOpacity>
        </Pressable>
      </View>
    </Modal>
  );
}
