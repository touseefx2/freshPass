/** Phone's IANA zone ("America/Chicago"); undefined on old Android builds that can't tell. */
export function getDeviceTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

/**
 * "America/Chicago (CDT)" for the salon's zone. Slot times are salon clock
 * times, so the booking screens label them with this, not the customer's zone.
 * Falls back to just the zone name when the device can't format other zones.
 */
export function formatSalonTimeZone(timeZone: string): string {
  try {
    const offsetName = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "short",
    })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value;
    return offsetName ? `${timeZone} (${offsetName})` : timeZone;
  } catch {
    return timeZone;
  }
}
