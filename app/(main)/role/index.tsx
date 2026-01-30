import { useTheme, useAppDispatch, useAppSelector } from "@/src/hooks/hooks";
import React, { useMemo } from "react";
import { View, Text, Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MAIN_ROUTES } from "@/src/constant/routes";
import { LeafLogo } from "@/assets/icons";
import { createStyles } from "./styles";
import { Theme } from "@/src/theme/colors";
import RadioOption from "@/src/components/radioOption";
import Button from "@/src/components/button";
import { setRole, UserRole } from "@/src/state/slices/generalSlice";

export default function Role() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const router = useRouter();
  const isFirstVisit = useAppSelector((state) => state.general.isVisitFirst);
  const selectedRole = useAppSelector((state) => state.general.role);

  const handleOptionSelect = (option: UserRole) => {
    // Save selected role to Redux immediately when user selects
    dispatch(setRole(option === "client" ? "customer" : option));
  };

  const handleContinue = () => {
    // Only continue if role is selected and saved in Redux
    if (selectedRole) {
      // Navigate to client onboarding flow (location screen first)
      if (selectedRole === "customer") {
        if (isFirstVisit) {
          router.push(`/${MAIN_ROUTES.INTRODUCTION_CLIENT}`);
        } else {
          router.push(`/${MAIN_ROUTES.SOCIAL_LOGIN}`);
        }

        return;
      }
      router.push(`/${MAIN_ROUTES.SOCIAL_LOGIN}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainContent}>
        <View style={styles.logoContainer}>
          <LeafLogo />
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>
            <Text>{t("manageBookDelight").split("\n")[0]}</Text>
            {"\n"}&
            <Text style={styles.titlePart2}>
              {" "}
              {t("manageBookDelight").split("\n")[1]?.trim() || ""}
            </Text>
          </Text>
        </View>

        <Text style={styles.subtitle}>{t("areYouHereToBook")}</Text>
      </View>

      <View style={styles.mainContent2}>
        <View style={styles.optionsContainer}>
          <RadioOption
            title={t("iManageBusiness")}
            subtitle={t("loginToBusinessDashboard")}
            option="business"
            selectedOption={selectedRole}
            onPress={handleOptionSelect}
          />

          <RadioOption
            title={t("imAClient")}
            subtitle={t("bookSubscribeManageVisits")}
            option="client"
            selectedOption={
              selectedRole === "customer" ? "client" : selectedRole
            }
            onPress={handleOptionSelect}
          />
        </View>

        <Text style={styles.privacyText}>
          {t("privacyMatters")} <Text>{t("privacyPolicy")}</Text>{" "}
          <Text>{t("termsOfService")}</Text>
        </Text>
      </View>

      <Button
        title={t("continue")}
        onPress={handleContinue}
        disabled={!selectedRole} // Disable button if no role is selected
      />
    </SafeAreaView>
  );
}
