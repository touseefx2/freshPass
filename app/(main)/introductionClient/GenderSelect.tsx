import React, { useMemo } from "react";
import { StyleSheet, Text, View, StatusBar, Platform } from "react-native";
import { useTheme, useAppDispatch, useAppSelector } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { LeafLogo } from "@/assets/icons";
import Button from "@/src/components/button";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import RadioOption from "@/src/components/radioOption";
import { setDiscover, DiscoverType } from "@/src/state/slices/userSlice";

interface GenderSelectProps {
  onNext: () => void;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(20),
      paddingBottom: moderateHeightScale(30),
    },
    logoContainer: {
      marginBottom: moderateHeightScale(5),
    },
    titleContainer: {
      alignItems: "flex-start",
      marginBottom: moderateHeightScale(40),
    },
    titleText: {
      fontSize: fontSize.size32,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(10),
    },
    titleHighlight: {
      color: theme.orangeBrown,
    },
    subtitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    optionsContainer: {
      gap: moderateHeightScale(14),
      marginBottom: moderateHeightScale(60),
      flex: 1,
      alignItems: "flex-end",
      justifyContent: "flex-end",
    },
  });

export default function GenderSelect({ onNext }: GenderSelectProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const dispatch = useAppDispatch();
  const selectedGender = useAppSelector((state) => state.user.discover);
  const insets = useSafeAreaInsets();

  const handleOptionSelect = (option: DiscoverType) => {
    dispatch(setDiscover(option));
  };

  const handleContinue = () => {
    if (selectedGender) {
      dispatch(setDiscover(selectedGender));
      onNext();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View
        style={{
          flex: 1,
          // paddingBottom:
          //   Platform.OS === "android" && insets.bottom > 30
          //     ? moderateHeightScale(30) + insets.bottom
          //     : moderateHeightScale(30),
        }}
      >
        <View style={styles.logoContainer}>
          <LeafLogo />
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>
            Discover services just{" "}
            <Text style={styles.titleHighlight}>right for you</Text>
          </Text>
          <Text style={styles.subtitle}>Show services designed for...</Text>
        </View>

        <View style={styles.optionsContainer}>
          <RadioOption
            title="Women"
            subtitle=""
            option="women"
            selectedOption={selectedGender}
            onPress={handleOptionSelect}
          />

          <RadioOption
            title="Men"
            subtitle=""
            option="men"
            selectedOption={selectedGender}
            onPress={handleOptionSelect}
          />

          {/* <RadioOption
            title="Both"
            subtitle=""
            option="both"
            selectedOption={selectedGender}
            onPress={handleOptionSelect}
          /> */}

          <RadioOption
            title="Other"
            subtitle=""
            option="other"
            selectedOption={selectedGender}
            onPress={handleOptionSelect}
          />
        </View>

        <Button
          title="Continue"
          onPress={handleContinue}
          disabled={!selectedGender}
        />
      </View>
    </SafeAreaView>
  );
}
