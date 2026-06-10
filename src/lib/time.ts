const IST = "Asia/Kolkata";

function buildParts(date: string | Date) {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(new Date(date));

  const map: Record<string, string> = {};
  parts.forEach((part) => {
    if (part.type !== "literal") map[part.type] = part.value;
  });

  return map;
}

export function toIST(date: string | Date | null | undefined) {
  if (!date) return "-";

  const parts = buildParts(date);
  return `${parts.day} ${parts.month} ${parts.year}, ${parts.hour}:${parts.minute} ${parts.dayPeriod.toLowerCase()}`;
}

export function toISTDate(date: string | Date | null | undefined) {
  if (!date) return "-";

  const parts = buildParts(date);
  return `${parts.day} ${parts.month} ${parts.year}`;
}

export function toISTTime(date: string | Date | null | undefined) {
  if (!date) return "-";

  const parts = buildParts(date);
  return `${parts.hour}:${parts.minute} ${parts.dayPeriod.toLowerCase()}`;
}

export function nowUTC() {
  return new Date().toISOString();
}

export function todayIST() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

