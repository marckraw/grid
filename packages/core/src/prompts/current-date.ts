import { formatInTimeZone } from "date-fns-tz";

export const currentDatePrompt = (timeZone = "Europe/Zurich") => {
  const now = new Date();

  // Human-readable local date with time & TZ
  const localFormatted = formatInTimeZone(
    now,
    timeZone,
    "EEEE, dd MMMM yyyy 'at' HH:mm:ss XXX",
  );

  // ISO 8601 UTC for calculations
  const iso = now.toISOString();

  return `Today is ${localFormatted} (${iso}).`;
};
