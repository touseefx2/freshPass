import React from "react";
import { useAppSelector } from "@/src/hooks/hooks";
import NotificationsScreen from "../../notification";
import ExploreScreen from "./Explore";

export default function Home() {
  const user = useAppSelector((state) => state.user);
  const userRole = user.userRole;
  const isGuest = user.isGuest;
  const isCustomer = userRole === "customer" || isGuest;


  if (isCustomer) {
    return <ExploreScreen />;
  }

  return <NotificationsScreen />;
}
