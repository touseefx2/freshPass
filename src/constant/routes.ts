export const ROUTES = {
  MAIN: {
    ROLE: "role",
    SOCIAL_LOGIN: "socialLogin",
    INTRODUCTION_CLIENT: "introductionClient",
    LOGIN: "login",
    REGISTER: "register",
    REGISTER_PASSWORD: "register/password",
    REGISTER_NEXT_STEPS: "register/nextSteps",
    COMPLETE_PROFILE: "completeProfile",
    COMPLETE_CUSTOMER_PROFILE: "completeCusotmerProfile",
    COMPLETE_STAFF_PROFILE: "completeStaffProfile",
    ACCEPT_TERMS: "acceptTerms",
    INTRODUCTION: "introduction",
    DASHBOARD: "dashboard",
    HOME: "(home)",
    BOKING_DETAILS_BY_ID: "bookingDetailsById",
  },
} as const;

export const MAIN_ROUTES = ROUTES.MAIN;

