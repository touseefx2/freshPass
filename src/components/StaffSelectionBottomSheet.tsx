import React, { useMemo, useState, useEffect, useRef } from "react";
import { StyleSheet, Text, TouchableOpacity, View, Image } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import ModalizeBottomSheet from "@/src/components/modalizeBottomSheet";

interface StaffMember {
  id: number;
  name: string;
  experience: number | null;
  image: string | null;
}

interface StaffSelectionBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  staffMembers: StaffMember[];
  selectedStaffId: string;
  onSelectStaff: (staffId: string) => void;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    staffListItem: {
      paddingVertical: moderateHeightScale(16),
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    staffItemContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    radioButton: {
      width: moderateWidthScale(20),
      height: moderateWidthScale(20),
      borderRadius: moderateWidthScale(10),
      borderWidth: 2,
      borderColor: theme.lightGreen2,
      alignItems: "center",
      justifyContent: "center",
    },
    radioButtonSelected: {
      borderColor: theme.orangeBrown,
    },
    radioButtonInner: {
      width: moderateWidthScale(10),
      height: moderateWidthScale(10),
      borderRadius: moderateWidthScale(5),
      backgroundColor: theme.orangeBrown,
    },
    staffImage: {
      width: widthScale(50),
      height: widthScale(50),
      borderRadius: widthScale(50 / 2),
      backgroundColor: theme.emptyProfileImage,
      borderWidth: 1,
      borderColor: theme.borderLight,
      overflow: "hidden",
    },
    staffInfo: {
      flex: 1,
    },
    staffName: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(4),
    },
    staffExperience: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    selectedTag: {
      alignSelf: "flex-start",
      backgroundColor: theme.orangeBrown01,
      paddingHorizontal: moderateWidthScale(8),
      paddingVertical: moderateHeightScale(4),
      borderRadius: moderateWidthScale(4),
    },
    selectedTagText: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
  });

export default function StaffSelectionBottomSheet({
  visible,
  onClose,
  staffMembers,
  selectedStaffId,
  onSelectStaff,
}: StaffSelectionBottomSheetProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;
  const [localSelectedId, setLocalSelectedId] =
    useState<string>(selectedStaffId);
  const prevVisibleRef = useRef(false);

  useEffect(() => {
    // Only sync when sheet opens (visible changes from false to true)
    if (visible && !prevVisibleRef.current) {
      // Sheet just opened - initialize with current selected staff ID
      setLocalSelectedId(selectedStaffId);
    }
    prevVisibleRef.current = visible;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleSelectStaff = (staffId: string) => {
    setLocalSelectedId(staffId);
  };

  const handleChangeStaff = () => {
    // Update parent with final selection when Change staff member is pressed
    onSelectStaff(localSelectedId);
    onClose();
  };

  // Create staff list with "Anyone available" option
  const allStaffList = [
    {
      id: "anyone",
      name: "Anyone who's available",
      experience: null,
      image: null,
    },
    ...staffMembers.map((staff) => ({
      id: staff.id.toString(),
      name: staff.name,
      experience: staff.experience,
      image: staff.image,
    })),
  ];

  return (
    <ModalizeBottomSheet
      visible={visible}
      onClose={onClose}
      title={t("changeStaffMember")}
      footerButtonTitle="Change staff member"
      onFooterButtonPress={handleChangeStaff}
    >
      {allStaffList.map((staff, index) => {
        const isSelected = localSelectedId === staff.id;
        return (
          <TouchableOpacity
            key={staff.id}
            onPress={() => handleSelectStaff(staff.id)}
            activeOpacity={0.7}
            style={[
              styles.staffListItem,
              index === allStaffList.length - 1 && { borderBottomWidth: 0 },
            ]}
          >
            <View style={styles.staffItemContent}>
              <View
                style={[
                  styles.radioButton,
                  isSelected && styles.radioButtonSelected,
                ]}
              >
                {isSelected && <View style={styles.radioButtonInner} />}
              </View>
              {staff.image ? (
                <Image
                  source={{ uri: staff.image }}
                  style={styles.staffImage}
                  resizeMode="cover"
                />
              ) : (
                <Image
                  source={{
                    uri: "https://www.w3schools.com/howto/img_avatar2.png",
                  }}
                  style={styles.staffImage}
                  resizeMode="cover"
                />
              )}
              <View style={styles.staffInfo}>
                <Text style={styles.staffName}>{staff.name}</Text>
                {staff.experience !== null && (
                  <Text style={styles.staffExperience}>
                    {staff.experience} years of experience
                  </Text>
                )}
              </View>
              {isSelected && (
                <View style={styles.selectedTag}>
                  <Text style={styles.selectedTagText}>Selected</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </ModalizeBottomSheet>
  );
}
