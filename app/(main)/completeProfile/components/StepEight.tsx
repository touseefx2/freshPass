import React, { useMemo, useState, useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import {
  addService,
  removeService,
  setServiceTemplates,
  setCurrentStep,
  setBusinessName,
  setFullName,
  setPhoneNumber,
  setCountryDetails,
  setAppointmentVolume,
  setAddressSearch,
  setSelectedAddress,
  setStreetAddress,
  setArea,
  setState,
  setZipCode,
  setUseCurrentLocation,
  setAddressStage,
  setSelectedLocation,
  setTeamSize,
  setStaffInvitationEmail,
  setStaffInvitations,
  setDayHours,
  removeSubscription,
  setTiktokUrl,
  setInstagramUrl,
  setFacebookUrl,
  setPhotos,
} from "@/src/state/slices/completeProfileSlice";
import ServiceListBottomSheet from "@/src/components/ServiceListBottomSheet";
import EditServiceBottomSheet from "@/src/components/EditServiceBottomSheet";
import { ApiService } from "@/src/services/api";
import Logger from "@/src/services/logger";
import { businessEndpoints } from "@/src/services/endpoints";
import { Skeleton } from "@/src/components/skeletons";
import RetryButton from "@/src/components/retryButton";
import { useNotificationContext } from "@/src/contexts/NotificationContext";

const formatDuration = (hours: number, minutes: number): string => {
  if (hours > 0 && minutes > 0) {
    return `${hours} hours ${minutes} mins`;
  } else if (hours > 0) {
    return `${hours} hours`;
  } else if (minutes > 0) {
    return `${minutes} mins`;
  }
  return "0 mins";
};

const formatPrice = (price: number, currency: string): string => {
  return `$${price.toFixed(2)} ${currency}`;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      gap: moderateHeightScale(20),
      paddingHorizontal: moderateWidthScale(20),
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
    emptyStateContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(20),
      gap: moderateHeightScale(20),
    },
    retryButtonContainer: {
      marginTop: moderateHeightScale(10),
    },
    popularSection: {
      // gap: moderateHeightScale(12),
    },
    popularTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.lightGreen4,
    },
    suggestionSeparator: {
      height: 1,
      width: "100%",
      backgroundColor: theme.borderLight,
    },
    suggestionItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: moderateHeightScale(15),
    },
    suggestionText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      flex: 1,
    },
    selectButton: {
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(6),
      borderRadius: moderateWidthScale(6),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
    },
    selectButtonText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    selectedButton: {
      backgroundColor: theme.orangeBrown,
      borderColor: theme.orangeBrown,
    },
    viewMoreButton: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(16),
      width: "100%",
      backgroundColor: theme.grey15,
      borderRadius: moderateWidthScale(12),
    },
    viewMoreButtonText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    servicesList: {
      borderRadius: moderateWidthScale(8),
      backgroundColor: theme.white,
      borderWidth: 0.5,
      borderColor: theme.borderLight,
      overflow: "hidden",
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.2,
      shadowRadius: 1.41,
      elevation: 2,
    },
    serviceCard: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: moderateHeightScale(14),
      paddingHorizontal: moderateWidthScale(16),
    },
    serviceSeparator: {
      height: 1,
      width: "100%",
      backgroundColor: theme.borderLight,
      marginHorizontal: moderateWidthScale(16),
    },
    deleteButton: {
      width: moderateWidthScale(24),
      height: moderateWidthScale(24),
      alignItems: "center",
      justifyContent: "center",
      marginRight: moderateWidthScale(7),
    },
    serviceInfo: {
      flex: 1,
      gap: moderateHeightScale(3),
    },
    serviceName: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    serviceDetails: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    servicePrice: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    editButton: {
      marginLeft: moderateWidthScale(8),
    },
    changeCategoryText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      textDecorationLine: "underline",
      marginTop: moderateHeightScale(10),
    },
  });

export default function StepEight() {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;
  const { showBanner } = useNotificationContext();
  const {
    services,
    businessCategory,
    serviceTemplates,
  } = useAppSelector((state) => state.completeProfile);
  const businessStatus = useAppSelector((state) => state.user.businessStatus);

  const [serviceListVisible, setServiceListVisible] = useState(false);
  const [editServiceVisible, setEditServiceVisible] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceTemplatesLoading, setServiceTemplatesLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

  const businessCatId = businessCategory?.id || businessStatus?.business_category?.id;

  useEffect(() => {
    if (businessCatId) {
      fetchServiceTemplates();
    } else {
      setServiceTemplatesLoading(false);
    }
  }, [businessCatId]);

  const fetchServiceTemplates = async () => {
    if (!businessCatId) return;

    try {
      setServiceTemplatesLoading(true);
      setApiError(false);
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: Array<{
          id: number;
          name: string;
          category_id: number;
          category: string;
          base_price: number;
          duration_hours: number;
          duration_minutes: number;
          active: boolean;
          createdAt: string;
        }>;
      }>(businessEndpoints.serviceTemplates(businessCatId));

      if (response.success && response.data) {
        dispatch(setServiceTemplates(response.data));
      }
    } catch (error) {
      Logger.error("Failed to fetch service templates:", error);
      setApiError(true);
      showBanner(
        "API Failed",
        "API failed to fetch service templates",
        "error",
        2500
      );
    } finally {
      setServiceTemplatesLoading(false);
    }
  };

  // Convert API service template to Redux service format
  const convertTemplateToService = (template: {
    id: number;
    name: string;
    base_price: number;
    duration_hours: number;
    duration_minutes: number;
  }) => {
    return {
      id: template.id.toString(),
      name: template.name,
      hours: template.duration_hours,
      minutes: template.duration_minutes,
      price: template.base_price,
      currency: "USD",
    };
  };

  // Get popular suggestions (first 3 active templates)
  const popularSuggestions = useMemo(() => {
    return serviceTemplates
      .filter((template) => template.active)
      .slice(0, 3)
      .map(convertTemplateToService);
  }, [serviceTemplates]);

  // Get all suggestions (all active templates)
  const allSuggestions = useMemo(() => {
    return serviceTemplates
      .filter((template) => template.active)
      .map(convertTemplateToService);
  }, [serviceTemplates]);

  const handleSelectSuggestion = (suggestion: {
    id: string;
    name: string;
    hours: number;
    minutes: number;
    price: number;
    currency: string;
  }) => {
    const isSelected = services.some((s) => s.id === suggestion.id);
    if (isSelected) {
      dispatch(removeService(suggestion.id));
    } else {
      dispatch(addService(suggestion));
    }
  };

  const handleViewMore = () => {
    setServiceListVisible(true);
  };

  const handleEditService = (serviceId: string) => {
    setEditingServiceId(serviceId);
    setEditServiceVisible(true);
  };

  const handleCloseEditService = () => {
    setEditServiceVisible(false);
    setEditingServiceId(null);
  };

  const handleDeleteService = (serviceId: string) => {
    dispatch(removeService(serviceId));
  };

  const handleChangeBusinessCategory = () => {
    // Clear Step 2 fields (Business Name, Full Name, Phone)
    dispatch(setBusinessName(""));
    dispatch(setFullName(""));
    dispatch(setPhoneNumber({ value: "", isValid: false }));
    dispatch(setCountryDetails({ countryCode: "+1", countryIso: "US" }));

    // Clear Step 3 fields (Appointment Volume)
    dispatch(setAppointmentVolume(null));

    // Clear Step 4 fields (Address)
    dispatch(setAddressSearch(""));
    dispatch(setSelectedAddress(null));
    dispatch(setStreetAddress(""));
    dispatch(setArea(""));
    dispatch(setState(""));
    dispatch(setZipCode(""));
    dispatch(setUseCurrentLocation(false));
    dispatch(setAddressStage("search"));
    dispatch(setSelectedLocation(null));

    // Clear Step 5 fields (Team Size)
    dispatch(setTeamSize(null));

    // Clear Step 6 fields (Staff Invitations)
    dispatch(setStaffInvitationEmail(""));
    dispatch(setStaffInvitations([]));

    // Clear Step 7 fields (Business Hours) - Reset all days
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    days.forEach((day) => {
      dispatch(
        setDayHours({
          day,
          fromHours: 0,
          fromMinutes: 0,
          tillHours: 0,
          tillMinutes: 0,
          breaks: [],
        })
      );
    });

    // Clear Step 8 fields (Services)
    services.forEach((service) => {
      dispatch(removeService(service.id));
    });

    // Set current step to 1
    dispatch(setCurrentStep(1));
  };

  const hasNoData =
    !serviceTemplatesLoading && !apiError && serviceTemplates.length === 0;
  const showSkeleton = serviceTemplatesLoading && serviceTemplates.length === 0;

  return (
    <View style={styles.container}>
      {showSkeleton ? (
        <Skeleton screenType="StepEight" styles={styles} />
      ) : apiError ? (
        <View style={styles.emptyStateContainer}>
          <RetryButton
            onPress={fetchServiceTemplates}
            loading={serviceTemplatesLoading}
          />
        </View>
      ) : hasNoData ? (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateText}>
            Service data not found against category {businessCategory?.name}
          </Text>

          <TouchableOpacity onPress={handleChangeBusinessCategory}>
            <Text style={styles.changeCategoryText}>
              Change business category
            </Text>
          </TouchableOpacity>
          <View style={styles.retryButtonContainer}>
            <RetryButton
              onPress={fetchServiceTemplates}
              loading={serviceTemplatesLoading}
            />
          </View>
        </View>
      ) : (
        <>
          <View style={styles.titleSec}>
            <Text style={styles.title}>Let's add your first service</Text>
            <Text style={styles.subtitle}>
              This is how clients will book and pay for your work. You can
              always add more later.
            </Text>
          </View>

          {services.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                You haven't added any service yet
              </Text>
            </View>
          ) : (
            <View style={styles.servicesList}>
              {services.map((service, index) => (
                <React.Fragment key={service.id}>
                  <View style={styles.serviceCard}>
                    <TouchableOpacity
                      onPress={() => handleDeleteService(service.id)}
                      style={styles.deleteButton}
                    >
                      <MaterialIcons
                        name="delete-outline"
                        size={moderateWidthScale(19)}
                        color={theme.red}
                      />
                    </TouchableOpacity>
                    <View style={styles.serviceInfo}>
                      <Text style={styles.serviceName}>{service.name}</Text>
                      <Text style={styles.serviceDetails}>
                        {formatDuration(service.hours, service.minutes)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleEditService(service.id)}
                      style={styles.editButton}
                    >
                      <Text style={styles.servicePrice}>
                        {formatPrice(service.price, service.currency)} {"  >"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {index < services.length - 1 && (
                    <View style={styles.serviceSeparator} />
                  )}
                </React.Fragment>
              ))}
            </View>
          )}

          {(() => {
            // Filter out selected services from popular suggestions
            const unselectedSuggestions = popularSuggestions.filter(
              (s) => !services.some((service) => service.id === s.id)
            );

            if (unselectedSuggestions.length === 0) return null;

            return (
              <View style={styles.popularSection}>
                <Text style={styles.popularTitle}>
                  Popular starting points:
                </Text>
                {unselectedSuggestions.map((suggestion) => {
                  return (
                    <View key={suggestion.id}>
                      <TouchableOpacity
                        onPress={() => handleSelectSuggestion(suggestion)}
                        activeOpacity={0.7}
                        style={styles.suggestionItem}
                      >
                        <Text style={styles.suggestionText}>
                          {suggestion.name}
                        </Text>
                        <View style={styles.selectButton}>
                          <Text style={styles.selectButtonText}>Select</Text>
                        </View>
                      </TouchableOpacity>
                      <View style={styles.suggestionSeparator} />
                    </View>
                  );
                })}
              </View>
            );
          })()}

          <TouchableOpacity
            style={styles.viewMoreButton}
            onPress={handleViewMore}
          >
            <Text style={styles.viewMoreButtonText}>
              + View more suggestion
            </Text>
          </TouchableOpacity>

          <ServiceListBottomSheet
            visible={serviceListVisible}
            onClose={() => setServiceListVisible(false)}
            suggestions={allSuggestions}
            selectedServiceIds={services.map((s) => s.id)}
          />

          <EditServiceBottomSheet
            visible={editServiceVisible}
            onClose={handleCloseEditService}
            serviceId={editingServiceId}
          />
        </>
      )}
    </View>
  );
}
