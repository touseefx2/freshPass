import { ApiService } from "@/src/services/api";
import { reportsEndpoints } from "@/src/services/endpoints";
import type { ReportReason } from "@/src/types/reels";

/** What a customer can report from a profile (reels / comments use reelsService). */
export type ReportTargetType = "business" | "staff";

/** A photo or PDF on the report form. */
export type ReportAttachment = {
  uri: string;
  name: string;
  type: string;
  /** Bytes when known */
  size?: number | null;
};

export type ReportForm = {
  type: ReportTargetType;
  /** Business id, or the staff row's id (not its user_id) */
  id: string | number;
  reason: string;
  note: string;
  /** Left out when the customer didn't answer */
  visited: boolean | null;
  mayContact: boolean | null;
  attachments: ReportAttachment[];
};

export const REPORT_NOTE_MAX = 500;
export const REPORT_MAX_FILES = 5;
export const REPORT_FILE_MAX_BYTES = 10 * 1024 * 1024;

type Envelope<T> = { success: boolean; message?: string; data: T };

/** GET /api/reports/reasons?type= — the server owns the list and labels. */
export async function fetchTargetReportReasons(
  type: ReportTargetType,
): Promise<ReportReason[]> {
  const response = await ApiService.get<Envelope<ReportReason[]>>(
    reportsEndpoints.reasonsFor(type),
  );
  return Array.isArray(response?.data) ? response.data : [];
}

/**
 * POST /api/reports. 201 = saved, 200 = an open report already exists
 * (`already: true`) — both count as sent. JSON when no file is attached.
 */
export async function submitTargetReport(
  form: ReportForm,
  onUploadProgress?: (percent: number) => void,
): Promise<{ already: boolean; message: string | null }> {
  const fields: Record<string, string> = {
    type: form.type,
    id: String(form.id),
    reason: form.reason,
    note: form.note.trim(),
  };
  if (form.visited != null) fields.visited = String(form.visited);
  if (form.mayContact != null) fields.may_contact = String(form.mayContact);

  let response: Envelope<{ already?: boolean }>;
  if (form.attachments.length) {
    const body = new FormData();
    Object.entries(fields).forEach(([key, value]) => body.append(key, value));
    form.attachments.forEach((file) =>
      body.append("attachments[]", {
        uri: file.uri,
        name: file.name,
        type: file.type,
      } as any),
    );
    response = await ApiService.post(reportsEndpoints.submit, body, {
      headers: { "Content-Type": "multipart/form-data" },
      // Five 10 MB files on a slow connection outlast the default
      timeout: 3 * 60 * 1000,
      onUploadProgress: (event) => {
        if (!onUploadProgress || !event.total) return;
        onUploadProgress(
          Math.min(100, Math.round((event.loaded / event.total) * 100)),
        );
      },
    });
  } else {
    response = await ApiService.post(reportsEndpoints.submit, {
      ...fields,
      ...(form.visited != null ? { visited: form.visited } : {}),
      ...(form.mayContact != null ? { may_contact: form.mayContact } : {}),
    });
  }
  return {
    already: response?.data?.already ?? false,
    message: response?.message ?? null,
  };
}
