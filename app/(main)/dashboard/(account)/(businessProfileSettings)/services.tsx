import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import StackHeader from "@/src/components/StackHeader";
import { Skeleton } from "@/src/components/skeletons";
import { ApiService } from "@/src/services/api";
import Logger from "@/src/services/logger";
import { businessEndpoints } from "@/src/services/endpoints";
import {
  addService,
  removeService,
  setServices,
  setServiceTemplates,
} from "@/src/state/slices/completeProfileSlice";
import EditServiceBottomSheet from "@/src/components/EditServiceBottomSheet";
import ServiceListBottomSheet from "@/src/components/ServiceListBottomSheet";
import ServiceList from "@/src/components/ServiceList";
import { useNotificationContext } from "@/src/contexts/NotificationContext";

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
      paddingTop: moderateHeightScale(20),
      paddingBottom: moderateHeightScale(24),
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
    serviceDescription: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen4,
      marginTop: moderateHeightScale(2),
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
    popularTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: moderateHeightScale(4),
    },
    popularTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.lightGreen4,
    },
    addServiceCircleButton: {
      width: moderateWidthScale(28),
      height: moderateWidthScale(28),
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.lightGreen2,
      alignItems: "center",
      justifyContent: "center",
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
    selectButtonWrapper: {
      position: "relative",
      alignSelf: "flex-start",
    },
    selectButtonShadow: {
      position: "absolute",
      top: moderateHeightScale(3),
      left: moderateWidthScale(3),
      right: moderateWidthScale(-3),
      bottom: moderateHeightScale(-3),
      borderRadius: moderateWidthScale(6),
      backgroundColor: theme.lightGreen2,
    },
    selectButton: {
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(6),
      borderRadius: moderateWidthScale(6),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      borderBottomWidth: moderateWidthScale(2),
      borderRightWidth: moderateWidthScale(2),
      backgroundColor: theme.background,
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
      zIndex: 1,
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
  template_id: number | null;
  name: string;
  price: string;
  description: string;
  duration_hours: number;
  duration_minutes: number;
  active: boolean;
  template: {
    id: number;
    name: string;
  } | null;
}

export default function ManageServicesScreen() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const { showBanner } = useNotificationContext();

  const { services, businessCategory, serviceTemplates } = useAppSelector(
    (state) => state.completeProfile,
  );

  const businessStatus = useAppSelector((state) => state.user.businessStatus);

  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingSync, setPendingSync] = useState(false);
  // Bumped on every local change; a refresh started before the latest change
  // is dropped so the server's older list can't overwrite it.
  const changeSeq = useRef(0);
  const markChanged = () => {
    changeSeq.current += 1;
    setPendingSync(true);
  };
  const idsBeforeSheet = useRef("");
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editServiceVisible, setEditServiceVisible] = useState(false);
  const [serviceListVisible, setServiceListVisible] = useState(false);

  // Map of local service id (template_id as string) -> backend service id
  const [serviceIdMap, setServiceIdMap] = useState<Record<string, number>>({});
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(
    null,
  );
  const [serviceTemplatesLoading, setServiceTemplatesLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

  const businessCatId =
    businessCategory?.id || businessStatus?.business_category?.id;

  const fetchServices = async (silent = false, seq?: number) => {
    if (!silent) setLoading(true);
    try {
      const response = await ApiService.get<{
        success: boolean;
        message: string;
        data: {
          services: ModuleService[];
        };
      }>(businessEndpoints.moduleData("services"));

      if (response.success && response.data && response.data.services) {
        const mapped = response.data.services.map((service) => {
          const isCustom = service.template_id == null;
          const id = isCustom
            ? `custom-${service.id}`
            : String(service.template_id);
          return {
            id,
            name: service.name,
            description: service.description || undefined,
            hours: service.duration_hours,
            minutes: service.duration_minutes,
            price: parseFloat(service.price),
            currency: "USD",
          };
        });

        const backendIdMap: Record<string, number> = {};
        response.data.services.forEach((service) => {
          const key =
            service.template_id == null
              ? `custom-${service.id}`
              : String(service.template_id);
          backendIdMap[key] = service.id;
        });

        if (seq !== undefined && seq !== changeSeq.current) return;
        setServiceIdMap(backendIdMap);
        dispatch(setServices(mapped));
      } else if (!silent) {
        setServiceIdMap({});
        dispatch(setServices([]));
      }
    } catch (error: any) {
      Logger.error("Failed to fetch services module data:", error);
      showBanner(
        "Error",
        error?.message || "Failed to fetch services. Please try again.",
        "error",
        3000,
      );
      if (!silent) dispatch(setServices([]));
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
          description?: string;
        }>;
      }>(businessEndpoints.serviceTemplates(businessCatId));

      if (response.success && response.data) {
        dispatch(setServiceTemplates(response.data));
      }
    } catch (error) {
      Logger.error("Failed to fetch service templates:", error);
      setApiError(true);
    } finally {
      setServiceTemplatesLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
    fetchServiceTemplates();
  }, []);

  // Use template description if API provides it, otherwise empty (user can add in edit sheet)
  const convertTemplateToService = (template: {
    id: number;
    name: string;
    base_price: number;
    duration_hours: number;
    duration_minutes: number;
    description?: string;
  }) => {
    return {
      id: template.id.toString(),
      name: template.name,
      description: template.description ?? "",
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
    markChanged();
  };

  const handleViewMore = () => {
    idsBeforeSheet.current = services.map((s) => s.id).join(",");
    setServiceListVisible(true);
  };

  const handleCloseServiceList = () => {
    setServiceListVisible(false);
    if (services.map((s) => s.id).join(",") !== idsBeforeSheet.current) {
      markChanged();
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    changeSeq.current += 1;
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
          handleCloseEditService();
          setServiceIdMap((prev) => {
            const updated = { ...prev };
            delete updated[serviceId];
            return updated;
          });
          showBanner(
            "Success",
            response.message || "Service deleted successfully.",
            "success",
            3000,
          );
        } else {
          showBanner(
            "Error",
            response.message || "Failed to delete service.",
            "error",
            3000,
          );
        }
      } catch (error: any) {
        Logger.error("Failed to delete service:", error);
        showBanner(
          "Error",
          error?.message || "Failed to delete service. Please try again.",
          "error",
          3000,
        );
      } finally {
        setDeletingServiceId(null);
      }
      return;
    }

    // For newly added services (not yet saved on backend), just remove from local list
    dispatch(removeService(serviceId));
    handleCloseEditService();
  };

  const handleEditService = (serviceId: string) => {
    setEditingServiceId(serviceId);
    setEditServiceVisible(true);
  };

  const handleCloseEditService = () => {
    setEditServiceVisible(false);
    setEditingServiceId(null);
  };

  // No Update button (client sample 10-21): every add/edit/select is saved
  // right away, then the list is re-read so new services get their backend ids.
  useEffect(() => {
    if (!pendingSync || isUpdating) return;
    setPendingSync(false);
    syncServices();
  }, [pendingSync, isUpdating, services]);

  const postServices = async (list: typeof services): Promise<boolean> => {
    try {
      const servicesPayload = list.map((service) => {
        const isCustom = service.id.startsWith("custom-");
        const description = service.description ?? service.name;
        const base = {
          price: service.price,
          description,
          duration_hours: service.hours,
          duration_minutes: service.minutes,
        };
        if (isCustom) {
          return { template_id: null, name: service.name, ...base };
        }
        return { template_id: Number(service.id), ...base };
      });

      const formData = new FormData();
      formData.append("services", JSON.stringify(servicesPayload));

      const response = await ApiService.post<{
        success: boolean;
        message: string;
        data?: any;
      }>(businessEndpoints.profile, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.success) {
        showBanner(
          "Success",
          response.message || "Services updated successfully",
          "success",
          3000,
        );
        return true;
      }
      showBanner(
        "Error",
        response.message || "Failed to update services",
        "error",
        3000,
      );
    } catch (error: any) {
      Logger.error("Failed to update services:", error);
      showBanner(
        "Error",
        error?.message || "Failed to update services. Please try again.",
        "error",
        3000,
      );
    }
    return false;
  };

  // Select / View more change the list first; on failure the re-read puts
  // the list back to what the server has.
  const syncServices = async () => {
    const seq = changeSeq.current;
    setIsUpdating(true);
    await postServices(services);
    await fetchServices(true, seq);
    setIsUpdating(false);
  };

  // Editor save: the server goes first (editor shows a loader); the list only
  // changes once it succeeded, and the editor stays open if it failed.
  const handleSubmitService = async (
    service: (typeof services)[number],
    isNew: boolean,
  ): Promise<boolean> => {
    const next = isNew
      ? [...services, service]
      : services.map((s) => (s.id === service.id ? service : s));
    changeSeq.current += 1;
    const seq = changeSeq.current;
    setIsUpdating(true);
    const ok = await postServices(next);
    if (ok) {
      dispatch(setServices(next));
      await fetchServices(true, seq);
    }
    setIsUpdating(false);
    return ok;
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <StackHeader title={t("individualServicesListTitle")} />
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <Skeleton screenType="StepEight" styles={styles} />
        ) : (
          <>
            <ServiceList
              services={services}
              onAdd={() => {
                setEditingServiceId(null);
                setEditServiceVisible(true);
              }}
              onEdit={handleEditService}
            />

            {!serviceTemplatesLoading &&
              !apiError &&
              popularSuggestions.length > 0 && (
                <View style={styles.popularSection}>
                  <View style={styles.popularTitleRow}>
                    <Text style={styles.popularTitle}>
                      Popular starting points:
                    </Text>
                  </View>
                  {popularSuggestions
                    .filter(
                      (s) => !services.some((service) => service.id === s.id),
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
                          <View style={styles.selectButtonWrapper}>
                            <View style={styles.selectButtonShadow} />
                            <View style={styles.selectButton}>
                              <Text style={styles.selectButtonText}>
                                Select
                              </Text>
                            </View>
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
                    onClose={handleCloseServiceList}
                    suggestions={allSuggestions}
                    selectedServiceIds={services.map((s) => s.id)}
                  />
                </>
              )}
          </>
        )}
      </ScrollView>

      <EditServiceBottomSheet
        visible={editServiceVisible}
        onClose={handleCloseEditService}
        serviceId={editingServiceId}
        onSubmit={handleSubmitService}
        onDelete={handleDeleteService}
        deleting={deletingServiceId !== null}
      />
    </SafeAreaView>
  );
}
