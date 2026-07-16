import { fetchGoogleJson, hasGoogleOauth } from "./google-auth.mjs";

const CALENDAR_EVENTS_URL =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const TIMEZONE = "Africa/Accra";

function dateInAccra(date) {
  return date.toLocaleDateString("en-CA", { timeZone: TIMEZONE });
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function getCalendarEvents({
  oauth,
  fetchImpl = fetch,
  now = new Date(),
} = {}) {
  if (!hasGoogleOauth(oauth)) return null;

  try {
    const today = dateInAccra(now);
    const url = new URL(CALENDAR_EVENTS_URL);
    url.search = new URLSearchParams({
      timeMin: `${today}T00:00:00Z`,
      timeMax: `${addDays(today, 8)}T00:00:00Z`,
      timeZone: TIMEZONE,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "50",
    });
    const payload = await fetchGoogleJson(url, { oauth, fetchImpl });
    return (payload.items ?? []).map((event) => {
      const allDay = Boolean(event.start?.date);
      return {
        title: event.summary || "(Untitled event)",
        start: event.start?.dateTime ?? event.start?.date ?? null,
        end: event.end?.dateTime ?? event.end?.date ?? null,
        ...(event.location ? { location: event.location } : {}),
        allDay,
      };
    });
  } catch (err) {
    console.error("Calendar source failed, continuing without it:", err.message);
    return null;
  }
}
