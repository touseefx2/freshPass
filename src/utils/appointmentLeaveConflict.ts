export interface AppointmentTimeSlot {
  start_minutes: number;
  duration_minutes: number;
  client_name?: string;
  title?: string;
}

const getAppointmentEndMinutes = (appointment: AppointmentTimeSlot): number =>
  appointment.start_minutes + Math.max(appointment.duration_minutes, 1);

const rangesOverlap = (
  startA: number,
  endA: number,
  startB: number,
  endB: number,
): boolean => startA < endB && endA > startB;

export const getAppointmentsForDay = <T extends AppointmentTimeSlot>(
  appointmentsByDate: Record<string, T[]>,
  dateStr: string,
): T[] => appointmentsByDate[dateStr] ?? [];

export const findBreakConflictingAppointments = <T extends AppointmentTimeSlot>(
  dayAppointments: T[],
  breakStartMinutes: number,
  breakEndMinutes: number,
): T[] =>
  dayAppointments.filter((appointment) =>
    rangesOverlap(
      breakStartMinutes,
      breakEndMinutes,
      appointment.start_minutes,
      getAppointmentEndMinutes(appointment),
    ),
  );

export const hasBookedAppointmentsOnDay = (
  appointmentsByDate: Record<string, AppointmentTimeSlot[]>,
  dateStr: string,
): boolean => getAppointmentsForDay(appointmentsByDate, dateStr).length > 0;

/** True when a 30-min picker slot starts inside a booked appointment window. */
export const isTimeSlotInsideBookedPeriod = (
  slotMinutes: number,
  appointments: AppointmentTimeSlot[],
): boolean =>
  appointments.some(
    (appointment) =>
      slotMinutes >= appointment.start_minutes &&
      slotMinutes < getAppointmentEndMinutes(appointment),
  );

export const doesBreakRangeOverlapAppointments = (
  breakStartMinutes: number,
  breakEndMinutes: number,
  appointments: AppointmentTimeSlot[],
): boolean =>
  findBreakConflictingAppointments(
    appointments,
    breakStartMinutes,
    breakEndMinutes,
  ).length > 0;

export const isValidBreakStartSlot = (
  slotMinutes: number,
  appointments: AppointmentTimeSlot[],
): boolean => !isTimeSlotInsideBookedPeriod(slotMinutes, appointments);

export const isValidBreakEndSlot = (
  breakStartMinutes: number,
  endSlotMinutes: number,
  appointments: AppointmentTimeSlot[],
): boolean =>
  endSlotMinutes > breakStartMinutes &&
  !doesBreakRangeOverlapAppointments(
    breakStartMinutes,
    endSlotMinutes,
    appointments,
  );

const snapToSlot = (minutes: number) =>
  Math.floor(Math.max(0, minutes) / 30) * 30;

export const findNextAvailableBreakStart = (
  preferredMinutes: number,
  appointments: AppointmentTimeSlot[],
): number | null => {
  const snapped = snapToSlot(preferredMinutes);

  for (let slot = snapped; slot < 24 * 60; slot += 30) {
    if (isValidBreakStartSlot(slot, appointments)) return slot;
  }

  for (let slot = snapped - 30; slot >= 0; slot -= 30) {
    if (isValidBreakStartSlot(slot, appointments)) return slot;
  }

  return null;
};

export const findDefaultBreakEnd = (
  startMinutes: number,
  appointments: AppointmentTimeSlot[],
): number => {
  for (let slot = startMinutes + 30; slot <= 24 * 60; slot += 30) {
    if (isValidBreakEndSlot(startMinutes, slot, appointments)) return slot;
  }

  return Math.min(startMinutes + 30, 23 * 60 + 59);
};

export const setMinutesOnDay = (totalMinutes: number) => ({
  hours: Math.floor(totalMinutes / 60),
  minutes: totalMinutes % 60,
});
