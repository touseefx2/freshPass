import React from "react";
import { useAppSelector } from "@/src/hooks/hooks";
import CalendarScreen from "@/src/components/dashboard/calendar";
import BookingScreen from "@/src/components/dashboard/booking";
 
export default function Home() {
  const userRole = useAppSelector((state) => state.user.userRole);
  const isGuest = useAppSelector((state) => state.user.isGuest);
  
  
  if (userRole === "customer" || isGuest) {
    return <BookingScreen />;
  }

  return <CalendarScreen />;
}
