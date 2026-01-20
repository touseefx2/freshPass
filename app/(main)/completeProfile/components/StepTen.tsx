import React, { useMemo, useState, useEffect } from "react";
import { StyleSheet, Text, View, TextInput, Pressable } from "react-native";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import {
  setTiktokUrl,
  setInstagramUrl,
  setFacebookUrl,
} from "@/src/state/slices/completeProfileSlice";
import { CloseIcon } from "@/assets/icons";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      gap: moderateHeightScale(24),
      paddingHorizontal: moderateWidthScale(20),
    },
    titleSec: {
      marginTop: moderateHeightScale(8),
      gap: moderateHeightScale(5),
    },
    title: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    subTitle: {
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    formGroup: {
      gap: moderateHeightScale(16),
      marginTop: moderateHeightScale(10),
    },
    field: {
      borderRadius: moderateWidthScale(8),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.white,
      paddingHorizontal: moderateWidthScale(12),
      paddingTop: moderateHeightScale(18),
      paddingBottom: moderateHeightScale(12),
    },
    label: {
      position: "absolute",
      left: moderateWidthScale(13),
      top: moderateHeightScale(4),
      color: theme.lightGreen,
      fontFamily: fonts.fontRegular,
      fontSize: fontSize.size11,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
    },
    prefix: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    input: {
      flex: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      paddingVertical: 0,
      textAlignVertical: "center",
      includeFontPadding: false,
    },
    clearButton: {
      padding: moderateWidthScale(4),
    },
  });

// Helper function to extract username from URL
const extractUsername = (url: string, prefix: string): string => {
  if (!url) return "";
  if (url.startsWith(prefix)) {
    return url.substring(prefix.length);
  }
  return url;
};

// Helper function to build full URL
const buildFullUrl = (username: string, prefix: string): string => {
  if (!username || username.trim() === "") return "";
  return prefix + username.trim();
};

export default function StepTen() {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;
  const { tiktokUrl, instagramUrl, facebookUrl } = useAppSelector(
    (state) => state.completeProfile
  );

  const TIKTOK_PREFIX = "www.tiktok.com/";
  const INSTAGRAM_PREFIX = "www.instagram.com/";
  const FACEBOOK_PREFIX = "www.facebook.com/";

  // Extract usernames from stored URLs
  const [tiktokUsername, setTiktokUsername] = useState(
    extractUsername(tiktokUrl, TIKTOK_PREFIX)
  );
  const [instagramUsername, setInstagramUsername] = useState(
    extractUsername(instagramUrl, INSTAGRAM_PREFIX)
  );
  const [facebookUsername, setFacebookUsername] = useState(
    extractUsername(facebookUrl, FACEBOOK_PREFIX)
  );

  // Update local state when Redux state changes (e.g., on clear)
  useEffect(() => {
    setTiktokUsername(extractUsername(tiktokUrl, TIKTOK_PREFIX));
  }, [tiktokUrl]);

  useEffect(() => {
    setInstagramUsername(extractUsername(instagramUrl, INSTAGRAM_PREFIX));
  }, [instagramUrl]);

  useEffect(() => {
    setFacebookUsername(extractUsername(facebookUrl, FACEBOOK_PREFIX));
  }, [facebookUrl]);

  const handleTiktokChange = (username: string) => {
    setTiktokUsername(username);
    const fullUrl = buildFullUrl(username, TIKTOK_PREFIX);
    dispatch(setTiktokUrl(fullUrl));
  };

  const handleInstagramChange = (username: string) => {
    setInstagramUsername(username);
    const fullUrl = buildFullUrl(username, INSTAGRAM_PREFIX);
    dispatch(setInstagramUrl(fullUrl));
  };

  const handleFacebookChange = (username: string) => {
    setFacebookUsername(username);
    const fullUrl = buildFullUrl(username, FACEBOOK_PREFIX);
    dispatch(setFacebookUrl(fullUrl));
  };

  const handleClearTiktok = () => {
    setTiktokUsername("");
    dispatch(setTiktokUrl(""));
  };

  const handleClearInstagram = () => {
    setInstagramUsername("");
    dispatch(setInstagramUrl(""));
  };

  const handleClearFacebook = () => {
    setFacebookUsername("");
    dispatch(setFacebookUrl(""));
  };

  return (
    <View style={styles.container}>
      <View style={styles.titleSec}>
        <Text style={styles.title}>
          Link your social media account
          <Text style={styles.subTitle}> (if any)</Text>
        </Text>
      </View>

      <View style={styles.formGroup}>
        <View style={styles.field}>
          <Text style={styles.label}>TikTok</Text>
          <View style={styles.inputRow}>
            <Text style={styles.prefix}>{TIKTOK_PREFIX}</Text>
            <TextInput
              style={styles.input}
              value={tiktokUsername}
              onChangeText={handleTiktokChange}
              placeholder="username"
              placeholderTextColor={theme.lightGreen2}
            />
            {tiktokUsername && tiktokUsername.trim() !== "" && (
              <Pressable
                onPress={handleClearTiktok}
                style={styles.clearButton}
                hitSlop={moderateWidthScale(8)}
              >
                <CloseIcon color={theme.darkGreen} />
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Instagram</Text>
          <View style={styles.inputRow}>
            <Text style={styles.prefix}>{INSTAGRAM_PREFIX}</Text>
            <TextInput
              style={styles.input}
              value={instagramUsername}
              onChangeText={handleInstagramChange}
              placeholder="username"
              placeholderTextColor={theme.lightGreen2}
            />
            {instagramUsername && instagramUsername.trim() !== "" && (
              <Pressable
                onPress={handleClearInstagram}
                style={styles.clearButton}
                hitSlop={moderateWidthScale(8)}
              >
                <CloseIcon color={theme.darkGreen} />
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Facebook</Text>
          <View style={styles.inputRow}>
            <Text style={styles.prefix}>{FACEBOOK_PREFIX}</Text>
            <TextInput
              style={styles.input}
              value={facebookUsername}
              onChangeText={handleFacebookChange}
              placeholder="username"
              placeholderTextColor={theme.lightGreen2}
            />
            {facebookUsername && facebookUsername.trim() !== "" && (
              <Pressable
                onPress={handleClearFacebook}
                style={styles.clearButton}
                hitSlop={moderateWidthScale(8)}
              >
                <CloseIcon color={theme.darkGreen} />
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}


