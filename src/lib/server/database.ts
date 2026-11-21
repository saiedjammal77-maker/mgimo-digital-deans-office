import type { Application, Grade, Lesson, Notification, Profile } from "./account";

type Owned = { user_id: string };
type Table<Row, Insert = never, Update = never> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};
export type Database = {
  public: {
    Tables: {
      dean_staff: Table<Owned>;
      dean_profiles: Table<Owned & Omit<Profile, "group"> & { group_code: string }>;
      dean_lessons: Table<Owned & Omit<Lesson, "start" | "end" | "change"> & {
        start_time: string; end_time: string; change: Lesson["subject"] | null;
      }>;
      dean_grades: Table<Owned & Omit<Grade, "examDate"> & { exam_date: string | null }>;
      dean_applications: Table<Owned & Omit<Application, "createdAt"> & { created_at: string },
        Pick<Application, "kind" | "note">, Pick<Application, "status">>;
      dean_notifications: Table<Owned & Notification, never, { read: true }>;
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
  };
};
