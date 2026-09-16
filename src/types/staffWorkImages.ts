export interface StaffWorkImage {
  id: number;
  staff_id: number;
  url: string;
  name: string | null;
  mime_type: string | null;
  size: number | null;
  created_at: string | null;
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
