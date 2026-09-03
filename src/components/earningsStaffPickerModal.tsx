import React, { useMemo } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import type { StaffEarningsRow, StaffIdFilter } from "@/src/types/businessEarnings";
import { getStaffInitials } from "@/src/services/businessEarningsService";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: theme.background,
      borderTopLeftRadius: moderateWidthScale(20),
      borderTopRightRadius: moderateWidthScale(20),
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(28),
      maxHeight: "70%",
    },
    handle: {
      alignSelf: "center",
      width: moderateWidthScale(40),
      height: moderateHeightScale(4),
      borderRadius: moderateWidthScale(2),
      backgroundColor: theme.borderNormal,
      marginBottom: moderateHeightScale(14),
    },
    title: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(12),
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: moderateHeightScale(12),
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
      gap: moderateWidthScale(12),
    },
    rowSelected: {
      backgroundColor: theme.lightGreen05,
      marginHorizontal: -moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(8),
      borderRadius: moderateWidthScale(10),
      borderBottomWidth: 0,
    },
    avatar: {
      width: moderateWidthScale(36),
      height: moderateWidthScale(36),
      borderRadius: moderateWidthScale(18),
      backgroundColor: theme.lightGreen1,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    avatarMuted: {
      backgroundColor: theme.borderLight,
    },
    avatarImage: {
      width: "100%",
      height: "100%",
    },
    avatarText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    nameCol: {
      flex: 1,
    },
    name: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    nameMuted: {
      color: theme.lightGreen6,
    },
    hint: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen5,
      marginTop: moderateHeightScale(2),
    },
  });

type Props = {
  visible: boolean;
  staff: StaffEarningsRow[];
  selectedStaffId: StaffIdFilter;
  onClose: () => void;
  onSelect: (staffId: StaffIdFilter) => void;
};

export default function EarningsStaffPickerModal({
  visible,
  staff,
  selectedStaffId,
  onClose,
  onSelect,
}: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { t } = useTranslation();

  const pickable = useMemo(
    () => staff.filter((row) => !row.isUnassigned),
    [staff],
  );

  const handleSelect = (staffId: StaffIdFilter) => {
    onSelect(staffId);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>{t("earningsStaffPickerTitle")}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <TouchableOpacity
              style={[
                styles.row,
                selectedStaffId === "all" && styles.rowSelected,
              ]}
              onPress={() => handleSelect("all")}
              activeOpacity={0.7}
            >
              <View style={styles.avatar}>
                <Ionicons
                  name="people"
                  size={iconScale(18)}
                  color={theme.darkGreen}
                />
              </View>
              <View style={styles.nameCol}>
                <Text style={styles.name}>{t("earningsAllStaff")}</Text>
              </View>
              {selectedStaffId === "all" && (
                <Ionicons
                  name="checkmark"
                  size={iconScale(20)}
                  color={theme.darkGreen}
                />
              )}
            </TouchableOpacity>

            {pickable.map((row) => {
              const selected =
                typeof selectedStaffId === "number" &&
                selectedStaffId === row.staffId;
              return (
                <TouchableOpacity
                  key={row.staffId ?? row.name}
                  style={[styles.row, selected && styles.rowSelected]}
                  onPress={() => {
                    if (row.staffId != null) handleSelect(row.staffId);
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={[styles.avatar, row.removed && styles.avatarMuted]}
                  >
                    {row.profileImage ? (
                      <Image
                        source={{ uri: row.profileImage }}
                        style={styles.avatarImage}
                      />
                    ) : (
                      <Text style={styles.avatarText}>
                        {getStaffInitials(row.name)}
                      </Text>
                    )}
                  </View>
                  <View style={styles.nameCol}>
                    <Text
                      style={[styles.name, row.removed && styles.nameMuted]}
                      numberOfLines={1}
                    >
                      {row.name}
                    </Text>
                    {row.removed && (
                      <Text style={styles.hint}>
                        {t("earningsStaffRemoved")}
                      </Text>
                    )}
                  </View>
                  {selected && (
                    <Ionicons
                      name="checkmark"
                      size={iconScale(20)}
                      color={theme.darkGreen}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
