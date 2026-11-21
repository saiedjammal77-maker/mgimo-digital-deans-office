export type { Lang } from "@/components/identity";
import type { Lang } from "@/components/identity";
import type { Account, Lesson } from "@/lib/server/account";
export type { Account, Application, Lesson, Notification as Notice } from "@/lib/server/account";

export const sections = {
  overview: { href: "/account", en: "Overview", ru: "Обзор" },
  schedule: { href: "/account/schedule", en: "Schedule", ru: "Расписание" },
  grades: { href: "/account/grades", en: "Grades", ru: "Оценки" },
  applications: { href: "/account/applications", en: "Requests", ru: "Заявки" },
  tickets: { href: "/account/tickets", en: "Tickets", ru: "Обращения" },
  notifications: { href: "/account/notifications", en: "Notifications", ru: "Уведомления" },
} as const;

export const applicationKinds = {
  ticket: { en: "Private ticket", ru: "Личное обращение" },
  certificate: { en: "Certificate", ru: "Справка" },
  application: { en: "Application", ru: "Заявление" },
};

export const statusLabels = {
  submitted: { en: "Submitted", ru: "Подана" },
  review: { en: "In review", ru: "На рассмотрении" },
  ready: { en: "Ready", ru: "Готова" },
};

export const noticeKinds = {
  announcement: { en: "Announcement", ru: "Объявление" },
  deadline: { en: "Deadline", ru: "Срок сдачи" },
  schedule: { en: "Schedule update", ru: "Изменение расписания" },
};

export const zone = "Europe/Moscow";
export const weekdays = [1, 2, 3, 4, 5, 6, 7] as const;

export function formatDate(value: string | Date, lang: Lang, options: Intl.DateTimeFormatOptions) {
  const date = value instanceof Date ? value : new Date(normalizeDate(value));
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString({ ru: "ru-RU", en: "en-GB", es: "es-ES", zh: "zh-CN" }[lang], { ...options, timeZone: zone });
}

// The API may send a calendar date, a Moscow wall-clock time, or an absolute ISO instant.
function normalizeDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value + "T12:00:00+03:00";
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(value)) return value.replace(" ", "T") + "+03:00";
  return value;
}

export function newestFirst<T>(items: T[], dateOf: (item: T) => string) {
  return [...items].sort((a, b) => Date.parse(normalizeDate(dateOf(b))) - Date.parse(normalizeDate(dateOf(a))));
}

export function moscowClock(now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value;
  const weekday = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(part("weekday") ?? "") + 1;
  return { weekday, time: part("hour") + ":" + part("minute") };
}

export function dayOffset(date: Date, days: number) {
  return new Date(date.getTime() + days * 86400000);
}

function minutes(time: string) {
  const [hours, mins] = time.split(":");
  return Number(hours) * 60 + Number(mins);
}

export function lessonsForDay(lessons: Lesson[], weekday: number) {
  return lessons.filter((lesson) => lesson.weekday === weekday)
    .sort((a, b) => minutes(a.start) - minutes(b.start));
}

export function upcomingDay(lessons: Lesson[], now: Date) {
  const { weekday, time } = moscowClock(now);
  for (let offset = 0; offset <= 7; offset++) {
    const day = (weekday - 1 + offset) % 7 + 1;
    const scheduled = lessonsForDay(lessons, day).filter((lesson) => offset > 0 || minutes(lesson.end) > minutes(time));
    if (scheduled.length) return { date: dayOffset(now, offset), lessons: scheduled };
  }
  return null;
}

export function initials(name: string) {
  const words = name.trim().split(/\s+/);
  return (words[0][0] ?? "") + (words.length > 1 ? words[words.length - 1][0] : "");
}

export function postJSON(endpoint: string, body: object) {
  return fetch("/api/" + endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    cache: "no-store",
    body: JSON.stringify(body),
  });
}

export function getAccount(signal?: AbortSignal) {
  return fetch("/api/account", { credentials: "same-origin", cache: "no-store", signal });
}

export async function loadAccount(signal: AbortSignal) {
  try {
    const response = await getAccount(signal);
    if (response.status === 401) return { status: "anonymous" } as const;
    if (!response.ok) return { status: "error" } as const;
    const account: Account = await response.json();
    return { status: "ready", account } as const;
  } catch {
    return { status: "error" } as const;
  }
}
