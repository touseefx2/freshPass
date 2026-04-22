import React, { useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  heightScale,
  iconScale,
} from "@/src/theme/dimensions";
import { Feather } from "@expo/vector-icons";

export type PotentialContact = {
  id: number;
  name: string;
  avatar: string | null;
};

export function getPotentialContactAvatar(avatar: string | null): string {
  if (avatar == null || avatar.trim() === "") {
    return process.env.EXPO_PUBLIC_DEFAULT_AVATAR_IMAGE ?? "";
  }
  const trimmed = avatar.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  const base = (process.env.EXPO_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
  const path = trimmed.replace(/^\//, "");
  return path
    ? `${base}/${path}`
    : (process.env.EXPO_PUBLIC_DEFAULT_AVATAR_IMAGE ?? "");
}

function renderInitials(name: string): string {
  const parts = name.trim().split(" ");
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return `${first}${second}`.toUpperCase();
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      padding: moderateWidthScale(20),
    },
    modalContent: {
      backgroundColor: theme.background,
      borderRadius: moderateWidthScale(12),
      height: heightScale(400),
      overflow: "hidden",
    },
    modalHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(16),
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    modalTitle: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    closeIconTouch: {
      padding: moderateWidthScale(4),
    },
    modalContactRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(14),
      borderBottomWidth: 0.5,
      borderBottomColor: theme.borderLight,
    },
    avatarContainer: {
      width: moderateWidthScale(40),
      height: moderateWidthScale(40),
      borderRadius: moderateWidthScale(40 / 2),
      borderWidth: 1,
      borderColor: theme.borderLight,
      backgroundColor: theme.galleryPhotoBack,
      alignItems: "center",
      justifyContent: "center",
      marginRight: moderateWidthScale(12),
      overflow: "hidden",
    },
    avatarInitials: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    avatarImage: {
      width: "100%",
      height: "100%",
      borderRadius: moderateWidthScale(40 / 2),
      overflow: "hidden",
    },
    nameText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      flexShrink: 1,
    },
    loadingContainer: {
      paddingVertical: moderateHeightScale(40),
      alignItems: "center",
    },
    sendingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(255,255,255,0.7)",
      justifyContent: "center",
      alignItems: "center",
    },
    sendingText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      marginTop: moderateHeightScale(8),
    },
    footerLoader: {
      paddingVertical: moderateHeightScale(12),
      alignItems: "center",
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(24),
    },
    errorText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      marginBottom: moderateHeightScale(16),
    },
    retryText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
  });

type PotentialContactsModalProps = {
  visible: boolean;
  onClose: () => void;
  contacts: PotentialContact[];
  loading: boolean;
  loadingMore: boolean;
  error?: boolean;
  onRetry?: () => void;
  onContactPress: (contact: PotentialContact) => void;
  onEndReached: () => void;
  /** When true, show sending overlay (e.g. when sharing content to selected user) */
  sending?: boolean;
};

export default function PotentialContactsModal({
  visible,
  onClose,
  contacts,
  loading,
  loadingMore,
  error = false,
  onRetry,
  onContactPress,
  onEndReached,
  sending = false,
}: PotentialContactsModalProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();

  const showError = error && !loading && contacts.length === 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          style={styles.modalContent}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalTitle}>Users</Text>
            <TouchableOpacity
              style={styles.closeIconTouch}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Feather
                name="x"
                size={iconScale(24)}
                color={theme.darkGreen}
              />
            </TouchableOpacity>
          </View>
          {loading && contacts.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.darkGreen} />
            </View>
          ) : showError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{t("somethingWentWrong")}</Text>
              <TouchableOpacity
                onPress={onRetry}
                activeOpacity={0.8}
                disabled={!onRetry}
              >
                <Text style={styles.retryText}>{t("retry")}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <FlatList
                showsVerticalScrollIndicator={false}
                data={contacts}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => {
                  const avatarUri = getPotentialContactAvatar(item.avatar);
                  return (
                    <TouchableOpacity
                      style={styles.modalContactRow}
                      onPress={() => onContactPress(item)}
                      activeOpacity={0.8}
                      disabled={sending}
                    >
                      <View style={styles.avatarContainer}>
                        {avatarUri ? (
                          <Image
                            style={styles.avatarImage}
                            source={{ uri: avatarUri }}
                          />
                        ) : (
                          <Text style={styles.avatarInitials}>
                            {renderInitials(item.name)}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.nameText}>{item.name}</Text>
                    </TouchableOpacity>
                  );
                }}
                onEndReached={onEndReached}
                onEndReachedThreshold={0.3}
                ListFooterComponent={
                  loadingMore ? (
                    <View style={styles.footerLoader}>
                      <ActivityIndicator size="small" color={theme.darkGreen} />
                    </View>
                  ) : null
                }
              />
              {sending && (
                <View style={styles.sendingOverlay}>
                  <ActivityIndicator size="small" color={theme.darkGreen} />
                  <Text style={styles.sendingText}>{t("sending")}</Text>
                </View>
              )}
            </View>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
