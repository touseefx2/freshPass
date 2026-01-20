import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import Button from "@/src/components/button";
import { Skeleton } from "@/src/components/skeletons";
import { ApiService } from "@/src/services/api";
import { businessEndpoints } from "@/src/services/endpoints";
import {
  addService,
  removeService,
  setServices,
  setServiceTemplates,
} from "@/src/state/slices/completeProfileSlice";
import EditServiceBottomSheet from "@/src/components/EditServiceBottomSheet";
import ServiceListBottomSheet from "@/src/components/ServiceListBottomSheet";
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

const formatPrice = (price: number | string, currency: string): string => {
  const numericPrice =
    typeof price === "string" ? parseFloat(price || "0") : price;
  return `$${numericPrice.toFixed(2)} ${currency}`;
};

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
      gap: moderateHeightScale(20),
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
    emptyStateContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: moderateWidthScale(20),
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
    popularSection: {},
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
  });

interface ModuleService {
  id: number;
  template_id: number;
  name: string;
  price: string;
  description: string;
  duration_hours: number;
  duration_minutes: number;
  active: boolean;
  template: {
    id: number;
    name: string;
  };
}

export default function ManageServicesScreen() {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const router = useRouter();
  const { showBanner } = useNotificationContext();

  const { services, businessCategory, serviceTemplates } = useAppSelector(
    (state) => state.completeProfile
  );

  const businessStatus = useAppSelector((state) => state.user.businessStatus);

  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editServiceVisible, setEditServiceVisible] = useState(false);
  const [serviceListVisible, setServiceListVisible] = useState(false);

  // Map of local service id (template_id as string) -> backend service id
  const [serviceIdMap, setServiceIdMap] = useState<Record<string, number>>({});
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);
  const [serviceTemplatesLoading, setServiceTemplatesLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

  const businessCatId =
    businessCategory?.id || businessStatus?.business_category?.id;

  const fetchServices = async () => {
    setLoading(true);
    try {
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: {
          services: ModuleService[];
        };
      }>(businessEndpoints.moduleData("services"));

      if (response.success && response.data && response.data.services) {
        const mapped = response.data.services.map((service) => ({
          id: service.template_id.toString(),
          name: service.name,
          hours: service.duration_hours,
          minutes: service.duration_minutes,
          price: parseFloat(service.price),
          currency: "USD",
        }));

        const backendIdMap: Record<string, number> = {};
        response.data.services.forEach((service) => {
          backendIdMap[service.template_id.toString()] = service.id;
        });

        setServiceIdMap(backendIdMap);
        dispatch(setServices(mapped));
      } else {
        setServiceIdMap({});
        dispatch(setServices([]));
      }
    } catch (error: any) {
      console.error("Failed to fetch services module data:", error);
      showBanner(
        "Error",
        error?.message || "Failed to fetch services. Please try again.",
        "error",
        3000
      );
      dispatch(setServices([]));
    } finally {
      setLoading(false);
    }
  };


  const fetchServiceTemplates = async () => {
    if (!businessCatId) {
      setServiceTemplatesLoading(false);
      return;
    }

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
      console.error("Failed to fetch service templates:", error);
      setApiError(true);
    } finally {
      setServiceTemplatesLoading(false);
    }
  } 

  useEffect(() => {
    fetchServices();
    fetchServiceTemplates();
  }, []);

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

  const popularSuggestions = useMemo(() => {
    return serviceTemplates
      .filter((template) => template.active)
      .slice(0, 3)
      .map(convertTemplateToService);
  }, [serviceTemplates]);

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

  const confirmDeleteService = (serviceId: string, serviceName: string) => {
    if (deletingServiceId) {
      return;
    }

    Alert.alert(
      "Delete service",
      `Are you sure you want to delete "${serviceName}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => handleDeleteService(serviceId),
        },
      ]
    );
  };

  const handleDeleteService = async (serviceId: string) => {
    const backendServiceId = serviceIdMap[serviceId];

    // If service exists on backend, delete via API
    if (backendServiceId) {
      setDeletingServiceId(serviceId);
      try {
        const response = await ApiService.delete<{
          success: boolean;
          message: string;
        }>(`/api/services/${backendServiceId}`);

        if (response.success) {
          dispatch(removeService(serviceId));
          setServiceIdMap((prev) => {
            const updated = { ...prev };
            delete updated[serviceId];
            return updated;
          });
          showBanner(
            "Success",
            response.message || "Service deleted successfully.",
            "success",
            3000
          );
        } else {
          showBanner(
            "Error",
            response.message || "Failed to delete service.",
            "error",
            3000
          );
        }
      } catch (error: any) {
        console.error("Failed to delete service:", error);
        showBanner(
          "Error",
          error?.message || "Failed to delete service. Please try again.",
          "error",
          3000
        );
      } finally {
        setDeletingServiceId(null);
      }
      return;
    }

    // For newly added services (not yet saved on backend), just remove from local list
    dispatch(removeService(serviceId));
  };

  const handleEditService = (serviceId: string) => {
    setEditingServiceId(serviceId);
    setEditServiceVisible(true);
  };

  const handleCloseEditService = () => {
    setEditServiceVisible(false);
    setEditingServiceId(null);
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      const servicesPayload = services.map((service) => ({
        template_id: Number(service.id),
        price: service.price,
        description: service.name,
        duration_hours: service.hours,
        duration_minutes: service.minutes,
      }));

      const servicesString = JSON.stringify(servicesPayload);

      const formData = new FormData();
      formData.append("services", servicesString);

      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      };

      const response = await ApiService.post<{
        success: boolean;
        message: string;
        data?: any;
      }>(businessEndpoints.profile, formData, config);

      if (response.success) {
        showBanner(
          "Success",
          response.message || "Services updated successfully",
          "success",
          3000
        );
        router.back();
      } else {
        showBanner(
          "Error",
          response.message || "Failed to update services",
          "error",
          3000
        );
      }
    } catch (error: any) {
      console.error("Failed to update services:", error);
      showBanner(
        "Error",
        error?.message || "Failed to update services. Please try again.",
        "error",
        3000
      );
    } finally {
      setIsUpdating(false);
    }
  };

 
  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <StackHeader title="Manage services list" />
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <Skeleton screenType="StepEight" styles={styles} />
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
                        onPress={
                          deletingServiceId
                            ? undefined
                            : () =>
                                confirmDeleteService(service.id, service.name)
                        }
                        style={styles.deleteButton}
                      >
                        {deletingServiceId === service.id ? (
                          <ActivityIndicator
                            size="small"
                            color={theme.red}
                          />
                        ) : (
                          <MaterialIcons
                            name="delete-outline"
                            size={moderateWidthScale(19)}
                            color={theme.red}
                          />
                        )}
                      </TouchableOpacity>
                      <View style={styles.serviceInfo}>
                        <Text style={styles.serviceName}>{service.name}</Text>
                        <Text style={styles.serviceDetails}>
                          {formatDuration(service.hours, service.minutes)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={
                          deletingServiceId === service.id
                            ? undefined
                            : () => handleEditService(service.id)
                        }
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

            {!serviceTemplatesLoading &&
              !apiError &&
              popularSuggestions.length > 0 && (
                <View style={styles.popularSection}>
                  <Text style={styles.popularTitle}>
                    Popular starting points:
                  </Text>
                  {popularSuggestions
                    .filter(
                      (s) => !services.some((service) => service.id === s.id)
                    )
                    .map((suggestion) => (
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
                    ))}
                </View>
              )}

            {!serviceTemplatesLoading &&
              !apiError &&
              allSuggestions.length > 0 && (
                <>
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
                </>
              )}
          </>
        )}
      </ScrollView>

      {!loading && (
        <View style={styles.continueButtonContainer}>
          <Button title="Update" onPress={handleUpdate} disabled={isUpdating} />
        </View>
      )}

      <EditServiceBottomSheet
        visible={editServiceVisible}
        onClose={handleCloseEditService}
        serviceId={editingServiceId}
      />
    </SafeAreaView>
  );
}
