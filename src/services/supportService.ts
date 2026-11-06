import { ApiService } from "@/src/services/api";
import { supportEndpoints } from "@/src/services/endpoints";

export type SupportAttachment = { uri: string; name: string; type: string };

export type SupportForm = {
  /** Set when the request was opened from an appointment */
  appointmentId?: string | null;
  /** Left out when the topic list couldn't load (the server uses `other`) */
  topic: string | null;
  message: string;
  attachments: SupportAttachment[];
};

export type SupportTopic = { value: string; label: string };

export const SUPPORT_MESSAGE_MAX = 2000;
export const SUPPORT_MAX_PHOTOS = 3;

/** GET /api/support-requests/topics. The server owns the list and labels. */
export async function fetchSupportTopics(): Promise<SupportTopic[]> {
  const response = await ApiService.get<{ data: SupportTopic[] }>(
    supportEndpoints.topics,
  );
  return Array.isArray(response?.data) ? response.data : [];
}

/** POST /api/support-requests. JSON when no photo is attached. */
export async function submitSupportRequest(
  form: SupportForm,
  onUploadProgress?: (percent: number) => void,
): Promise<void> {
  const fields: Record<string, string> = { message: form.message.trim() };
  if (form.topic) fields.topic = form.topic;
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
