import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/src/hooks/hooks";
import { ApiService } from "@/src/services/api";
import { businessEndpoints } from "@/src/services/endpoints";
import Logger from "@/src/services/logger";
import { fetchReelServiceOptions } from "@/src/services/reelServicesOptions";
import { fetchStaffBusinessCategory } from "@/src/services/staffBusinessService";
import { fetchUserStatus } from "@/src/state/thunks/businessThunks";

type CategoryOption = { id: number; name: string };
type ServiceOption = { id: number; name: string };

/**
 * Category (defaults to the business's own) and optional service for a reel —
 * the same defaults as the AI auto reel details step. Loads nothing until
 * `enabled` (e.g. only once the Publish sheet is opened).
 */
export function useReelCategoryOptions(enabled: boolean) {
  const dispatch = useAppDispatch();
  const businessStatus = useAppSelector((s) => s.user.businessStatus);
  const userRole = useAppSelector((s) => s.user.userRole);
  // Staff: their owner's business (services list is read per business)
  const userBusinessId = useAppSelector(
    (s) => s.user.business_id ?? s.user.businessStatus?.business_id ?? null,
  );
  const completeProfileCategory = useAppSelector(
    (s) => s.completeProfile.businessCategory,
  );
  const selectBsnsCategory = useAppSelector((s) => s.user.selectBsnsCategory);
  // Staff: their owner's business category (they have no business status of their own)
  const [staffBusinessCategory, setStaffBusinessCategory] =
    useState<CategoryOption | null>(null);

  const resolvedBusinessCategory = useMemo(() => {
    if (businessStatus?.business_category?.id != null) {
      return businessStatus.business_category;
    }
    if (userRole === "staff") return staffBusinessCategory;
    if (completeProfileCategory?.id != null) return completeProfileCategory;
    const fromSelect = selectBsnsCategory?.[0];
    if (fromSelect?.id != null) return fromSelect;
    return null;
  }, [
    businessStatus?.business_category,
    userRole,
    staffBusinessCategory,
    completeProfileCategory,
    selectBsnsCategory,
  ]);

  const [categoryId, setCategoryId] = useState<number | null>(
    resolvedBusinessCategory?.id ?? null,
  );
  const [categoryName, setCategoryName] = useState(
    resolvedBusinessCategory?.name ?? "",
  );
  const userPickedCategoryRef = useRef(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [serviceId, setServiceId] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled || userRole !== "staff") return;
    fetchStaffBusinessCategory(userBusinessId)
      .then(setStaffBusinessCategory)
      .catch((error) => {
        Logger.error("Failed to load staff business category:", error);
      });
  }, [enabled, userRole, userBusinessId]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetchReelServiceOptions({ userRole, businessId: userBusinessId })
      .then((list) => {
        if (!cancelled) setServices(list);
      })
      .catch((error) => {
        Logger.error("Failed to load reel services:", error);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, userRole, userBusinessId]);

  useEffect(() => {
    if (!enabled || resolvedBusinessCategory?.id != null) return;
    void dispatch(fetchUserStatus({ showError: false }));
  }, [dispatch, enabled, resolvedBusinessCategory?.id]);

  // The business's category until the user picks another
  useEffect(() => {
    if (userPickedCategoryRef.current) return;
    if (!resolvedBusinessCategory?.id) return;
    setCategoryId(resolvedBusinessCategory.id);
    setCategoryName(resolvedBusinessCategory.name ?? "");
  }, [resolvedBusinessCategory]);

  const loadCategories = useCallback(async () => {
    if (categories.length > 0) return categories;
    setLoadingCategories(true);
    try {
      const catRes = await ApiService.get<{
        success: boolean;
        data?: CategoryOption[] | { data?: CategoryOption[] };
      }>(businessEndpoints.categories);
      const catData: CategoryOption[] = Array.isArray(catRes?.data)
        ? catRes.data
        : Array.isArray((catRes?.data as any)?.data)
          ? (catRes.data as any).data
          : [];
      setCategories(catData);
      return catData;
    } catch (error) {
      Logger.error("Failed to load categories:", error);
      return [];
    } finally {
      setLoadingCategories(false);
    }
  }, [categories]);

  const togglePicker = useCallback(async () => {
    setPickerOpen((prev) => !prev);
    if (!pickerOpen) await loadCategories();
  }, [loadCategories, pickerOpen]);

  const selectCategory = useCallback((cat: CategoryOption) => {
    userPickedCategoryRef.current = true;
    setCategoryId(cat.id);
    setCategoryName(cat.name);
    setPickerOpen(false);
  }, []);

  return {
    categoryId,
    categoryName,
    categories,
    loadingCategories,
    pickerOpen,
    togglePicker,
    selectCategory,
    services,
    serviceId,
    setServiceId,
  };
}
