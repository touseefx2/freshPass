import React, { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import FloatingInput from "@/src/components/floatingInput";
import {
  addStaffInvitation,
  setStaffInvitationEmail,
  setStaffInvitations,
} from "@/src/state/slices/completeProfileSlice";
import { setActionLoader } from "@/src/state/slices/generalSlice";
import { ApiService } from "@/src/services/api";
import Logger from "@/src/services/logger";
import { businessEndpoints } from "@/src/services/endpoints";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { validateEmail } from "@/src/services/validationService";
import { Feather } from "@expo/vector-icons";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      gap: moderateHeightScale(24),
      paddingHorizontal: moderateWidthScale(20),
    },
    titleSec: {
      marginTop: moderateHeightScale(8),
      gap: 5,
    },
    title: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    subtitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    inputSection: {
      gap: moderateHeightScale(4),
    },
    inputRowContainer: {
      flexDirection: "row",
      gap: moderateWidthScale(12),
    },
    errorText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.link,
      marginTop: moderateHeightScale(4),
      paddingHorizontal: moderateWidthScale(4),
    },
    inviteButton: {
      backgroundColor: theme.orangeBrown,
      borderRadius: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(17),
      // paddingVertical: moderateHeightScale(8),
      alignItems: "center",
      justifyContent: "center",
    },
    inviteButtonDisabled: {
      backgroundColor: theme.lightGreen2,
      opacity: 0.6,
    },
    inviteButtonText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    invitationsSection: {
      gap: moderateHeightScale(12),
    },
    invitationsTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      textTransform: "lowercase",
      opacity: 0.7,
    },
    invitationList: {
      gap: 0,
    },
    invitationItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(12),
    },
    avatarIcon: {
      width: moderateWidthScale(24),
      height: moderateWidthScale(24),
      borderRadius: moderateHeightScale(24 / 2),
      borderWidth:1,
      borderColor: theme.lightGreen,
      alignItems: "center",
      justifyContent: "center",
    },
    invitationContent: {
      flex: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    invitationEmailContainer: {
      flex: 1,
      gap: moderateHeightScale(2),
    },
    invitationEmail: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    invitationStatus: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    divider: {
      height: 1.2,
      backgroundColor: theme.borderLight,
    },
  });

export default function StepSix() {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;
  const { showBanner } = useNotificationContext();
  const { staffInvitationEmail, staffInvitations } = useAppSelector(
    (state) => state.completeProfile
  );
  const [emailError, setEmailError] = useState<string | null>(null);

  // Validate email when it changes
  useEffect(() => {
    if (staffInvitationEmail.length > 0) {
      const validation = validateEmail(staffInvitationEmail);
      setEmailError(validation.error);
    } else {
      setEmailError(null);
    }
  }, [staffInvitationEmail]);

  const handleClearEmail = () => {
    dispatch(setStaffInvitationEmail(""));
    setEmailError(null);
  };

  const handleInvite = async () => {
    if (!staffInvitationEmail.trim()) {
      return;
    }

    const email = staffInvitationEmail.trim();

    // Show loader
    dispatch(setActionLoader(true));

    try {
      const response = await ApiService.post<{
        success: boolean;
        message: string;
        data?: {
          invited_staff: Array<{
            email: string;
            name: string;
            invitation_status: string;
            invited_at: string;
            active: boolean;
          }>;
        };
      }>(businessEndpoints.onboarding, {
        step: 6,
        email: email,
      });

      if (response.success && response.data?.invited_staff) {
        // Map API response to Redux format and set all invitations
        const mappedInvitations = response.data.invited_staff.map((staff) => ({
          email: staff.email,
          status: staff.invitation_status === "accepted" ? "accepted" : "sent" as "sent" | "accepted",
        }));

        // Set all invitations from API response (this updates existing ones and adds new ones)
        dispatch(setStaffInvitations(mappedInvitations));

        // Clear email input
        dispatch(setStaffInvitationEmail(""));

        showBanner(
          "Success",
          response.message || "Invitation sent successfully",
          "success",
          3000
        );
      } else {
        showBanner(
          "Error",
          response.message || "Failed to send invitation",
          "error",
          3000
        );
      }
    } catch (error: any) {
      Logger.error("Failed to send invitation:", error);
      showBanner(
        "Error",
        error.message || "Failed to send invitation. Please try again.",
        "error",
        3000
      );
    } finally {
      // Hide loader
      dispatch(setActionLoader(false));
    }
  };

  // Check if invite button should be enabled
  const canInvite = useMemo(() => {
    if (!staffInvitationEmail.trim()) {
      return false;
    }
    const validation = validateEmail(staffInvitationEmail.trim());
    return validation.isValid;
  }, [staffInvitationEmail]);

  return (
    <View style={styles.container}>
      <View style={styles.titleSec}>
        <Text style={styles.title}>Add staff members</Text>
        <Text style={styles.subtitle}>
          Invite your staff by email. They&apos;ll be able to manage their
          schedule and appointments.
        </Text>
      </View>

      <View style={styles.inputSection}>
        <View style={styles.inputRowContainer}>
          <FloatingInput
            label="Email"
            value={staffInvitationEmail}
            onChangeText={(value) => dispatch(setStaffInvitationEmail(value))}
            placeholder="Enter email"
            placeholderTextColor={theme.lightGreen2}
            keyboardType="email-address"
            autoCapitalize="none"
            onClear={handleClearEmail}
            containerStyle={{ flex: 1 }}
          />
          <TouchableOpacity
            onPress={handleInvite}
            disabled={!canInvite}
            style={[
              styles.inviteButton,
              !canInvite && styles.inviteButtonDisabled,
            ]}
            activeOpacity={canInvite ? 0.7 : 1}
          >
            <Text style={styles.inviteButtonText}>Invite</Text>
          </TouchableOpacity>
        </View>
        {emailError && <Text style={styles.errorText}>{emailError}</Text>}
      </View>

      {staffInvitations.length > 0 && (
        <View style={styles.invitationsSection}>
          <Text style={styles.invitationsTitle}>invitations send:</Text>
          <View style={styles.invitationList}>
            {staffInvitations.map((invitation, index) => {
              const showDivider = index < staffInvitations.length - 1;
              return (
                <React.Fragment key={index}>
                  <View style={styles.invitationItem}>
                    <View style={styles.avatarIcon}>
                      <Feather
                        name="user"
                        size={moderateWidthScale(16)}
                        color={theme.darkGreen}
                      />
                    </View>
                    <View style={styles.invitationContent}>
                      <View style={styles.invitationEmailContainer}>
                        <Text style={styles.invitationEmail}>{invitation.email}</Text>
                      </View>
                      <Text style={styles.invitationStatus}>
                        {invitation.status === "accepted"
                          ? "Invitation accepted"
                          : "Invitation sent"}
                      </Text>
                    </View>
                  </View>
                  {showDivider && <View style={styles.divider} />}
                </React.Fragment>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}
