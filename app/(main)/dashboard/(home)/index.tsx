import React, { useEffect, useRef } from "react";
import { useFocusEffect } from "expo-router";
import * as Notifications from "expo-notifications";
import { useAppSelector } from "@/src/hooks/hooks";
import { handleNotificationPermission } from "@/src/services/notificationPermissionService";
import HomeScreen from "@/src/components/dashboard/home";
import HomeClientScreen from "@/src/components/dashboard/homeClient";

export default function Home() {
  const user = useAppSelector((state) => state.user);
  const userRole = user.userRole;
  const isGuest = user.isGuest;
  const accessToken = user.accessToken;

  useEffect(() => {
    if (accessToken) {
      getNotificationPermission();
    }
  }, []);

  const getNotificationPermission = async () => {
    const granted = await handleNotificationPermission();
  };

  if (userRole === "customer" || isGuest) {
    return <HomeClientScreen />;
  }

  return <HomeScreen />;
}
