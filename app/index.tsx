import { Redirect } from "expo-router";
import { MAIN_ROUTES } from "@/src/constant/routes";
import { useAppSelector } from "@/src/hooks/hooks";
import { useEffect, useState } from "react";

export default function Index() {
  const user = useAppSelector((state) => state.user);
  const accessToken = user.accessToken;
  const isGuest = user.isGuest;
  const [isReady, setIsReady] = useState(false);


  useEffect(() => {
    // Small delay to ensure Redux state is hydrated
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  if (!isReady) {
    return null;
  }
  console.log("accessToken", accessToken);

  if (accessToken || isGuest)
    return <Redirect href={`/(main)/${MAIN_ROUTES.DASHBOARD}/(home)` as any} />;
  // return <Redirect href={`/(main)/${MAIN_ROUTES.ACCEPT_TERMS} ` as any} />;


  return <Redirect href={`/${MAIN_ROUTES.ROLE}`} />;
}
