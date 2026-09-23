/**
 * API Endpoints Configuration
 * Centralized endpoint definitions for all API routes
 * Note: Endpoints are relative paths since axios instance has baseURL configured
 */

/**
 * Staff endpoints
 */
export const staffEndpoints = {
  register: `/staff/auth/register`,
  details: (id: string | number) => `/api/staff/${id}/details`,
  delete: (id: number) => `/api/staff/${id}`,
  profile: `/api/staff/details`,
  availabilityHours: `/api/staff/availability-hours`,
  invite: `/api/staff/invite`,
  resendInvitation: (staffId: string | number) =>
    `/api/staff/${staffId}/resend-invitation`,
  ownerEnable: `/api/staff/owner/enable`,
  ownerDisable: `/api/staff/owner/disable`,
  list: (active?: string) => {
    if (active) {
      return `/api/staff?active=${active}`;
    }
    return `/api/staff`;
  },
  leaves: `/api/leaves`,
  leavesList: (params: { start_date: string; end_date: string }) => {
    const queryParams = new URLSearchParams();
    queryParams.append("start_date", params.start_date);
    queryParams.append("end_date", params.end_date);

    return `/api/leaves?${queryParams.toString()}`;
  },
  leaveCancel: (id: number) => `/api/leaves/${id}`,
  breaks: `/api/breaks`,
  workImages: `/api/staff/work-images`,
  workImage: (imageId: number | string) =>
    `/api/staff/work-images/${imageId}`,
  /** Logged-in user's work images (owner or staff) — no staff id required */
  myWorkImages: (page = 1, perPage = 20) => {
    const queryParams = new URLSearchParams();
    queryParams.append("page", page.toString());
    queryParams.append("per_page", perPage.toString());
    return `/api/staff/work-images?${queryParams.toString()}`;
  },
  images: (
    staffId: number | string,
    page = 1,
    perPage = 20,
  ) => {
    const queryParams = new URLSearchParams();
    queryParams.append("page", page.toString());
    queryParams.append("per_page", perPage.toString());
    return `/api/staff/${staffId}/images?${queryParams.toString()}`;
  },
};

/**
 * Customer endpoints
 */
export const customerEndpoints = {
  // Authentication
  register: `/customer/auth/register`,
};

/**
 * Business endpoints
 */
export const businessEndpoints = {
  register: `/api/register`,
  login: `/api/login`,
  logout: `/api/logout`,
  businessSearch: (search?: string, page = 1, perPage = 20) => {
    const queryParams = new URLSearchParams();
    if (search?.trim()) queryParams.append("search", search.trim());
    queryParams.append("page", page.toString());
    queryParams.append("per_page", perPage.toString());
    return `/api/businesses?${queryParams.toString()}`;
  },
  forgotPassword: `/api/forgot-password`,
  socialLogin: `/api/social-login`,
  categories: `/api/categories`,
  onboarding: `/api/business/onboarding`,
  serviceTemplates: (categoryId: number) =>
    `/api/service-templates?category_id=${categoryId}`,
  services: `/api/services?status=active`,
  profile: `/api/business/profile`,
  businesses: (categoryIds?: number | number[]) => {
    if (categoryIds) {
      const ids = Array.isArray(categoryIds) ? categoryIds : [categoryIds];
      return `/api/businesses?category_ids=${ids.join(",")}`;
    }
    return `/api/businesses`;
  },
  moduleData: (module: string, businessId?: number) => {
    const queryParams = new URLSearchParams();
    queryParams.append("module", module);
    if (businessId) {
      queryParams.append("business_id", businessId.toString());
    }
    return `/api/business/module-data?${queryParams.toString()}`;
  },
  subscriptionPlans: (
    planType: string = "business",
    status: string = "active",
    sort: string = "price",
    direction: string = "asc",
  ) =>
    `/api/subscription-plans?plan_type=${planType}&status=${status}&sort=${sort}&direction=${direction}`,
  trialStatus: `/api/business/trial-status`,
  additionalServices: (type: "customer" | "business" = "business") =>
    `/api/additional-services?type=${type}`,
  subscribe: (planId: number) => `/api/subscription-plans/${planId}/subscribe`,
  subscriptions: (status?: string, type?: string) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    const query = params.toString();
    return query ? `/api/subscriptions?${query}` : `/api/subscriptions`;
  },
  cancelTrial: (subscriptionId: number) =>
    `/api/subscriptions/${subscriptionId}/cancel-trial`,
  cancelSubscription: (subscriptionId: number) =>
    `/api/subscriptions/${subscriptionId}/cancel`,
  businessDetails: (businessId: string | number) =>
    `/api/business/details?business_id=${businessId}`,
  ownerWorkImages: (
    businessId: string | number,
    page = 1,
    perPage = 20,
  ) => {
    const queryParams = new URLSearchParams();
    queryParams.append("page", page.toString());
    queryParams.append("per_page", perPage.toString());
    return `/api/businesses/${businessId}/owner-work-images?${queryParams.toString()}`;
  },
  favorite: (businessId: string | number) =>
    `/api/businesses/${businessId}/favorite`,
  follow: (businessId: string | number) =>
    `/api/businesses/${businessId}/follow`,
  generateSubscription: `/api/subscription/generate`,
  stripeConnectCongratsSeen: `/api/business/stripe-connect-congrats/seen`,
  cancellationPolicy: `/api/business/cancellation-policy`,
};

/**
 * User endpoints
 */
export const userEndpoints = {
  details: `/api/user/details`,
  detailsById: (id: string | number) => `/api/user/details/${id}`,
  update: `/api/user`,
  changePassword: `/api/user/change-password`,
  deleteAccount: `/api/user/account`,
  status: `/api/user/status`,
  pushToken: `/api/user/push-token`,
};

/**
 * Stripe payment endpoints
 */
export const stripeEndpoints = {
  config: `/api/config/stripe`,
  paymentSheet: `/api/payment-sheet`,
  paymentSheetAiTools: `/api/payment-sheet/ai-tools`,
  profile: `/api/staff/details`,
  connectAccountSession: `/api/stripe/connect/account-session`,
  connectStatus: `/api/stripe/connect/status`,
};

/**
 * Apple In-App Purchase endpoints
 */
export const iapEndpoints = {
  verifyAi: `/api/iap/apple/verify`,
  verifyBusinessSubscription: `/api/iap/apple/verify/business-subscription`,
  accountToken: `/api/iap/apple/account-token`,
};

/**
 * Dashboard endpoints
 */
export const dashboardEndpoints = {
  stats: (month?: string) => {
    if (month) {
      return `/api/dashboard/stats?month=${month}`;
    }
    return `/api/dashboard/stats`;
  },
};

/**
 * Business earnings endpoints
 */
export const businessEarningsEndpoints = {
  report: (params?: {
    month?: string;
    revenue_source?: string;
    payment_status?: string;
    transaction_type?: string;
    staff_id?: string | number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.month) queryParams.append("month", params.month);
    if (params?.revenue_source && params.revenue_source !== "all") {
      queryParams.append("revenue_source", params.revenue_source);
    }
    if (params?.payment_status && params.payment_status !== "all") {
      queryParams.append("payment_status", params.payment_status);
    }
    if (params?.transaction_type && params.transaction_type !== "all") {
      queryParams.append("transaction_type", params.transaction_type);
    }
    if (
      params?.staff_id != null &&
      params.staff_id !== "" &&
      params.staff_id !== "all"
    ) {
      queryParams.append("staff_id", String(params.staff_id));
    }
    const query = queryParams.toString();
    return `/api/business/earnings${query ? `?${query}` : ""}`;
  },
  months: (months: number = 12, staffId?: string | number) => {
    const queryParams = new URLSearchParams();
    queryParams.append("months", String(months));
    if (staffId != null && staffId !== "" && staffId !== "all") {
      queryParams.append("staff_id", String(staffId));
    }
    return `/api/business/earnings/months?${queryParams.toString()}`;
  },
  staff: (params?: {
    month?: string;
    revenue_source?: string;
    payment_status?: string;
    transaction_type?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.month) queryParams.append("month", params.month);
    if (params?.revenue_source && params.revenue_source !== "all") {
      queryParams.append("revenue_source", params.revenue_source);
    }
    if (params?.payment_status && params.payment_status !== "all") {
      queryParams.append("payment_status", params.payment_status);
    }
    if (params?.transaction_type && params.transaction_type !== "all") {
      queryParams.append("transaction_type", params.transaction_type);
    }
    const query = queryParams.toString();
    return `/api/business/earnings/staff${query ? `?${query}` : ""}`;
  },
  transactions: (params?: {
    month?: string;
    revenue_source?: string;
    payment_status?: string;
    transaction_type?: string;
    staff_id?: string | number;
    page?: number;
    per_page?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.month) queryParams.append("month", params.month);
    if (params?.revenue_source && params.revenue_source !== "all") {
      queryParams.append("revenue_source", params.revenue_source);
    }
    if (params?.payment_status && params.payment_status !== "all") {
      queryParams.append("payment_status", params.payment_status);
    }
    if (params?.transaction_type && params.transaction_type !== "all") {
      queryParams.append("transaction_type", params.transaction_type);
    }
    if (
      params?.staff_id != null &&
      params.staff_id !== "" &&
      params.staff_id !== "all"
    ) {
      queryParams.append("staff_id", String(params.staff_id));
    }
    if (params?.page != null) queryParams.append("page", params.page.toString());
    if (params?.per_page != null) {
      queryParams.append("per_page", params.per_page.toString());
    }
    const query = queryParams.toString();
    return `/api/business/earnings/transactions${query ? `?${query}` : ""}`;
  },
};

export interface AvailableSlotStaff {
  id: number;
  name: string | null;
}

export interface AvailableSlot {
  start: string;
  end: string;
  available_staff?: AvailableSlotStaff[];
}

/** Pick one staff at random from available_staff (falls back to first if only one). */
export function pickRandomAvailableStaff(
  availableStaff?: AvailableSlotStaff[] | null,
): AvailableSlotStaff | undefined {
  if (!availableStaff?.length) return undefined;
  if (availableStaff.length === 1) return availableStaff[0];
  const index = Math.floor(Math.random() * availableStaff.length);
  return availableStaff[index];
}

/** Resolve staff_id for POST/PUT appointment when "Anyone" auto-assigns an available staff. */
export function resolveAppointmentStaffId(params: {
  selectedStaff: string;
  assignedStaffId: number | null;
  selectedTimeSlot?: string | null;
  slots?: AvailableSlot[];
}): number | undefined {
  if (params.selectedStaff !== "anyone") {
    const id = parseInt(params.selectedStaff, 10);
    return Number.isNaN(id) ? undefined : id;
  }
  if (params.assignedStaffId != null) {
    return params.assignedStaffId;
  }
  if (params.selectedTimeSlot && params.slots?.length) {
    const slot = params.slots.find((s) => s.start === params.selectedTimeSlot);
    const picked = pickRandomAvailableStaff(slot?.available_staff);
    if (picked) return picked.id;
  }
  return undefined;
}

export const appointmentsEndpoints = {
  list: (params?: {
    status?: string;
    search?: string;
    sort?: string;
    direction?: string;
    per_page?: number;
    page?: number;
    from_date?: string;
    to_date?: string;
    appointment_from_date?: string;
    appointment_to_date?: string;
    staff_id?: number;
    appointment_type?: string;
  }) => {
    const queryParams = new URLSearchParams();

    if (params?.status) queryParams.append("status", params.status);
    if (params?.search) queryParams.append("search", params.search);
    if (params?.sort) queryParams.append("sort", params.sort);
    if (params?.direction) queryParams.append("direction", params.direction);
    if (params?.per_page)
      queryParams.append("per_page", params.per_page.toString());
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.from_date) queryParams.append("from_date", params.from_date);
    if (params?.to_date) queryParams.append("to_date", params.to_date);
    if (params?.appointment_from_date)
      queryParams.append("appointment_from_date", params.appointment_from_date);
    if (params?.appointment_to_date)
      queryParams.append("appointment_to_date", params.appointment_to_date);
    if (params?.staff_id)
      queryParams.append("staff_id", params.staff_id.toString());
    if (params?.appointment_type)
      queryParams.append("appointment_type", params.appointment_type);

    const queryString = queryParams.toString();
    return `/api/appointments${queryString ? `?${queryString}` : ""}`;
  },
  create: `/api/appointments`,
  getById: (bookingId: string | number) => `/api/appointments/${bookingId}`,
  cancel: (bookingId: string | number) =>
    `/api/appointments/${bookingId}/cancel`,
  complete: (bookingId: string | number) =>
    `/api/appointments/${bookingId}/complete`,
  reschedule: (appointmentId: string | number) =>
    `/api/appointments/${appointmentId}/reschedule`,
  tipDetails: (appointmentId: string | number) =>
    `/api/appointments/${appointmentId}/tip`,
  tipPaymentSheet: (appointmentId: string | number) =>
    `/api/appointments/${appointmentId}/tip/payment-sheet`,
  cancellationPolicyQuote: (params: {
    business_id: number;
    appointment_date: string;
    appointment_time: string;
    service_ids?: number[];
    appointment_type?: "service" | "subscription";
  }) => {
    const q = new URLSearchParams({
      business_id: String(params.business_id),
      appointment_date: params.appointment_date,
      appointment_time: params.appointment_time,
    });
    if (params.appointment_type) {
      q.append("appointment_type", params.appointment_type);
    }
    (params.service_ids ?? []).forEach((id) =>
      q.append("service_ids[]", String(id)),
    );
    return `/api/appointments/cancellation-policy?${q.toString()}`;
  },
  cardSetup: `/api/appointments/card-setup`,
  cancellationPreview: (id: string | number) =>
    `/api/appointments/${id}/cancellation-preview`,
  awaitingOutcome: (params?: { per_page?: number; page?: number }) => {
    const q = new URLSearchParams();
    if (params?.per_page != null)
      q.append("per_page", String(params.per_page));
    if (params?.page != null) q.append("page", String(params.page));
    const query = q.toString();
    return `/api/appointments/awaiting-outcome${query ? `?${query}` : ""}`;
  },
  outcomePreview: (
    id: string | number,
    outcome: "completed" | "no_show",
  ) => `/api/appointments/${id}/outcome-preview?outcome=${outcome}`,
  markOutcome: (id: string | number) => `/api/appointments/${id}/outcome`,
  correctionPreview: (id: string | number) =>
    `/api/appointments/${id}/outcome-correction-preview`,
  correctOutcome: (id: string | number) =>
    `/api/appointments/${id}/outcome/correct`,
  restoreVisit: (id: string | number) =>
    `/api/appointments/${id}/restore-visit`,
  availableSlots: (params: {
    business_id: number;
    date: string;
    staff_id?: number;
    slot_minutes?: number;
    exclude_appointment_id?: number;
  }) => {
    const queryParams = new URLSearchParams();
    queryParams.append("business_id", params.business_id.toString());
    queryParams.append("date", params.date);
    if (params.staff_id != null)
      queryParams.append("staff_id", params.staff_id.toString());
    if (params.slot_minutes != null)
      queryParams.append("slot_minutes", params.slot_minutes.toString());
    if (params.exclude_appointment_id != null)
      queryParams.append(
        "exclude_appointment_id",
        params.exclude_appointment_id.toString(),
      );
    return `/api/available-slots?${queryParams.toString()}`;
  },
};

/**
 * Reviews endpoints
 */
export const reviewsEndpoints = {
  list: (params?: {
    page?: number;
    per_page?: number;
    business_id?: number | string;
    user_id?: number | string;
  }) => {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.per_page)
      queryParams.append("per_page", params.per_page.toString());
    if (params?.business_id)
      queryParams.append("business_id", params.business_id.toString());
    if (params?.user_id)
      queryParams.append("user_id", params.user_id.toString());

    const queryString = queryParams.toString();
    return `/api/reviews${queryString ? `?${queryString}` : ""}`;
  },
  create: `/api/reviews`,
  suggestions: `/api/review-suggestions`,
};

/**
 * Notifications endpoints
 */
export const notificationsEndpoints = {
  list: (params?: { page?: number; per_page?: number }) => {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.per_page)
      queryParams.append("per_page", params.per_page.toString());

    const queryString = queryParams.toString();
    return `/api/notifications${queryString ? `?${queryString}` : ""}`;
  },
  markAsRead: (notificationId: number) =>
    `/api/notifications/${notificationId}/read`,
  markAllAsRead: `/api/notifications/mark-all-read`,
  unreadCount: `/api/notifications/unread-count`,
  preferences: `/api/notification-preferences`,
};

/**
 * Solo-owner affiliation requests managed by host businesses.
 */
export const affiliationEndpoints = {
  list: (params?: {
    status?: "pending" | "approved" | "rejected" | "removed" | "all";
    page?: number;
    per_page?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append("status", params.status);
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.per_page)
      queryParams.append("per_page", params.per_page.toString());
    const queryString = queryParams.toString();
    return `/api/affiliation-requests${queryString ? `?${queryString}` : ""}`;
  },
  approve: (requestId: number) =>
    `/api/affiliation-requests/${requestId}/approve`,
  reject: (requestId: number) =>
    `/api/affiliation-requests/${requestId}/reject`,
  remove: (requestId: number) =>
    `/api/affiliation-requests/${requestId}/remove`,
};

/**
 * Email verification endpoints
 */
export const emailVerificationEndpoints = {
  verify: `/api/email/verify`,
  resendNotification: `/api/email/verification-notification`,
};

/**
 * Social media endpoints
 */
export const socialMediaEndpoints = {
  generatePost: `/api/social-media/generate-post`,
  generateCollage: `/api/social-media/generate-collage`,
  generateReel: `/api/social-media/generate-reel`,
};

/**
 * Hair tryon endpoints
 */
export const hairTryonEndpoints = {
  generateWithReplicate: `/api/hair_tryon/generate_with_replicate`,
  hairPipeline: `/api/hair_tryon/hair_pipeline`,
};

/**
 * In-app chat endpoints (conversations / messages)
 */
export const chatEndpoints = {
  unreadCount: `/api/chat/unread-count`,
  potentialContacts: (params?: { page?: number; per_page?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.page != null)
      queryParams.append("page", params.page.toString());
    if (params?.per_page != null)
      queryParams.append("per_page", params.per_page.toString());
    const query = queryParams.toString();
    return `/api/chat/potential-contacts${query ? `?${query}` : ""}`;
  },
};

/**
 * Client chat endpoints
 */
export const clientChatEndpoints = {
  chatStream: `/api/client_chat/chat/stream`,
};

/**
 * Explore / search endpoints
 */
export const exploreEndpoints = {
  serviceBusinessList: (
    search: string,
    options?: {
      businesses_only?: boolean;
      exclude_business_id?: number;
    },
  ) => {
    const queryParams = new URLSearchParams();
    queryParams.append("search", search);
    if (options?.businesses_only === true) {
      queryParams.append("businesses_only", "true");
    }
    if (options?.exclude_business_id != null) {
      queryParams.append(
        "exclude_business_id",
        String(options.exclude_business_id),
      );
    }
    return `/api/service-business-list?${queryParams.toString()}`;
  },
};

/**
 * AI requests endpoints
 */
export const aiRequestsEndpoints = {
  list: (params?: { page?: number; per_page?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.per_page)
      queryParams.append("per_page", params.per_page.toString());
    const query = queryParams.toString();
    return `/api/ai-requests${query ? `?${query}` : ""}`;
  },
  getByJobId: (jobId: string) => `/api/ai-requests/${jobId}`,
};

/**
 * AI transactions endpoints
 */
export const aiTransactionsEndpoints = {
  list: (params?: { page?: number; per_page?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.per_page)
      queryParams.append("per_page", params.per_page.toString());
    const query = queryParams.toString();
    return `/api/ai/transactions${query ? `?${query}` : ""}`;
  },
};

/**
 * Business customers endpoints
 */
export const customersEndpoints = {
  list: (params?: {
    search?: string;
    subscription_state?: string;
    sort?: string;
    direction?: "asc" | "desc";
    page?: number;
    per_page?: number;
    from_date?: string;
    to_date?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append("search", params.search);
    if (params?.subscription_state) {
      queryParams.append("subscription_state", params.subscription_state);
    }
    if (params?.sort) queryParams.append("sort", params.sort);
    if (params?.direction) queryParams.append("direction", params.direction);
    if (params?.page != null) queryParams.append("page", params.page.toString());
    if (params?.per_page != null) {
      queryParams.append("per_page", params.per_page.toString());
    }
    if (params?.from_date) queryParams.append("from_date", params.from_date);
    if (params?.to_date) queryParams.append("to_date", params.to_date);
    const query = queryParams.toString();
    return `/api/customers${query ? `?${query}` : ""}`;
  },
  detail: (id: string | number) => `/api/customers/${id}`,
};

/**
 * Favorites endpoints
 */
export const favoritesEndpoints = {
  list: (params?: { page?: number; per_page?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.per_page)
      queryParams.append("per_page", params.per_page.toString());
    const query = queryParams.toString();
    return `/api/favorites${query ? `?${query}` : ""}`;
  },
};

/**
 * General / landing endpoints
 */
export const generalEndpoints = {
  proTipCards: `/api/pro-tip-cards`,
  proTipCardDetail: (slug: string) => `/api/pro-tip-cards/${slug}`,
  checkEmail: `/api/check-email`,
};

/**
 * Memories (AI outputs) endpoints
 */
export const memoriesEndpoints = {
  list: (params?: { page?: number; per_page?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.page != null)
      queryParams.append("page", params.page.toString());
    if (params?.per_page != null)
      queryParams.append("per_page", params.per_page.toString());
    const query = queryParams.toString();
    return `/api/memories${query ? `?${query}` : ""}`;
  },
};

/**
 * Media library (business video) endpoints — R-01 / R-02
 */
export const mediaEndpoints = {
  list: (params?: {
    page?: number;
    per_page?: number;
    status?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.page != null)
      queryParams.append("page", params.page.toString());
    if (params?.per_page != null)
      queryParams.append("per_page", params.per_page.toString());
    if (params?.status) queryParams.append("status", params.status);
    const query = queryParams.toString();
    return `/api/media${query ? `?${query}` : ""}`;
  },
  getById: (id: number | string) => `/api/media/${id}`,
  upload: `/api/media`,
  /** Copy a finished Generate Reel AI job into the business media library (R-19) */
  fromAi: `/api/media/from-ai`,
  deleteOne: (id: number | string) => `/api/media/${id}`,
  deleteBulk: `/api/media`,
  limits: `/api/media/limits`,
};

/**
 * Reels endpoints — R-03 / R-04 / R-09 / R-10 / R-11
 */
export const reelsEndpoints = {
  create: `/api/reels`,
  mine: (params?: {
    status?: string;
    page?: number;
    per_page?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append("status", params.status);
    if (params?.page != null)
      queryParams.append("page", params.page.toString());
    if (params?.per_page != null)
      queryParams.append("per_page", params.per_page.toString());
    const query = queryParams.toString();
    return `/api/reels/mine${query ? `?${query}` : ""}`;
  },
  mineById: (id: number | string) => `/api/reels/mine/${id}`,
  update: (id: number | string) => `/api/reels/${id}`,
  publish: (id: number | string) => `/api/reels/${id}/publish`,
  unpublish: (id: number | string) => `/api/reels/${id}/unpublish`,
  delete: (id: number | string) => `/api/reels/${id}`,
  mineStats: `/api/reels/mine/stats`,
  mineReelStats: (id: number | string) => `/api/reels/mine/${id}/stats`,
  categories: `/api/reels/categories`,
  /** R-24: category dwell — call once when leaving a category */
  categoryDwell: (categoryId: number | string) =>
    `/api/reels/categories/${categoryId}/dwell`,
  feed: (params?: {
    category_id?: number | string;
    first_reel_id?: number | string;
    per_page?: number;
    cursor?: string;
    latitude?: number;
    longitude?: number;
    tab?: "for_you" | "following";
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.category_id != null)
      queryParams.append("category_id", String(params.category_id));
    if (params?.first_reel_id != null)
      queryParams.append("first_reel_id", String(params.first_reel_id));
    if (params?.per_page != null)
      queryParams.append("per_page", String(params.per_page));
    if (params?.cursor) queryParams.append("cursor", params.cursor);
    if (params?.latitude != null)
      queryParams.append("latitude", String(params.latitude));
    if (params?.longitude != null)
      queryParams.append("longitude", String(params.longitude));
    if (params?.tab) queryParams.append("tab", params.tab);
    const query = queryParams.toString();
    return `/api/reels/feed${query ? `?${query}` : ""}`;
  },
  getById: (
    id: number | string,
    params?: { latitude?: number; longitude?: number },
  ) => {
    const queryParams = new URLSearchParams();
    if (params?.latitude != null)
      queryParams.append("latitude", String(params.latitude));
    if (params?.longitude != null)
      queryParams.append("longitude", String(params.longitude));
    const query = queryParams.toString();
    return `/api/reels/${id}${query ? `?${query}` : ""}`;
  },
  view: (id: number | string) => `/api/reels/${id}/view`,
  events: (id: number | string) => `/api/reels/${id}/events`,
  like: (id: number | string) => `/api/reels/${id}/like`,
  save: (id: number | string) => `/api/reels/${id}/save`,
  share: (id: number | string) => `/api/reels/${id}/share`,
  report: (id: number | string) => `/api/reels/${id}/report`,
  comments: (
    id: number | string,
    params?: { per_page?: number; cursor?: string },
  ) => {
    const queryParams = new URLSearchParams();
    if (params?.per_page != null)
      queryParams.append("per_page", String(params.per_page));
    if (params?.cursor) queryParams.append("cursor", params.cursor);
    const query = queryParams.toString();
    return `/api/reels/${id}/comments${query ? `?${query}` : ""}`;
  },
  commentDelete: (id: number | string, commentId: number | string) =>
    `/api/reels/${id}/comments/${commentId}`,
  commentReport: (id: number | string, commentId: number | string) =>
    `/api/reels/${id}/comments/${commentId}/report`,
  /** I Want This Look sheet payload + look_tap analytics */
  look: (id: number | string) => `/api/reels/${id}/look`,
  /** Reel-tied AI try-on (multipart source_image) */
  tryOn: (id: number | string) => `/api/reels/${id}/try-on`,
};

/** Poll reel try-on job status */
export const tryOnEndpoints = {
  getByJobId: (jobId: string) => `/api/try-ons/${jobId}`,
};

/**
 * Saved reels — R-12 "My Looks"
 */
export const myLooksEndpoints = {
  list: (params?: {
    per_page?: number;
    cursor?: string;
    latitude?: number;
    longitude?: number;
    type?: "reels" | "ai" | "all";
    cursor_reels?: string;
    cursor_ai?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.per_page != null)
      queryParams.append("per_page", String(params.per_page));
    if (params?.cursor) queryParams.append("cursor", params.cursor);
    if (params?.latitude != null)
      queryParams.append("latitude", String(params.latitude));
    if (params?.longitude != null)
      queryParams.append("longitude", String(params.longitude));
    if (params?.type) queryParams.append("type", params.type);
    if (params?.cursor_reels)
      queryParams.append("cursor_reels", params.cursor_reels);
    if (params?.cursor_ai) queryParams.append("cursor_ai", params.cursor_ai);
    const query = queryParams.toString();
    return `/api/my-looks${query ? `?${query}` : ""}`;
  },
  saveAi: `/api/my-looks/ai`,
  deleteAi: (id: number | string) => `/api/my-looks/ai/${id}`,
};

/**
 * Follow businesses — R-15
 */
export const followingEndpoints = {
  list: (params?: { page?: number; per_page?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.page != null) queryParams.append("page", String(params.page));
    if (params?.per_page != null)
      queryParams.append("per_page", String(params.per_page));
    const query = queryParams.toString();
    return `/api/following${query ? `?${query}` : ""}`;
  },
};

/**
 * Business followers (owner reads who follows their business)
 */
export const businessFollowersEndpoints = {
  list: (params?: {
    page?: number;
    per_page?: number;
    search?: string;
    business_id?: number | string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.page != null) queryParams.append("page", String(params.page));
    if (params?.per_page != null)
      queryParams.append("per_page", String(params.per_page));
    if (params?.search) queryParams.append("search", params.search);
    if (params?.business_id != null)
      queryParams.append("business_id", String(params.business_id));
    const query = queryParams.toString();
    return `/api/business/followers${query ? `?${query}` : ""}`;
  },
};

/**
 * Flagged content — R-14
 */
export const reportsEndpoints = {
  reasons: `/api/reports/reasons`,
};
