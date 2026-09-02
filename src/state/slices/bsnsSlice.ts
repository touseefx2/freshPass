import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Service {
  id: number;
  name: string;
  description: string;
  price: number;
  originalPrice: number;
  duration: string;
  label?: string | null;
}

export interface StaffMember {
  id: number;
  name: string;
  experience: number | null;
  image: string | null;
  working_hours: BusinessHours | null;
  active?: boolean | null;
}

export interface BusinessHours {
  [key: string]: {
    isOpen: boolean;
    fromHours: number;
    fromMinutes: number;
    tillHours: number;
    tillMinutes: number;
    breaks: Array<{
      fromHours: number;
      fromMinutes: number;
      tillHours: number;
      tillMinutes: number;
    }>;
  };
}

export interface BusinessState {
  selectedService: Service | null;
  allServices: Service[];
  staffMembers: StaffMember[];
  businessId: string;
  selectedServices: Service[];
  selectedStaff: string; // "anyone" or staff id as string
  businessHours: BusinessHours | null;
  selectedDate: string | null; // YYYY-MM-DD
  selectedTimeSlot: string | null; // e.g. "09:00"
  /** Auto-assigned from available_staff[0] when "Anyone" + slot selected */
  assignedStaffId: number | null;
  selectedPaymentMethod: "payNow" | "payLater";
  selectedNote: string;
  /** Tip chosen at booking. null = no tip. */
  selectedTipAmount: number | null;
  /** From GET /api/business/details — "Solo" | "Business" | null */
  subscriptionPlanType: "Solo" | "Business" | null;
  /** From GET /api/business/details — "active" | "inactive" */
  subscriptionStatus: "active" | "inactive";
}

const initialState: BusinessState = {
  selectedService: null,
  allServices: [],
  staffMembers: [],
  businessId: "",
  selectedServices: [],
  selectedStaff: "anyone",
  businessHours: null,
  selectedDate: null,
  selectedTimeSlot: null,
  assignedStaffId: null,
  selectedPaymentMethod: "payNow",
  selectedNote: "",
  selectedTipAmount: null,
  subscriptionPlanType: null,
  subscriptionStatus: "inactive",
};

const bsnsSlice = createSlice({
  name: "bsns",
  initialState,
  reducers: {
    resetBusiness: () => initialState,
    setBusinessData(
      state,
      action: PayloadAction<{
        selectedService?: Service;
        allServices?: Service[];
        staffMembers?: StaffMember[];
        businessId?: string;
        businessHours?: BusinessHours | null;
        subscriptionPlanType?: "Solo" | "Business" | null;
        subscriptionStatus?: "active" | "inactive";
      }>,
    ) {
      if (action.payload.selectedService !== undefined) {
        state.selectedService = action.payload.selectedService;
        // Also set it as first item in selectedServices if not already there
        if (
          !state.selectedServices.find(
            (s) => s.id === action.payload.selectedService!.id,
          )
        ) {
          state.selectedServices = [action.payload.selectedService];
        }
      }
      if (action.payload.allServices !== undefined) {
        state.allServices = action.payload.allServices;
      }
      if (action.payload.staffMembers !== undefined) {
        state.staffMembers = action.payload.staffMembers;
      }
      if (action.payload.businessId !== undefined) {
        state.businessId = action.payload.businessId;
      }
      if (action.payload.businessHours !== undefined) {
        state.businessHours = action.payload.businessHours;
      }
      if (action.payload.subscriptionPlanType !== undefined) {
        state.subscriptionPlanType = action.payload.subscriptionPlanType;
      }
      if (action.payload.subscriptionStatus !== undefined) {
        state.subscriptionStatus = action.payload.subscriptionStatus;
      }
    },
    setSelectedServices(state, action: PayloadAction<Service[]>) {
      state.selectedServices = action.payload;
    },
    setSelectedStaff(state, action: PayloadAction<string>) {
      state.selectedStaff = action.payload;
    },
    setSelectedDate(state, action: PayloadAction<string | null>) {
      state.selectedDate = action.payload;
    },
    setSelectedTimeSlot(state, action: PayloadAction<string | null>) {
      state.selectedTimeSlot = action.payload;
    },
    setAssignedStaffId(state, action: PayloadAction<number | null>) {
      state.assignedStaffId = action.payload;
    },
    setSelectedPaymentMethod(
      state,
      action: PayloadAction<"payNow" | "payLater">,
    ) {
      state.selectedPaymentMethod = action.payload;
    },
    setSelectedNote(state, action: PayloadAction<string>) {
      state.selectedNote = action.payload;
    },
    setSelectedTipAmount(state, action: PayloadAction<number | null>) {
      state.selectedTipAmount = action.payload;
    },
    addService(state, action: PayloadAction<Service>) {
      const service = action.payload;
      if (!state.selectedServices.find((s) => s.id === service.id)) {
        state.selectedServices.push(service);
      }
    },
    removeService(state, action: PayloadAction<number>) {
      state.selectedServices = state.selectedServices.filter(
        (s) => s.id !== action.payload,
      );
    },
  },
});

export const {
  setBusinessData,
  setSelectedServices,
  setSelectedStaff,
  setSelectedDate,
  setSelectedTimeSlot,
  setAssignedStaffId,
  setSelectedPaymentMethod,
  setSelectedNote,
  setSelectedTipAmount,
  addService,
  removeService,
  resetBusiness,
} = bsnsSlice.actions;
export default bsnsSlice.reducer;
