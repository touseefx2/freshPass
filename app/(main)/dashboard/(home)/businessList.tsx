import React from "react";
import Logger from "@/src/services/logger";
import { useLocalSearchParams } from "expo-router";
import BusinessList, { BusinessListData } from "@/src/components/businessList";

export default function BusinessListScreen() {
  const params = useLocalSearchParams<{ data?: string }>();

  let data: BusinessListData | null = null;

  try {
    if (params.data) {
      data = JSON.parse(params.data);
    }
  } catch (error) {
    Logger.error("Error parsing business list data:", error);
  }

  return <BusinessList data={data} />;
}

