import { ApiService } from "@/src/services/api";
import { supportEndpoints } from "@/src/services/endpoints";

export type SupportAttachment = { uri: string; name: string; type: string };

export type SupportForm = {
  /** Set when the request was opened from an appointment */
  appointmentId?: string | null;
  topic: string;
  message: string;
  attachments: SupportAttachment[];
};

export const SUPPORT_MESSAGE_MAX = 1000;
export const SUPPORT_MAX_PHOTOS = 3;

/** POST /api/support-requests. JSON when no photo is attached. */
export async function submitSupportRequest(
  form: SupportForm,
  onUploadProgress?: (percent: number) => void,
): Promise<void> {
  const fields: Record<string, string> = {
    topic: form.topic,
    message: form.message.trim(),
  };
  if (form.appointmentId) fields.appointment_id = form.appointmentId;

  if (!form.attachments.length) {
    await ApiService.post(supportEndpoints.submit, fields);
    return;
  }

  const body = new FormData();
  Object.entries(fields).forEach(([key, value]) => body.append(key, value));
  form.attachments.forEach((file) =>
    body.append("attachments[]", {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any),
  );
  await ApiService.post(supportEndpoints.submit, body, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 3 * 60 * 1000,
    onUploadProgress: (event) => {
      if (!onUploadProgress || !event.total) return;
      onUploadProgress(
        Math.min(100, Math.round((event.loaded / event.total) * 100)),
      );
    },
  });
}
