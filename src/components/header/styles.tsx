import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import { StyleSheet } from "react-native";

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      width: "100%",
      backgroundColor: theme.background,
      alignItems: "flex-end",
      padding: 12,
    },
    shadow: {
      borderBottomWidth: 0.5,
      borderColor: theme.borderLine,
    },
    rightSec: {
      flexDirection: "row",
      gap: 0,
      alignItems: "center",
    },
    dropdown: {
      width: 90,
    },
    dropdownListCont: {
      width: 90,
      backgroundColor: theme.background,
      borderWidth: 0.5,
      borderColor: theme.borderLine,
      borderRadius: 8,
      padding: 5,
    },
    placeholderStyle: {
      color: theme.text,
      fontSize: fontSize.size12,
      // fontFamily: fonts.fontSemibold,
      left: 7,
    },
    selectedTextStyle: {
      color: theme.text,
      fontSize: fontSize.size12,
      // fontFamily: fonts.fontSemibold,
      left: 5,
    },
    item: {
      paddingVertical: 5,
    },
    selItem: {},
    itemText: {
      flex: 1,
      fontSize: fontSize.size12,
      // fontFamily: fonts.fontSemibold,
      textAlign: "center",
      color: theme.text,
    },
  });
