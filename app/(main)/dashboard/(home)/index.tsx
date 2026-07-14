import React, { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAppSelector } from "@/src/hooks/hooks";
import { handleNotificationPermission } from "@/src/services/notificationPermissionService";
import { MAIN_ROUTES } from "@/src/constant/routes";
import { resetToRoute } from "@/src/utils/navigation";
import HomeScreen from "@/src/components/dashboard/home";
import HomeClientScreen from "@/src/components/dashboard/homeClient";

export default function Home() {
  const router = useRouter();
  const user = useAppSelector((state) => state.user);
  const userRole = user.userRole;
  const isGuest = user.isGuest;
  const accessToken = user.accessToken;

  // Guard against stale/partially-restored local storage (e.g. an accessToken
  // surviving a reinstall/update without a matching userRole). Without this,
  // the screen below would fall through to the business HomeScreen and spin
  // on an infinite loader forever since it only fetches data for business/staff.
  const isValidRole =
    userRole === "business" || userRole === "customer" || userRole === "staff";
  const hasStaleSession = !!accessToken && !isValidRole && !isGuest;

  useEffect(() => {
    if (hasStaleSession) {
      resetToRoute(`/(main)/${MAIN_ROUTES.ROLE}` as any);
    }
  }, [hasStaleSession]);

  useEffect(() => {
    if (accessToken) {
      getNotificationPermission();
    }
  }, []);

  const getNotificationPermission = async () => {
    const granted = await handleNotificationPermission();
  };

  if (hasStaleSession) {
    return null;
  }

  if (userRole === "customer" || isGuest) {
    return <HomeClientScreen />;
  }

  return <HomeScreen />;
}
