// ── Appointment changes → live counts / lists ──────────────────────
// ApiService calls notifyAppointmentsChanged() after any successful write to
// /api/appointments (complete, checkout, cancel, reschedule, new booking), and
// the push listener calls it when a notification arrives, so open screens
// (home Orders count, appointments list) refresh without a reload.

type AppointmentsChangedListener = () => void;

const listeners = new Set<AppointmentsChangedListener>();

export function subscribeToAppointmentChanges(
  listener: AppointmentsChangedListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyAppointmentsChanged(): void {
  listeners.forEach((listener) => listener());
}

/** Writes (not GETs) to these URLs can change an appointment's status. */
export function isAppointmentWriteUrl(url: string): boolean {
  return /\/api\/appointments(\/|\?|$)/.test(url);
}
