import { ApiService } from "@/src/services/api";
import { givesBackEndpoints } from "@/src/services/endpoints";

/**
 * FreshPass Gives Back (backend guide 11-19): subscriber-goal banner on the
 * customer + business home, "Recommend a Family" once the goal is reached.
 */

export type GivesBackBanner =
  | { enabled: false }
  | {
      enabled: true;
      goal: number;
      count: number;
      percentage: number;
      unlocked: boolean;
      description: string;
    };

export type GivesBackStatus = "pending" | "contacted" | "supported" | "rejected";

export type GivesBackDocument = {
  id: number;
  name: string;
  path: string;
  mime_type: string;
  size: number;
};

export type GivesBackRecommendation = {
  id: number;
  family_name: string;
  contact_number: string;
  description: string;
  relationship: string | null;
  status: GivesBackStatus;
  documents: GivesBackDocument[];
  created_at: string;
};

export type GivesBackFile = {
  uri: string;
  name: string;
  type: string;
  size?: number | null;
};

export type GivesBackForm = {
  familyName: string;
  contactNumber: string;
  description: string;
  relationship: string;
  files: GivesBackFile[];
};

export const GIVES_BACK_NAME_MAX = 255;
export const GIVES_BACK_CONTACT_MAX = 50;
export const GIVES_BACK_DESCRIPTION_MAX = 2000;
export const GIVES_BACK_RELATIONSHIP_MAX = 255;
export const GIVES_BACK_MAX_FILES = 3;
export const GIVES_BACK_FILE_MAX_BYTES = 10 * 1024 * 1024;

type Envelope<T> = { success: boolean; message?: string; data: T };

// The count changes slowly: the last answer shows at once on the next home
// visit while a fresh one loads in the background.
let cachedBanner: GivesBackBanner | null = null;

export function getCachedGivesBackBanner(): GivesBackBanner | null {
  return cachedBanner;
}

export function clearGivesBackBannerCache(): void {
  cachedBanner = null;
}

const toNumber = (value: unknown, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

/** GET /api/gives-back/banner */
export async function fetchGivesBackBanner(): Promise<GivesBackBanner> {
  const response = await ApiService.get<Envelope<any>>(
    givesBackEndpoints.banner,
  );
  const data = response?.data;
  let banner: GivesBackBanner;
  if (!data || data.enabled !== true) {
    banner = { enabled: false };
  } else {
    const goal = Math.max(0, toNumber(data.goal, 10000));
    const count = Math.max(0, toNumber(data.count));
    const percentage =
      data.percentage != null
        ? toNumber(data.percentage)
        : goal > 0
          ? Math.round((count / goal) * 1000) / 10
          : 0;
    banner = {
      enabled: true,
      goal,
      count,
      percentage: Math.min(100, Math.max(0, percentage)),
      unlocked: data.unlocked === true,
      description: typeof data.description === "string" ? data.description : "",
    };
  }
  cachedBanner = banner;
  return banner;
}

/** POST /api/gives-back/recommend (multipart, proof_files[]) */
export async function submitFamilyRecommendation(
  form: GivesBackForm,
  onUploadProgress?: (percent: number) => void,
): Promise<GivesBackRecommendation | null> {
  const body = new FormData();
  body.append("family_name", form.familyName.trim());
  body.append("contact_number", form.contactNumber.trim());
  body.append("description", form.description.trim());
  if (form.relationship.trim()) {
    body.append("relationship", form.relationship.trim());
  }
  form.files.forEach((file) =>
    body.append("proof_files[]", {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any),
  );
  const response = await ApiService.post<Envelope<GivesBackRecommendation>>(
    givesBackEndpoints.recommend,
    body,
    {
      headers: { "Content-Type": "multipart/form-data" },
      // Three 10 MB files on a slow connection outlast the default
      timeout: 3 * 60 * 1000,
      onUploadProgress: (event) => {
        if (!onUploadProgress || !event.total) return;
        onUploadProgress(
          Math.min(100, Math.round((event.loaded / event.total) * 100)),
        );
      },
    },
  );
  return response?.data ?? null;
}

/** GET /api/gives-back/my-recommendations (paginated) */
export async function fetchMyRecommendations(page = 1): Promise<{
  items: GivesBackRecommendation[];
  lastPage: number;
}> {
  const response = await ApiService.get<
    Envelope<GivesBackRecommendation[]> & {
      meta?: { current_page?: number; last_page?: number };
    }
  >(givesBackEndpoints.mine(page));
  return {
    items: Array.isArray(response?.data) ? response.data : [],
    lastPage: toNumber(response?.meta?.last_page, 1),
  };
}
