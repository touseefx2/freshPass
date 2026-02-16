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
  list: (active?: string) => {
    if (active) {
      return `/api/staff?active=${active}`;
    }
    return `/api/staff`;
  },
  leaves: `/api/staff/leaves`,
  leavesList: (params: { date: string }) => {
    const queryParams = new URLSearchParams();
    queryParams.append("date", params.date);

    return `/api/staff/leaves?${queryParams.toString()}`;
  },
  leaveCancel: (id: number) => `/api/staff/leaves/${id}`,
  breaks: `/api/staff/breaks`,
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
  favorite: (businessId: string | number) =>
    `/api/businesses/${businessId}/favorite`,
  generateSubscription: `/api/subscription/generate`,
};

/**
 * User endpoints
 */
export const userEndpoints = {
  details: `/api/user/details`,
  update: `/api/user`,
  changePassword: `/api/user/change-password`,
  deleteAccount: `/api/user/account`,
  status: `/api/user/status`,
};

/**
 * Stripe payment endpoints
 */
export const stripeEndpoints = {
  paymentSheet: `/api/payment-sheet`,
  paymentSheetAiTools: `/api/payment-sheet/ai-tools`,
  profile: `/api/staff/details`,
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
 * Appointments endpoints
 */
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
  hairPipelineStatus: (jobId: string) =>
    `/api/hair_tryon/hair_pipeline/status/${jobId}`,
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
  serviceBusinessList: (search: string) =>
    `/api/service-business-list?search=${encodeURIComponent(search)}`,
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
};
