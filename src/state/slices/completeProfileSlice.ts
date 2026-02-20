import { PayloadAction, createSlice } from "@reduxjs/toolkit";

const TOTAL_STEPS = 11 as const;

export interface CompleteProfileState {
  currentStep: number;
  totalSteps: number;
  searchTerm: string;
  businessCategory: {
    id: number;
    name: string;
  } | null;
  businessName: string;
  fullName: string;
  countryCode: string;
  countryIso: string;
  phonePlaceholder: string;
  phoneNumber: string;
  phoneIsValid: boolean;
  appointmentVolume: { id: string; title: string } | null;
  addressSearch: string;
  selectedAddress: string | null;
  streetAddress: string;
  area: string;
  state: string;
  zipCode: string;
  useCurrentLocation: boolean;
  addressStage: "search" | "confirm" | "map";
  selectedLocation: {
    latitude: number;
    longitude: number;
  } | null;
  teamSize: { id: string; title: string } | null;
  staffInvitationEmail: string;
  staffInvitations: Array<{ email: string; status: "sent" | "accepted" }>;
  businessHours: {
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
  };
  salonBusinessHours: {
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
  } | null;
  services: Array<{
    id: string;
    name: string;
    description?: string;
    hours: number;
    minutes: number;
    price: number;
    currency: string;
  }>;
  subscriptions: Array<{
    id: string;
    packageName: string;
    description?: string;
    servicesPerMonth: number;
    price: number;
    currency: string;
    serviceIds: string[];
  }>;
  tiktokUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  photos: Array<{
    id: string;
    uri: string;
  }>;
  categories: Array<{
    id: number;
    name: string;
    imageUrl: string | null;
  }>;
  serviceTemplates: Array<{
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
  businessServices: Array<{
    id: number;
    template_id: number;
    price: string;
    description: string;
    duration_hours: number;
    duration_minutes: number;
    active: boolean;
    businessId: number;
    business: string;
    templateId: number;
    name: string;
    category: string;
    created_at: string;
    createdAt: string;
  }>;
  profileImageUri: string | null;
  aboutYourself: string;
  dateOfBirth: {
    date: string;
    month: string;
    year: string;
  } | null;
  countryZipCode: string;
  countryName: string;
}

const initialState: CompleteProfileState = {
  currentStep: 1,
  // currentStep: 11,
  totalSteps: TOTAL_STEPS,
  searchTerm: "",
  businessCategory: null,
  businessName: "",
  fullName: "",
  countryCode: "+1",
  countryIso: "US",
  phonePlaceholder: "201 555 0123",
  phoneNumber: "",
  phoneIsValid: false,
  appointmentVolume: null,
  addressSearch: "",
  selectedAddress: null,
  streetAddress: "",
  area: "",
  state: "",
  zipCode: "",
  useCurrentLocation: false,
  addressStage: "search",
  selectedLocation: null,
  teamSize: null,
  staffInvitationEmail: "",
  staffInvitations: [],
  businessHours: {
    Sunday: {
      isOpen: false,
      fromHours: 0,
      fromMinutes: 0,
      tillHours: 0,
      tillMinutes: 0,
      breaks: [],
    },
    Monday: {
      isOpen: false,
      fromHours: 0,
      fromMinutes: 0,
      tillHours: 0,
      tillMinutes: 0,
      breaks: [],
    },
    Tuesday: {
      isOpen: false,
      fromHours: 0,
      fromMinutes: 0,
      tillHours: 0,
      tillMinutes: 0,
      breaks: [],
    },
    Wednesday: {
      isOpen: false,
      fromHours: 0,
      fromMinutes: 0,
      tillHours: 0,
      tillMinutes: 0,
      breaks: [],
    },
    Thursday: {
      isOpen: false,
      fromHours: 0,
      fromMinutes: 0,
      tillHours: 0,
      tillMinutes: 0,
      breaks: [],
    },
    Friday: {
      isOpen: false,
      fromHours: 0,
      fromMinutes: 0,
      tillHours: 0,
      tillMinutes: 0,
      breaks: [],
    },
    Saturday: {
      isOpen: false,
      fromHours: 0,
      fromMinutes: 0,
      tillHours: 0,
      tillMinutes: 0,
      breaks: [],
    },
  },
  salonBusinessHours: null,
  services: [],
  subscriptions: [],
  tiktokUrl: "",
  instagramUrl: "",
  facebookUrl: "",
  photos: [],
  categories: [],
  serviceTemplates: [],
  businessServices: [],
  profileImageUri: null,
  aboutYourself: "",
  dateOfBirth: null,
  countryZipCode: "",
  countryName: "",
};

const completeProfileSlice = createSlice({
  name: "completeProfile",
  initialState,
  reducers: {
    resetCompleteProfile: () => initialState,
    setCurrentStep: (state, action: PayloadAction<number>) => {
      state.currentStep = action.payload;
    },
    setTotalSteps: (state, action: PayloadAction<number>) => {
      state.totalSteps = action.payload;
    },
    goToNextStep: (state) => {
      if (state.currentStep < state.totalSteps) {
        state.currentStep += 1;
      }
    },
    goToPreviousStep: (state) => {
      if (state.currentStep > 1) {
        const nextStep = state.currentStep - 1;

        // Clear ALL Step 4 fields when going back to step 3 or earlier
        // This ensures all address-related fields are cleared when going from step 4 to step 3
        if (nextStep <= 3) {
          state.addressSearch = "";
          state.selectedAddress = null;
          state.streetAddress = "";
          state.area = "";
          state.state = "";
          state.zipCode = "";
          state.useCurrentLocation = false;
          state.addressStage = "search";
          state.selectedLocation = null;
        }

        if (nextStep < 3) {
          state.appointmentVolume = null;
        }

        // Don't clear Step 1 data when navigating back from Step 2 to Step 1.
        // Only reset these fields when jumping back from later steps.
        if (nextStep < 2 && state.currentStep > 2) {
          state.businessName = "";
          state.fullName = "";
          state.countryCode = "+1";
          state.countryIso = "US";
          state.phonePlaceholder = "201 555 0123";
          state.phoneNumber = "";
          state.phoneIsValid = false;
          state.profileImageUri = null;
          state.aboutYourself = "";
        }

        if (nextStep < 1) {
          state.searchTerm = "";
          state.businessCategory = null;
        }

        if (nextStep < 5) {
          state.teamSize = null;
        }

        if (nextStep < 6) {
          state.staffInvitationEmail = "";
          state.staffInvitations = [];
        }

        if (nextStep < 7) {
          // Reset business hours
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
            state.businessHours[day] = {
              isOpen: false,
              fromHours: 0,
              fromMinutes: 0,
              tillHours: 0,
              tillMinutes: 0,
              breaks: [],
            };
          });
        }

        if (nextStep < 8) {
          // Reset services
          state.services = [];
        }

        if (nextStep < 9) {
          // Reset subscriptions
          state.subscriptions = [];
        }

        if (nextStep < 10) {
          // Reset social media URLs
          state.tiktokUrl = "";
          state.instagramUrl = "";
          state.facebookUrl = "";
        }

        if (nextStep < 11) {
          // Reset photos
          state.photos = [];
        }

        state.currentStep = nextStep;
      } else {
        state.businessCategory = null;
        state.searchTerm = "";
        state.phoneNumber = "";
        state.phoneIsValid = false;
        state.countryCode = "+1";
        state.countryIso = "US";
        state.phonePlaceholder = "201 555 0123";
      }
    },
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload;
    },
    setBusinessCategory: (
      state,
      action: PayloadAction<{ id: number; name: string } | null>,
    ) => {
      state.businessCategory = action.payload;
    },
    setBusinessName: (state, action: PayloadAction<string>) => {
      state.businessName = action.payload;
    },
    setFullName: (state, action: PayloadAction<string>) => {
      state.fullName = action.payload;
    },
    setProfileImageUri: (state, action: PayloadAction<string | null>) => {
      state.profileImageUri = action.payload;
    },
    setAboutYourself: (state, action: PayloadAction<string>) => {
      state.aboutYourself = action.payload;
    },
    setPhoneNumber: (
      state,
      action: PayloadAction<{ value: string; isValid: boolean }>,
    ) => {
      state.phoneNumber = action.payload.value.replace(/\s+/g, "");
      state.phoneIsValid = action.payload.isValid;
    },
    setCountryDetails: (
      state,
      action: PayloadAction<{
        countryCode: string;
        countryIso: string;
        phonePlaceholder?: string;
      }>,
    ) => {
      state.countryCode = action.payload.countryCode;
      state.countryIso = action.payload.countryIso;
      state.phonePlaceholder =
        action.payload.phonePlaceholder ?? state.phonePlaceholder;
      state.phoneNumber = "";
      state.phoneIsValid = false;
    },
    setAppointmentVolume: (
      state,
      action: PayloadAction<{ id: string; title: string } | null>,
    ) => {
      state.appointmentVolume = action.payload;
    },
    setAddressSearch: (state, action: PayloadAction<string>) => {
      state.addressSearch = action.payload;
    },
    setSelectedAddress: (state, action: PayloadAction<string | null>) => {
      state.selectedAddress = action.payload;
    },
    setStreetAddress: (state, action: PayloadAction<string>) => {
      state.streetAddress = action.payload;
    },
    setArea: (state, action: PayloadAction<string>) => {
      state.area = action.payload;
    },
    setState: (state, action: PayloadAction<string>) => {
      state.state = action.payload;
    },
    setZipCode: (state, action: PayloadAction<string>) => {
      state.zipCode = action.payload;
    },
    setUseCurrentLocation: (state, action: PayloadAction<boolean>) => {
      state.useCurrentLocation = action.payload;
    },
    setAddressStage: (
      state,
      action: PayloadAction<CompleteProfileState["addressStage"]>,
    ) => {
      state.addressStage = action.payload;
    },
    setSelectedLocation: (
      state,
      action: PayloadAction<CompleteProfileState["selectedLocation"]>,
    ) => {
      state.selectedLocation = action.payload;
    },
    setTeamSize: (
      state,
      action: PayloadAction<{ id: string; title: string } | null>,
    ) => {
      state.teamSize = action.payload;
    },
    setStaffInvitationEmail: (state, action: PayloadAction<string>) => {
      state.staffInvitationEmail = action.payload;
    },
    addStaffInvitation: (
      state,
      action: PayloadAction<{ email: string; status: "sent" | "accepted" }>,
    ) => {
      // Check if invitation already exists
      const exists = state.staffInvitations.some(
        (inv) => inv.email.toLowerCase() === action.payload.email.toLowerCase(),
      );
      if (!exists) {
        state.staffInvitations.push(action.payload);
      }
    },
    setStaffInvitations: (
      state,
      action: PayloadAction<
        Array<{ email: string; status: "sent" | "accepted" }>
      >,
    ) => {
      state.staffInvitations = action.payload;
    },
    removeStaffInvitation: (state, action: PayloadAction<number>) => {
      state.staffInvitations.splice(action.payload, 1);
    },
    setDayAvailability: (
      state,
      action: PayloadAction<{ day: string; isOpen: boolean }>,
    ) => {
      if (!state.businessHours[action.payload.day]) {
        state.businessHours[action.payload.day] = {
          isOpen: false,
          fromHours: 0,
          fromMinutes: 0,
          tillHours: 0,
          tillMinutes: 0,
          breaks: [],
        };
      }
      state.businessHours[action.payload.day].isOpen = action.payload.isOpen;
    },
    setDayHours: (
      state,
      action: PayloadAction<{
        day: string;
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
      }>,
    ) => {
      if (!state.businessHours[action.payload.day]) {
        state.businessHours[action.payload.day] = {
          isOpen: true,
          fromHours: 0,
          fromMinutes: 0,
          tillHours: 0,
          tillMinutes: 0,
          breaks: [],
        };
      }
      state.businessHours[action.payload.day].fromHours =
        action.payload.fromHours;
      state.businessHours[action.payload.day].fromMinutes =
        action.payload.fromMinutes;
      state.businessHours[action.payload.day].tillHours =
        action.payload.tillHours;
      state.businessHours[action.payload.day].tillMinutes =
        action.payload.tillMinutes;
      state.businessHours[action.payload.day].breaks = action.payload.breaks;
      // Only set isOpen to true if we're setting valid hours (not clearing)
      if (action.payload.fromHours > 0 && action.payload.tillHours > 0) {
        state.businessHours[action.payload.day].isOpen = true;
      }
    },
    setDayBreakTime: (
      state,
      action: PayloadAction<{
        day: string;
        breakIndex: number;
        fromHours: number;
        fromMinutes: number;
        tillHours: number;
        tillMinutes: number;
      }>,
    ) => {
      if (!state.businessHours[action.payload.day]) {
        return;
      }
      if (
        !state.businessHours[action.payload.day].breaks[
          action.payload.breakIndex
        ]
      ) {
        state.businessHours[action.payload.day].breaks[
          action.payload.breakIndex
        ] = {
          fromHours: 0,
          fromMinutes: 0,
          tillHours: 0,
          tillMinutes: 0,
        };
      }
      state.businessHours[action.payload.day].breaks[
        action.payload.breakIndex
      ].fromHours = action.payload.fromHours;
      state.businessHours[action.payload.day].breaks[
        action.payload.breakIndex
      ].fromMinutes = action.payload.fromMinutes;
      state.businessHours[action.payload.day].breaks[
        action.payload.breakIndex
      ].tillHours = action.payload.tillHours;
      state.businessHours[action.payload.day].breaks[
        action.payload.breakIndex
      ].tillMinutes = action.payload.tillMinutes;
    },
    removeDayBreakTime: (
      state,
      action: PayloadAction<{ day: string; breakIndex: number }>,
    ) => {
      if (!state.businessHours[action.payload.day]) {
        return;
      }
      state.businessHours[action.payload.day].breaks.splice(
        action.payload.breakIndex,
        1,
      );
    },
    addService: (
      state,
      action: PayloadAction<{
        id: string;
        name: string;
        description?: string;
        hours: number;
        minutes: number;
        price: number;
        currency: string;
      }>,
    ) => {
      // Check if service with same id already exists
      const existingIndex = state.services.findIndex(
        (s) => s.id === action.payload.id,
      );
      if (existingIndex === -1) {
        state.services.push(action.payload);
      } else {
        // Update existing service
        state.services[existingIndex] = action.payload;
      }
    },
    updateService: (
      state,
      action: PayloadAction<{
        id: string;
        name: string;
        description?: string;
        hours: number;
        minutes: number;
        price: number;
        currency: string;
      }>,
    ) => {
      const index = state.services.findIndex((s) => s.id === action.payload.id);
      if (index !== -1) {
        state.services[index] = action.payload;
      }
    },
    removeService: (state, action: PayloadAction<string>) => {
      state.services = state.services.filter((s) => s.id !== action.payload);
    },
    addServicesFromSuggestions: (
      state,
      action: PayloadAction<
        Array<{
          id: string;
          name: string;
          description?: string;
          hours: number;
          minutes: number;
          price: number;
          currency: string;
        }>
      >,
    ) => {
      action.payload.forEach((service) => {
        const existingIndex = state.services.findIndex(
          (s) => s.id === service.id,
        );
        if (existingIndex === -1) {
          state.services.push(service);
        }
      });
    },
    addSubscription: (
      state,
      action: PayloadAction<{
        id: string;
        packageName: string;
        description?: string;
        servicesPerMonth: number;
        price: number;
        currency: string;
        serviceIds: string[];
      }>,
    ) => {
      // Check if subscription with same id already exists
      const existingIndex = state.subscriptions.findIndex(
        (s) => s.id === action.payload.id,
      );
      if (existingIndex === -1) {
        state.subscriptions.push(action.payload);
      } else {
        // Update existing subscription
        state.subscriptions[existingIndex] = action.payload;
      }
    },
    updateSubscription: (
      state,
      action: PayloadAction<{
        id: string;
        packageName: string;
        description?: string;
        servicesPerMonth: number;
        price: number;
        currency: string;
        serviceIds: string[];
      }>,
    ) => {
      const index = state.subscriptions.findIndex(
        (s) => s.id === action.payload.id,
      );
      if (index !== -1) {
        state.subscriptions[index] = action.payload;
      }
    },
    removeSubscription: (state, action: PayloadAction<string>) => {
      state.subscriptions = state.subscriptions.filter(
        (s) => s.id !== action.payload,
      );
    },
    setTiktokUrl: (state, action: PayloadAction<string>) => {
      state.tiktokUrl = action.payload;
    },
    setInstagramUrl: (state, action: PayloadAction<string>) => {
      state.instagramUrl = action.payload;
    },
    setFacebookUrl: (state, action: PayloadAction<string>) => {
      state.facebookUrl = action.payload;
    },
    addPhoto: (state, action: PayloadAction<{ id: string; uri: string }>) => {
      state.photos.push(action.payload);
    },
    removePhoto: (state, action: PayloadAction<string>) => {
      state.photos = state.photos.filter((p) => p.id !== action.payload);
    },
    setPhotos: (
      state,
      action: PayloadAction<Array<{ id: string; uri: string }>>,
    ) => {
      state.photos = action.payload;
    },
    setCategories: (
      state,
      action: PayloadAction<
        Array<{
          id: number;
          name: string;
          imageUrl: string | null;
        }>
      >,
    ) => {
      state.categories = action.payload;
    },
    setServiceTemplates: (
      state,
      action: PayloadAction<
        Array<{
          id: number;
          name: string;
          category_id: number;
          category: string;
          base_price: number;
          duration_hours: number;
          duration_minutes: number;
          active: boolean;
          createdAt: string;
        }>
      >,
    ) => {
      state.serviceTemplates = action.payload;
    },
    setBusinessServices: (
      state,
      action: PayloadAction<
        Array<{
          id: number;
          template_id: number;
          price: string;
          description: string;
          duration_hours: number;
          duration_minutes: number;
          active: boolean;
          businessId: number;
          business: string;
          templateId: number;
          name: string;
          category: string;
          created_at: string;
          createdAt: string;
        }>
      >,
    ) => {
      state.businessServices = action.payload;
    },
    setSubscriptions: (
      state,
      action: PayloadAction<
        Array<{
          id: string;
          packageName: string;
          servicesPerMonth: number;
          price: number;
          currency: string;
          serviceIds: string[];
        }>
      >,
    ) => {
      state.subscriptions = action.payload;
    },
    setServices: (
      state,
      action: PayloadAction<
        Array<{
          id: string;
          name: string;
          description?: string;
          hours: number;
          minutes: number;
          price: number;
          currency: string;
        }>
      >,
    ) => {
      state.services = action.payload;
    },
    setSalonBusinessHours: (
      state,
      action: PayloadAction<{
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
      }>,
    ) => {
      state.salonBusinessHours = action.payload;
    },
    setDateOfBirth: (
      state,
      action: PayloadAction<{
        date: string;
        month: string;
        year: string;
      } | null>,
    ) => {
      state.dateOfBirth = action.payload;
    },
    setCountryZipCode: (state, action: PayloadAction<string>) => {
      state.countryZipCode = action.payload;
    },
    setCountryName: (state, action: PayloadAction<string>) => {
      state.countryName = action.payload;
    },
  },
});

export const {
  resetCompleteProfile,
  setCurrentStep,
  setTotalSteps,
  goToNextStep,
  goToPreviousStep,
  setSearchTerm,
  setBusinessCategory,
  setBusinessName,
  setFullName,
  setProfileImageUri,
  setAboutYourself,
  setCountryDetails,
  setPhoneNumber,
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
  addStaffInvitation,
  setStaffInvitations,
  removeStaffInvitation,
  setDayAvailability,
  setDayHours,
  setDayBreakTime,
  removeDayBreakTime,
  addService,
  updateService,
  removeService,
  addServicesFromSuggestions,
  addSubscription,
  updateSubscription,
  removeSubscription,
  setTiktokUrl,
  setInstagramUrl,
  setFacebookUrl,
  addPhoto,
  removePhoto,
  setPhotos,
  setCategories,
  setServiceTemplates,
  setBusinessServices,
  setSubscriptions,
  setServices,
  setSalonBusinessHours,
  setDateOfBirth,
  setCountryZipCode,
  setCountryName,
} = completeProfileSlice.actions;

export default completeProfileSlice.reducer;
