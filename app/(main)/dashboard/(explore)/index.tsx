import React from "react";
import { useAppSelector } from "@/src/hooks/hooks";
import NotificationsScreen from "../../notification";
import ExploreScreen from "./Explore";

export default function Home() {
  const userRole = useAppSelector((state) => state.user.userRole);
  const isGuest = useAppSelector((state) => state.user.isGuest);
  const isCustomer = userRole === "customer" || isGuest;

  if (isCustomer) {
    return <ExploreScreen />;
  }

  return <NotificationsScreen />;
}
