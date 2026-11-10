import React from "react";
import { StatusBar } from "react-native";
import CalendarScreen from "@/src/components/dashboard/calendar";

export default function FullscreenCalendar() {
  return (
    <>
      <StatusBar barStyle="dark-content" />
      <CalendarScreen fullscreen />
    </>
  );
}
