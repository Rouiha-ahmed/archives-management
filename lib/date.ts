const applicationTimeZone = process.env.APP_TIME_ZONE || "Africa/Casablanca";

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: applicationTimeZone,
  }).format(new Date(value));
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeZone: applicationTimeZone,
  }).format(new Date(value));
}

export function overdueDays(expectedReturn: Date, now = new Date()) {
  const delta = now.getTime() - expectedReturn.getTime();
  if (delta <= 0) return 0;
  return Math.ceil(delta / 86_400_000);
}

