/**
 * Hiring (job posts). An owner posts open positions; while one is open the
 * business payload has `is_hiring: true`. Customers apply once per post and
 * the application lands in the normal chat with the owner.
 */

export type JobSchedule = "full_time" | "part_time";

export type JobEmploymentType = "employee" | "contractor" | "booth_rental";

export type JobExperienceLevel =
  "entry_level" | "1_plus_years" | "3_plus_years" | "5_plus_years";

export type JobPayPeriod = "hour" | "week" | "month" | "year";

/** `open` only while `expires_at` hasn't passed; `removed` = taken down by an admin. */
export type JobPostStatus = "open" | "closed" | "expired" | "removed";

/** Owner list filter (`?status=`). */
export type JobPostFilter = "all" | JobPostStatus;

export interface JobPostBusiness {
  id: number;
  title: string;
  slug: string | null;
  logoUrl: string | null;
  ownerId: number | null;
}

export interface JobPost {
  id: number;
  businessId: number;
  /** Only on `GET /api/job-posts/{id}` and inside a customer's own applications. */
  business: JobPostBusiness | null;
  title: string;
  category: { id: number; name: string } | null;
  categoryId: number | null;
  schedule: JobSchedule;
  employmentType: JobEmploymentType | null;
  experienceLevel: JobExperienceLevel;
  licenseRequired: boolean;
  licenseDetails: string | null;
  description: string;
  /** Null = the salon address. */
  location: string | null;
  payMin: number | null;
  payMax: number | null;
  payPeriod: JobPayPeriod | null;
  compensationNote: string | null;
  /** YYYY-MM-DD */
  expiresAt: string | null;
  status: JobPostStatus;
  isOpen: boolean;
  /** Owner endpoints only. */
  applicationsCount: number | null;
  removedReason: string | null;
  removedAt: string | null;
  /** `GET /api/job-posts/{id}` with a signed-in user. */
  hasApplied: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface JobApplicationResume {
  name: string;
  path: string;
  mimeType: string | null;
}

export interface JobApplication {
  id: number;
  jobPostId: number;
  /** In the apply response and in "my applications". */
  jobPost: JobPost | null;
  /** In the owner's applicant list. */
  applicant: { id: number; name: string; avatar: string | null } | null;
  fullName: string;
  phone: string;
  email: string;
  yearsExperience: number;
  hasLicense: boolean;
  licenseNumber: string | null;
  portfolioUrl: string | null;
  message: string | null;
  resume: JobApplicationResume | null;
  chatMessageId: number | null;
  createdAt: string | null;
}

export interface JobListMeta {
  current_page?: number;
  per_page?: number;
  total?: number;
  last_page?: number;
  has_more?: boolean;
}

/** Local file picked for `resume` (PDF, Word, JPG or PNG, 10 MB max). */
export interface JobResumeFile {
  uri: string;
  name: string;
  mimeType: string;
  size: number | null;
}

export interface JobApplyForm {
  fullName: string;
  phone: string;
  email: string;
  yearsExperience: number;
  hasLicense: boolean;
  licenseNumber: string;
  portfolioUrl: string;
  message: string;
  resume: JobResumeFile | null;
}

/** Body for POST /api/job-posts and PUT /api/job-posts/{id} (PUT sends only changed fields). */
export interface JobPostPayload {
  title?: string;
  category_id?: number;
  schedule?: JobSchedule;
  employment_type?: JobEmploymentType | null;
  experience_level?: JobExperienceLevel;
  license_required?: boolean;
  license_details?: string | null;
  description?: string;
  location?: string | null;
  pay_min?: number | null;
  pay_max?: number | null;
  pay_period?: JobPayPeriod | null;
  compensation_note?: string | null;
  expires_at?: string;
  status?: "open" | "closed";
}
