export interface StaffWorkImage {
  id: number;
  /** Null when owner is not on their own team */
  staff_id: number | null;
  url: string;
  name: string | null;
  mime_type: string | null;
  size: number | null;
  created_at: string | null;
}

/** Preview block on GET /api/business/details */
export interface OwnerWorkImagesPreview {
  data: StaffWorkImage[];
  total: number;
}

export interface StaffWorkImagePage {
  data: StaffWorkImage[];
  meta: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number | null;
    to: number | null;
    has_more: boolean;
  };
}

export interface DeleteStaffWorkImagesResult {
  deleted: number[];
  not_found: number[];
}
