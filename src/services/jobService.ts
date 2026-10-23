import { ApiService } from "./api";
import { jobEndpoints } from "./endpoints";
import type {
  JobApplication,
  JobApplyForm,
  JobListMeta,
  JobPost,
  JobPostFilter,
  JobPostPayload,
} from "@/src/types/jobs";
import {
  normalizeJobApplication,
  normalizeJobPost,
} from "@/src/utils/jobHelpers";

/** Every job endpoint answers `{ success, message, data }`. */
interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

type Page = { data?: unknown[]; meta?: JobListMeta } | unknown[];

function unwrap<T>(response: ApiEnvelope<T>, fallback: string): T {
  if (response.success && response.data) {
    return response.data;
  }
  throw new Error(response.message || fallback);
}

function readPage(data: Page): { rows: unknown[]; meta: JobListMeta | null } {
  if (Array.isArray(data)) return { rows: data, meta: null };
  return {
    rows: Array.isArray(data.data) ? data.data : [],
    meta: data.meta ?? null,
  };
}

// ── Owner changes → open screens ────────────────────────────────────
// The editor / manage screen publishes the saved post; the owner list and
// the manage screen behind it patch their copy instead of reloading.

export type JobPostChange =
  { type: "saved"; post: JobPost } | { type: "deleted"; id: number };

type JobPostListener = (change: JobPostChange) => void;

const jobPostListeners = new Set<JobPostListener>();

export function subscribeToJobPostChanges(
  listener: JobPostListener,
): () => void {
  jobPostListeners.add(listener);
  return () => {
    jobPostListeners.delete(listener);
  };
}

function publishJobPostChange(change: JobPostChange): void {
  jobPostListeners.forEach((listener) => listener(change));
}

// ── Customer (user or public token) ─────────────────────────────────

/** GET /api/businesses/{id}/job-posts — open posts only, newest first. */
export async function fetchBusinessJobPosts(
  businessId: string | number,
  params: { page?: number; per_page?: number } = {},
): Promise<{ posts: JobPost[]; meta: JobListMeta | null }> {
  const response = await ApiService.get<ApiEnvelope<Page>>(
    jobEndpoints.businessPosts(businessId, params),
  );
  const { rows, meta } = readPage(unwrap(response, "Failed to load jobs"));
  return { posts: rows.map(normalizeJobPost), meta };
}

// Last post seen on the detail screen, so Apply opens without a second load
let lastViewedJobPost: JobPost | null = null;

export function peekJobPost(id: string | number): JobPost | null {
  return lastViewedJobPost?.id === Number(id) ? lastViewedJobPost : null;
}

/** GET /api/job-posts/{id} — 404 once the post isn't open any more. */
export async function fetchJobPost(id: string | number): Promise<JobPost> {
  const response = await ApiService.get<ApiEnvelope<unknown>>(
    jobEndpoints.byId(id),
  );
  const post = normalizeJobPost(unwrap(response, "Failed to load job"));
  lastViewedJobPost = post;
  return post;
}

/**
 * POST /api/job-posts/{id}/apply (multipart). The server also sends the
 * application to the owner as the first chat message, resume attached.
 */
export async function applyToJobPost(
  id: string | number,
  form: JobApplyForm,
  onUploadProgress?: (percent: number) => void,
): Promise<JobApplication> {
  const body = new FormData();
  body.append("full_name", form.fullName.trim());
  body.append("phone", form.phone.trim());
  body.append("email", form.email.trim());
  body.append("years_experience", String(form.yearsExperience));
  body.append("has_license", form.hasLicense ? "1" : "0");
  if (form.hasLicense && form.licenseNumber.trim()) {
    body.append("license_number", form.licenseNumber.trim());
  }
  if (form.portfolioUrl.trim()) {
    body.append("portfolio_url", form.portfolioUrl.trim());
  }
  if (form.message.trim()) {
    body.append("message", form.message.trim());
  }
  if (form.resume) {
    body.append("resume", {
      uri: form.resume.uri,
      name: form.resume.name,
      type: form.resume.mimeType,
    } as any);
  }

  const response = await ApiService.post<ApiEnvelope<unknown>>(
    jobEndpoints.apply(id),
    body,
    {
      headers: { "Content-Type": "multipart/form-data" },
      // A 10 MB resume on a slow connection outlasts the default
      timeout: 3 * 60 * 1000,
      onUploadProgress: (event) => {
        if (!onUploadProgress || !event.total) return;
        onUploadProgress(
          Math.min(100, Math.round((event.loaded / event.total) * 100)),
        );
      },
    },
  );
  return normalizeJobApplication(
    unwrap(response, "Failed to send application"),
  );
}

/** GET /api/job-applications/mine — each row has `job_post` with `business`. */
export async function fetchMyJobApplications(
  params: { page?: number; per_page?: number } = {},
): Promise<{ applications: JobApplication[]; meta: JobListMeta | null }> {
  const response = await ApiService.get<ApiEnvelope<Page>>(
    jobEndpoints.myApplications(params),
  );
  const { rows, meta } = readPage(
    unwrap(response, "Failed to load applications"),
  );
  return { applications: rows.map(normalizeJobApplication), meta };
}

// ── Owner (business mode) ───────────────────────────────────────────

export async function fetchMyJobPosts(
  params: { status?: JobPostFilter; page?: number; per_page?: number } = {},
): Promise<{ posts: JobPost[]; meta: JobListMeta | null }> {
  const response = await ApiService.get<ApiEnvelope<Page>>(
    jobEndpoints.mine({
      status:
        params.status && params.status !== "all" ? params.status : undefined,
      page: params.page,
      per_page: params.per_page,
    }),
  );
  const { rows, meta } = readPage(unwrap(response, "Failed to load job posts"));
  return { posts: rows.map(normalizeJobPost), meta };
}

export async function fetchMyJobPost(id: string | number): Promise<JobPost> {
  const response = await ApiService.get<ApiEnvelope<unknown>>(
    jobEndpoints.mineById(id),
  );
  return normalizeJobPost(unwrap(response, "Failed to load job post"));
}

/** GET /api/job-posts/mine/{id}/applications — rows have `applicant`. */
export async function fetchJobPostApplications(
  id: string | number,
  params: { page?: number; per_page?: number } = {},
): Promise<{ applications: JobApplication[]; meta: JobListMeta | null }> {
  const response = await ApiService.get<ApiEnvelope<Page>>(
    jobEndpoints.applications(id, params),
  );
  const { rows, meta } = readPage(
    unwrap(response, "Failed to load applicants"),
  );
  return { applications: rows.map(normalizeJobApplication), meta };
}

/** POST /api/job-posts — live straight away; the business becomes `is_hiring`. */
export async function createJobPost(payload: JobPostPayload): Promise<JobPost> {
  const response = await ApiService.post<ApiEnvelope<unknown>>(
    jobEndpoints.create,
    payload,
  );
  const post = normalizeJobPost(unwrap(response, "Failed to post job"));
  publishJobPostChange({ type: "saved", post });
  return post;
}

/** PUT /api/job-posts/{id} — only the fields sent change (also close / reopen / extend). */
export async function updateJobPost(
  id: string | number,
  payload: JobPostPayload,
): Promise<JobPost> {
  const response = await ApiService.put<ApiEnvelope<unknown>>(
    jobEndpoints.update(id),
    payload,
  );
  const post = normalizeJobPost(unwrap(response, "Failed to save job post"));
  publishJobPostChange({ type: "saved", post });
  return post;
}

/** DELETE /api/job-posts/{id} — hidden for everyone; sent applications stay in chat. */
export async function deleteJobPost(id: string | number): Promise<void> {
  const response = await ApiService.delete<ApiEnvelope<unknown>>(
    jobEndpoints.delete(id),
  );
  if (response && response.success === false) {
    throw new Error(response.message || "Failed to delete job post");
  }
  publishJobPostChange({ type: "deleted", id: Number(id) });
}
