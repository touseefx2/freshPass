import React from "react";
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
    console.error("Error parsing business list data:", error);
  }

  return <BusinessList data={data} />;
}

