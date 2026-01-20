import React, { useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ImageBackground,
  TouchableOpacity,
  StatusBar,
  Platform,
} from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { LeafLogo } from "@/assets/icons";
import { Ionicons } from "@expo/vector-icons";
import Button from "@/src/components/button";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Feature {
  icon: React.ComponentType<{ width: number; height: number }>;
  title: string;
  description: string;
}

interface AiFeatureScreen {
  headline: string;
  features: Feature[];
  buttonTitle: string;
  backgroundImage: any;
  footerText?: string;
  onNext?: () => void;
  onSkip?: () => void;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.darkGreen,
    },
    backgroundImage: {
      flex: 1,
    },
    content: {
      flex: 1,
      paddingHorizontal: moderateWidthScale(15),
      paddingTop: moderateHeightScale(45),
    },
    logoContainer: {
      marginBottom: moderateHeightScale(80),
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
    },
    logoText: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    headline: {
      fontSize: fontSize.size23,
      fontFamily: fonts.fontBold,
      color: theme.white,
      lineHeight: moderateHeightScale(40),
      marginBottom: moderateHeightScale(25),
    },
    featureContainer: {
      marginBottom: moderateHeightScale(20),
      flexDirection: "row",
      gap: moderateWidthScale(18),
      alignItems: "center",
    },
    iconContainer: {},
    featureContent: {
      flex: 1,
      gap: moderateHeightScale(5),
    },
    featureTitle: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
    featureDescription: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.white,
      lineHeight: moderateHeightScale(17),
    },
    footerText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.white70,
      maxWidth: "75%",
    },
    buttonContainer: {
      gap: moderateHeightScale(15),
    },
    skipButton: {
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: moderateWidthScale(4),
    },
    skipButtonText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontMedium,
      color: theme.white,
    },
  });

export default function AiFeatureScreen({
  headline,
  features,
  buttonTitle,
  backgroundImage,
  footerText,
  onNext = undefined,
  onSkip = undefined,
}: AiFeatureScreen) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;
  const insets = useSafeAreaInsets();
  const isButtonMode = Platform.OS === "android" && insets.bottom > 30;

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={"transparent"} barStyle={"light-content"} translucent={true} />
      <ImageBackground
        source={backgroundImage}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View
          style={[
            styles.content,
            {
              paddingBottom: isButtonMode
                ? moderateHeightScale(30) + insets.bottom
                : moderateHeightScale(30),
            },
          ]}
        >
          <View style={{ flex: 1 }}>
            <View style={styles.logoContainer}>
              <LeafLogo
                width={moderateWidthScale(25)}
                height={moderateWidthScale(33)}
                color1={theme.white}
                color2={theme.white}
              />
              <Text style={styles.logoText}>FRESHPASS</Text>
            </View>

            <Text style={styles.headline}>{headline}</Text>

            <View
              style={{
                gap: moderateHeightScale(10),
                width: "92%",
                alignSelf: "center",
              }}
            >
              {features.map((feature, index) => {
                const IconComponent = feature.icon;
                return (
                  <View key={index} style={styles.featureContainer}>
                    <View style={styles.iconContainer}>
                      <IconComponent
                        width={moderateWidthScale(37)}
                        height={moderateWidthScale(37)}
                      />
                    </View>
                    <View style={styles.featureContent}>
                      <Text style={styles.featureTitle}>{feature.title}</Text>
                      <Text style={styles.featureDescription}>
                        {feature.description}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.buttonContainer}>
            {footerText && (
              <Text style={styles.footerText}>{footerText}</Text>
            )}

            {onNext && (
              <Button
                title={buttonTitle}
                onPress={onNext}
                backgroundColor={theme.orangeBrown}
                textColor={theme.black}
              />
            )}


            {onSkip && (
              <TouchableOpacity
                style={styles.skipButton}
                onPress={onSkip}
                activeOpacity={0.7}
              >
                <Text style={styles.skipButtonText}>Not now</Text>
                <Ionicons
                  name="chevron-forward"
                  size={moderateWidthScale(16)}
                  color={theme.white}
                  style={{ top: 1.5 }}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}
