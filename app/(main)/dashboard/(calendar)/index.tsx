import React from "react";
import { useAppSelector } from "@/src/hooks/hooks";
import CalendarScreen from "@/src/components/dashboard/calendar";
import BookingScreen from "@/src/components/dashboard/booking";
 
export default function Home() {
  const user = useAppSelector((state) => state.user);
  const userRole = user.userRole;
  const isGuest = user.isGuest;
  
  
  if (userRole === "customer" || isGuest) {
    return <BookingScreen />;
  }

  return <CalendarScreen />;
}
