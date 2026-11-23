import { ApiService } from "@/src/services/api";
import { feedbackEndpoints } from "@/src/services/endpoints";

/**
 * App feedback for pros (business / solo / staff) and customers (client 11-23).
 * The server saves it and emails it to the admin.
 */

export const FEEDBACK_NAME_MAX = 80;
export const FEEDBACK_REMARKS_MAX = 1000;

export type FeedbackItem = {
  id: string;
  name: string;
  remarks: string;
  created_at: string;
};

export type FeedbackPage = { items: FeedbackItem[]; hasMore: boolean };

const toItem = (raw: any): FeedbackItem | null => {
  if (!raw || raw.id == null) return null;
  return {
    id: String(raw.id),
    name: String(raw.name ?? ""),
    remarks: String(raw.remarks ?? ""),
    created_at: String(raw.created_at ?? ""),
  };
};

/** GET /api/feedback: the user's own feedback, newest first, paginated. */
export async function fetchFeedbackHistory(page = 1): Promise<FeedbackPage> {
  const response = await ApiService.get<any>(
    `${feedbackEndpoints.list}?page=${page}`,
  );
  const list = Array.isArray(response?.data) ? response.data : [];
  const meta = response?.meta ?? {};
  const current = Number(meta.current_page ?? page);
  const last = Number(meta.last_page ?? current);
  return {
    items: list.map(toItem).filter(Boolean) as FeedbackItem[],
    hasMore: Number.isFinite(last) && current < last,
  };
}

/** POST /api/feedback. 422 carries field errors under name / remarks. */
export async function submitFeedback(input: {
  name: string;
  remarks: string;
}): Promise<FeedbackItem | null> {
  const response = await ApiService.post<any>(feedbackEndpoints.submit, {
    name: input.name.trim(),
    remarks: input.remarks.trim(),
  });
  return toItem(response?.data);
}
