import React, { useMemo } from "react";
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Theme } from "@/src/theme/colors";
import { useTheme } from "@/src/hooks/hooks";
import { moderateHeightScale } from "@/src/theme/dimensions";
import SocialLoginButton from "@/src/components/socialLoginButton";
import { GoogleIcon, AppleIcon, FacebookIcon, GuestIcon } from "@/assets/icons";

interface SocialAuthOptionsProps {
  onGoogle: () => void;
  onApple: () => void;
  onFacebook: () => void;
  onGuest?: () => void;
  isGuest?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  spacingVariant?: "default" | "compact";
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      gap: moderateHeightScale(15),
    },
    buttonWrapper: {
      width: "100%",
    },
  });

export default function SocialAuthOptions({
  onGoogle,
  onApple,
  onFacebook,
  onGuest,
  isGuest = false,
  containerStyle,
}: SocialAuthOptionsProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.buttonWrapper}>
        <SocialLoginButton
          icon={<GoogleIcon width={30} height={30} />}
          title="Continue with Google"
          onPress={onGoogle}
        />
      </View>
      {/* {Platform.OS === "ios" && ( */}
        <View style={styles.buttonWrapper}>
          <SocialLoginButton
            icon={<AppleIcon width={30} height={30} />}
            title="Continue with Apple"
            onPress={onApple}
          />
        </View>
      
      <View style={styles.buttonWrapper}>
        <SocialLoginButton
          icon={<FacebookIcon width={30} height={30} />}
          title="Continue with Facebook"
          onPress={onFacebook}
        />
      </View>

      {isGuest && onGuest && (
        <View style={styles.buttonWrapper}>
          <SocialLoginButton
            icon={<GuestIcon width={30} height={30} />}
            title="Login as guest"
            onPress={onGuest}
          />
        </View>
      )}
    </View>
  );
}
