export type Localized = { ru: string; en: string };
export type Profile = {
  name: Localized;
  faculty: Localized;
  program: Localized;
  year: number;
  group: string;
};
export type Lesson = {
  id: string;
  weekday: number;
  start: string;
  end: string;
  subject: Localized;
  teacher: Localized;
  room: string;
  change?: Localized;
};
export type Grade = {
  id: string;
  subject: Localized;
  score: number | null;
  credits: number;
  assessment: "exam" | "credit";
  examDate?: string;
};
export type ApplicationKind = "certificate" | "application" | "ticket";
export type Application = {
  id: string;
  kind: ApplicationKind;
  note: string;
  noteLabel?: Localized;
  status: "submitted" | "review" | "ready";
  createdAt: string;
};
export type InboxTicket = Application & { user_id: string };
export type Notification = {
  id: string;
  title: Localized;
  body: Localized;
  kind: "announcement" | "deadline" | "schedule";
  date: string;
  read: boolean;
};
export type Account = {
  demo: boolean;
  demoExpiresAt?: number;
  profile: Profile;
  lessons: Lesson[];
  grades: Grade[];
  applications: Application[];
  notifications: Notification[];
};
