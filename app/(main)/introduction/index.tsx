import React, { useState, useCallback } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import { BackHandler } from "react-native";
import { MAIN_ROUTES } from "@/src/constant/routes";
import { handleNotificationPermission } from "@/src/services/notificationPermissionService";
import Screen1 from "./Screen1";
import Screen2 from "./Screen2";
import Screen3 from "./Screen3";

export default function Introduction() {
  const router = useRouter();
  const [currentScreen, setCurrentScreen] = useState(1);

  // Disable back button on screen 2 - prevent going back to screen 1
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (currentScreen === 2 || currentScreen === 3) {
          // Prevent going back from screen 2 to screen 1
          return true; // Return true to prevent default back behavior
        }

        return true;
        // return false; // Allow back on screen 1 (will exit app or go to previous screen)
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );

      return () => subscription.remove();
    }, [currentScreen])
  );

  const handleNext = () => {
    if (currentScreen === 1) {
      setCurrentScreen(2);
    } else if (currentScreen === 2) {
      setCurrentScreen(3);
    } else {
      // Navigate to dashboard home
      router.replace(`/(main)/${MAIN_ROUTES.DASHBOARD}/(home)` as any);
    }
  };

  const handleSkip = () => {
    // Navigate to intro screen 2
    setCurrentScreen(2);
  };

  const handleTurnOnNotifications = async () => {
    const granted = await handleNotificationPermission();

    // Navigate to screen 2 only if permission is granted
    if (granted) {
      setCurrentScreen(2);
    }else{
      setCurrentScreen(2);
    }
  };

  if (currentScreen === 1) {
    return <Screen1 onNext={handleTurnOnNotifications} onSkip={handleSkip} />;
  }

  if (currentScreen === 2) {
    return <Screen2 onNext={handleNext} />;
  }

  return <Screen3 onNext={handleNext} />;
}
