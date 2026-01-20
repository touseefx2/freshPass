import React from "react";
import { useAppSelector } from "@/src/hooks/hooks";
import HomeScreen from "@/src/components/dashboard/home";
import HomeClientScreen from "@/src/components/dashboard/homeClient";

export default function Home() {
  const user = useAppSelector((state) => state.user);
  const userRole = user.userRole;
  const isGuest = user.isGuest;
  
  
  if (userRole === "customer" || isGuest) {
    return <HomeClientScreen />;
  }

  return <HomeScreen />;
}
