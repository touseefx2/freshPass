import { ApiService } from "./api";
import {
  appointmentsEndpoints,
  businessEndpoints,
  customersEndpoints,
  staffEndpoints,
} from "./endpoints";

/**
 * Owner "Add Appointment": book a customer in (existing or new) for a
 * one-time service paid at the shop. POST /api/appointments as the owner.
 */

export type OwnerBookingCustomer = {
  id: number;
  name: string | null;
  phone: string | null;
  /** Can be null for guests */
  email: string | null;
  /** false = guest (no FreshPass app) */
  hasAppAccount?: boolean;
  profile_image_url?: string | null;
};

export type OwnerBookingStaff = {
  id: number;
  name: string;
  isOwner: boolean;
  image: string | null;
  /** "3 year exp" line shown under the name */
  experience: string | null;
};

export type OwnerBookingService = {
  id: number;
  name: string;
  price: number;
  durationMinutes: number;
};

export type NewCustomerInput = {
  name: string;
  phone: string;
  email: string;
};

export type OwnerBookingRequest = {
  businessId: number;
  serviceIds: number[];
  staffId: number;
  /** YYYY-MM-DD */
  date: string;
  /** 24-hour HH:mm */
  time: string;
  notes: string;
} & (
  | { userId: number; newCustomer?: undefined }
  | { userId?: undefined; newCustomer: NewCustomerInput }
);

/** 422 body: `message` is ready to show, `errors` names the field. */
export class OwnerBookingError extends Error {
  fields: Record<string, string[]>;
  constructor(message: string, fields: Record<string, string[]>) {
    super(message);
    this.fields = fields;
  }
  has(key: string) {
    return Object.keys(this.fields).some(
      (field) => field === key || field.startsWith(`${key}.`),
    );
  }
  first(key: string): string | null {
    return this.fields[key]?.[0] ?? null;
  }
}

function pickList<T>(res: unknown): T[] {
  const data = (res as { data?: unknown })?.data;
  if (Array.isArray(data)) return data as T[];
  const nested = (data as { data?: unknown })?.data;
  if (Array.isArray(nested)) return nested as T[];
  return [];
}

export const CUSTOMER_SEARCH_PAGE_SIZE = 20;

/** Server search on name, phone or email (paged). */
export async function searchOwnerCustomers(
  search: string,
  page: number,
): Promise<{ customers: OwnerBookingCustomer[]; lastPage: number }> {
  const response = await ApiService.get<{
    success: boolean;
    data?: { data?: OwnerBookingCustomer[]; meta?: { last_page?: number } };
  }>(
    customersEndpoints.list({
      search: search.trim() || undefined,
      page,
      per_page: CUSTOMER_SEARCH_PAGE_SIZE,
    }),
  );
  return {
    customers: response?.data?.data ?? [],
    lastPage: response?.data?.meta?.last_page ?? 1,
  };
}

type StaffRow = {
  id: number;
  name?: string | null;
  is_owner?: boolean;
  active?: boolean | number | null;
  invitation_token?: string | null;
  invitation_status?: string | null;
  user?: { profile_image_url?: string | null } | null;
  profile_image_url?: string | null;
  avatar?: string | null;
  description?: string | number | null;
};

export async function fetchOwnerBookingStaff(
  businessId: number,
): Promise<OwnerBookingStaff[]> {
  const res = await ApiService.get(
    `${staffEndpoints.list()}?business_id=${businessId}`,
  );
  return pickList<StaffRow>(res)
    .filter(
      (row) =>
        // Pending invites and switched-off staff can't take bookings
        !(row.invitation_token && row.invitation_status !== "accepted") &&
        row.active !== false &&
        row.active !== 0,
    )
    .map((row) => ({
      id: row.id,
      name: row.name?.trim() || "—",
      isOwner: row.is_owner === true,
      image:
        row.user?.profile_image_url ?? row.profile_image_url ?? row.avatar ?? null,
      experience:
        row.description != null && String(row.description).trim()
          ? String(row.description).trim()
          : null,
    }));
}

type ServiceRow = {
  id: number;
  name?: string | null;
  price?: string | number | null;
  duration_hours?: number | null;
  duration_minutes?: number | null;
  status?: string | null;
  active?: boolean | null;
};

/** per_page=100: the default 10 would leave services out of the list. */
export async function fetchOwnerBookingServices(
  businessId: number,
): Promise<OwnerBookingService[]> {
  const res = await ApiService.get(
    `${businessEndpoints.servicesForBusiness(businessId)}&per_page=100`,
  );
  return pickList<ServiceRow>(res)
    .filter((row) => row.active !== false && row.status !== "inactive")
    .map((row) => ({
      id: row.id,
      name: row.name?.trim() || "—",
      price: Number(row.price) || 0,
      durationMinutes:
        (Number(row.duration_hours) || 0) * 60 +
        (Number(row.duration_minutes) || 0),
    }));
}

/** Free start times ("HH:mm") for the barber, day and services. */
export async function fetchOwnerFreeTimes(params: {
  businessId: number;
  date: string;
  staffId: number;
  serviceIds: number[];
  /** Gap between start times (the "30 min slots" menu) */
  slotMinutes?: number;
}): Promise<{
  times: string[];
  /** Salon's current time (ISO with offset) when the list was built */
  now: string | null;
  timezone: string | null;
}> {
  const res = await ApiService.get<{
    success?: boolean;
    data?: unknown;
    timezone?: string;
    now?: string;
  }>(
    appointmentsEndpoints.availableSlots({
      business_id: params.businessId,
      date: params.date,
      staff_id: params.staffId,
      service_ids: params.serviceIds,
      slot_minutes: params.slotMinutes,
    }),
  );
  const data = res?.data as unknown;
  const raw = Array.isArray(data)
    ? data
    : Array.isArray((data as { slots?: unknown })?.slots)
      ? (data as { slots: unknown[] }).slots
      : [];
  const times = raw
    .map((item) => {
      if (typeof item === "string") return item;
      const row = item as { start?: unknown; start_time?: unknown } | null;
      const start = row?.start ?? row?.start_time;
      return typeof start === "string" ? start : null;
    })
    .filter((time): time is string => !!time && /^\d{1,2}:\d{2}/.test(time))
    .map((time) => {
      const [h, m] = time.split(":");
      return `${h.padStart(2, "0")}:${m.slice(0, 2)}`;
    });
  return {
    times: Array.from(new Set(times)).sort(),
    now: typeof res?.now === "string" ? res.now : null,
    timezone: typeof res?.timezone === "string" ? res.timezone : null,
  };
}

type HoursRow = { day?: string | null; closed?: boolean | null };

/** Lowercase names ("sunday") of days marked closed; [] when no hours set. */
function closedDayNames(rows: unknown): string[] {
  if (!Array.isArray(rows)) return [];
  return (rows as HoursRow[])
    .filter((row) => row?.closed && typeof row.day === "string")
    .map((row) => (row.day as string).toLowerCase());
}

export type OwnerBookingSchedule = {
  /** Salon IANA zone; slot times are in this zone */
  timezone: string | null;
  /** Days the salon is closed */
  closedDays: string[];
  /** Days each barber (staff id) is off */
  staffClosedDays: Record<number, string[]>;
};

/** Salon zone and closed days, so the date strip can grey them out. */
export async function fetchOwnerBookingSchedule(
  businessId: number,
): Promise<OwnerBookingSchedule> {
  const res = await ApiService.get<{
    data?: {
      business?: {
        timezone?: string | null;
        hours?: unknown;
        staff?: { id?: number; working_hours?: unknown }[] | null;
      };
    };
  }>(businessEndpoints.businessDetails(businessId));
  const business = res?.data?.business;
  const staffClosedDays: Record<number, string[]> = {};
  (business?.staff ?? []).forEach((row) => {
    if (row?.id != null) staffClosedDays[row.id] = closedDayNames(row.working_hours);
  });
  return {
    timezone:
      typeof business?.timezone === "string" && business.timezone
        ? business.timezone
        : null,
    closedDays: closedDayNames(business?.hours),
    staffClosedDays,
  };
}

export type OwnerBookingResult = {
  id: number;
  customerHasAppAccount?: boolean | null;
  userEmail?: string | null;
  user?: string | null;
};

export async function createOwnerBooking(
  request: OwnerBookingRequest,
): Promise<OwnerBookingResult> {
  const body: Record<string, unknown> = {
    business_id: request.businessId,
    appointment_type: "service",
    service_ids: request.serviceIds,
    staff_id: request.staffId,
    appointment_date: request.date,
    appointment_time: request.time,
  };
  if (request.notes.trim()) body.notes = request.notes.trim();
  if (request.newCustomer) {
    const { name, phone, email } = request.newCustomer;
    body.new_customer = {
      name: name.trim(),
      phone: phone.trim(),
      ...(email.trim() ? { email: email.trim() } : {}),
    };
  } else {
    body.user_id = request.userId;
  }

  try {
    const response = await ApiService.post<{
      success: boolean;
      message?: string;
      data?: OwnerBookingResult;
    }>(appointmentsEndpoints.create, body);
    if (response.success && response.data) return response.data;
    throw new OwnerBookingError(
      response.message || "Could not book this appointment.",
      {},
    );
  } catch (error) {
    if (error instanceof OwnerBookingError) throw error;
    const err = error as {
      message?: string;
      data?: { message?: string; errors?: Record<string, string[]> };
    };
    throw new OwnerBookingError(
      err?.data?.message || err?.message || "Could not book this appointment.",
      err?.data?.errors ?? {},
    );
  }
}
