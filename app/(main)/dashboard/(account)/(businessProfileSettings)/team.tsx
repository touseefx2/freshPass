import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { useTranslation } from "react-i18next";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import FloatingInput from "@/src/components/floatingInput";
import Button from "@/src/components/button";
import { Skeleton } from "@/src/components/skeletons";
import {
  addStaffInvitation,
  setStaffInvitationEmail,
  setStaffInvitations,
} from "@/src/state/slices/completeProfileSlice";
import { setActionLoader } from "@/src/state/slices/generalSlice";
import { ApiService } from "@/src/services/api";
import Logger from "@/src/services/logger";
import { businessEndpoints, staffEndpoints } from "@/src/services/endpoints";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { validateEmail } from "@/src/services/validationService";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: moderateWidthScale(20),
    },
    contentContainer: {
      paddingVertical: moderateHeightScale(24),
      gap: moderateHeightScale(16),
    },
    titleSec: {
      marginTop: moderateHeightScale(8),
      gap: moderateHeightScale(5),
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
    inviteButton: {
      backgroundColor: theme.orangeBrown,
      borderRadius: moderateWidthScale(8),
      paddingHorizontal: moderateWidthScale(17),
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
    errorText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.link,
      marginTop: moderateHeightScale(4),
      paddingHorizontal: moderateWidthScale(4),
    },
    memberCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
    },
    avatarIcon: {
      width: moderateWidthScale(24),
      height: moderateWidthScale(24),
      borderRadius: moderateHeightScale(24 / 2),
      borderWidth: 1,
      borderColor: theme.lightGreen,
      alignItems: "center",
      justifyContent: "center",
    },
    memberContent: {
      flex: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    memberInfo: {
      flex: 1,
      gap: moderateHeightScale(2),
    },
    memberName: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    memberEmail: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    memberStatus: {
      fontSize: fontSize.size11,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen4,
    },
    divider: {
      height: 1.2,
      backgroundColor: theme.borderLight,
      width: "100%",
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(20),
    },
    emptyStateText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen4,
      textAlign: "center",
    },
    continueButtonContainer: {
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(24),
      paddingTop: moderateHeightScale(16),
    },
    invitationsTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      textTransform: "lowercase",
      opacity: 0.7,
    },
  });

interface TeamMember {
  id: number;
  user_id: number;
  name: string;
  email: string | null;
  phone: string | null;
  active: number;
  description: string | null;
  invitation_status: string;
  invited_at: string;
  completed_appointments_count: number;
}

export default function ManageTeamScreen() {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { showBanner } = useNotificationContext();

  const { staffInvitationEmail } = useAppSelector(
    (state) => state.completeProfile,
  );

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailError, setEmailError] = useState<string | null>(null);

  const canInvite = React.useMemo(() => {
    if (!staffInvitationEmail.trim()) {
      return false;
    }
    const validation = validateEmail(staffInvitationEmail.trim());
    return validation.isValid;
  }, [staffInvitationEmail]);

  useEffect(() => {
    if (staffInvitationEmail.length > 0) {
      const validation = validateEmail(staffInvitationEmail);
      setEmailError(validation.error);
    } else {
      setEmailError(null);
    }
  }, [staffInvitationEmail]);

  const fetchTeam = async () => {
    setLoading(true);

    try {
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: {
          staff: TeamMember[];
        };
      }>(businessEndpoints.moduleData("team"));

      if (response.success && response.data?.staff) {
        setTeamMembers(response.data.staff);
      } else {
        setTeamMembers([]);
      }
    } catch (error: any) {
      Logger.error("Failed to fetch team module data:", error);
      showBanner(
        t("error"),
        error?.message || t("failedToFetchTeam"),
        "error",
        3000,
      );
      setTeamMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTeam();
    }, []),
  );

  const handleClearEmail = () => {
    dispatch(setStaffInvitationEmail(""));
    setEmailError(null);
  };

  const handleInvite = async () => {
    if (!staffInvitationEmail.trim()) {
      return;
    }

    const email = staffInvitationEmail.trim();

    dispatch(setActionLoader(true));

    try {
      const response = await ApiService.post<{
        success: boolean;
        message: string;
      }>(staffEndpoints.invite, {
        email: email,
      });

      if (response.success) {
        fetchTeam();
        dispatch(setStaffInvitationEmail(""));

        showBanner(
          t("success"),
          response.message || t("staffInvitationSentSuccess"),
          "success",
          3000,
        );
      } else {
        showBanner(
          t("error"),
          response.message || t("failedToSendInvitation"),
          "error",
          3000,
        );
      }
    } catch (error: any) {
      Logger.error("Failed to send invitation:", error);
      showBanner(
        t("error"),
        error?.message || t("failedToSendInvitationTryAgain"),
        "error",
        3000,
      );
    } finally {
      dispatch(setActionLoader(false));
    }
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <StackHeader title={t("manageTeam")} />
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {loading && teamMembers.length === 0 ? (
          <Skeleton screenType="Team" styles={styles} />
        ) : (
          <>
            <View style={styles.titleSec}>
              <Text style={styles.title}>{t("addStaffMembers")}</Text>
              <Text style={styles.subtitle}>{t("inviteStaffSubtitle")}</Text>
            </View>

            <View style={styles.inputSection}>
              <View style={styles.inputRowContainer}>
                <FloatingInput
                  label={t("email")}
                  value={staffInvitationEmail}
                  onChangeText={(value) =>
                    dispatch(setStaffInvitationEmail(value))
                  }
                  placeholder={t("enterEmail")}
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
                  <Text style={styles.inviteButtonText}>{t("invite")}</Text>
                </TouchableOpacity>
              </View>
              {emailError && <Text style={styles.errorText}>{emailError}</Text>}
            </View>

            {teamMembers.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  {t("noTeamMemberYet")}
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.invitationsTitle}>
                  {t("invitationsSend")}
                </Text>
                {teamMembers.map((member, index) => {
                  return (
                    <React.Fragment key={member.id}>
                      <View style={styles.memberCard}>
                        <View style={styles.avatarIcon}>
                          <Feather
                            name="user"
                            size={moderateWidthScale(16)}
                            color={theme.darkGreen}
                          />
                        </View>
                        <View style={styles.memberContent}>
                          <View style={styles.memberInfo}>
                            <Text style={styles.memberName}>
                              {member.name || member.email}
                            </Text>
                            {member.email && (
                              <Text style={styles.memberEmail}>
                                {member.email}
                              </Text>
                            )}
                          </View>
                          <Text style={styles.memberStatus}>
                            {member.invitation_status === "accepted"
                              ? "Invitation accepted"
                              : "Invitation sent"}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.divider} />
                    </React.Fragment>
                  );
                })}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
