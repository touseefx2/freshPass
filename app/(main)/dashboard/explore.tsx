import React, { useMemo, } from "react";
import {
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { useTheme, useAppDispatch, useAppSelector } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { useRouter } from "expo-router";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import ExploreHeader from "@/src/components/ExploreHeader";





const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(20),
    },

  });


export default function ExploreScreen() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { showBanner } = useNotificationContext();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const user = useAppSelector((state) => state.user);
  const isGuest = user.isGuest;


  return (
    <>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <ExploreHeader />
      </View>
    </>
  );
}
