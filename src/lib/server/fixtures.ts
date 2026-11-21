// Fictional students and academic records for the demonstration and its optional seed.
import type { Account, Grade, Lesson, Localized } from "./account";

export const demoUsers = {
  "alina.volkova": "57f01001-0000-4000-8000-000000000001",
  "mark.ivanov": "57f01002-0000-4000-8000-000000000001",
} as const;
export type DemoUser = keyof typeof demoUsers;
export const demoPassword = "Atlas2026!";
export const loginDomain = "students.example.invalid";

function l(ru: string, en: string): Localized {
  return { ru, en };
}

type Course = [subject: Localized, teacher: Localized, room: string];
const diplomacy: Course[] = [
  [l("Дипломатический протокол", "Diplomatic Protocol"), l("Ирина Мирова", "Irina Mirova"), "А-214"],
  [l("История международных отношений", "History of International Relations"), l("Олег Серов", "Oleg Serov"), "А-312"],
  [l("Международное право", "International Law"), l("Нина Белова", "Nina Belova"), "Б-108"],
  [l("Французский язык", "French"), l("Елена Лисова", "Elena Lisova"), "А-117"],
  [l("Практика международных переговоров", "International Negotiation"), l("Лев Орлов", "Lev Orlov"), "Б-215"],
];
const economics: Course[] = [
  [l("Международная торговля", "International Trade"), l("Анна Речная", "Anna Rechnaya"), "В-203"],
  [l("Мировые финансы", "International Finance"), l("Игорь Лунёв", "Igor Lunyov"), "В-110"],
  [l("Экономическая дипломатия", "Economic Diplomacy"), l("Мария Соснова", "Maria Sosnova"), "В-304"],
  [l("Деловой английский", "Business English"), l("Вера Морозова", "Vera Morozova"), "В-207"],
  [l("Экономика региональной интеграции", "Economics of Regional Integration"), l("Павел Луговой", "Pavel Lugovoy"), "В-120"],
];

// The next midyear or winter exam session, also used when seeding a fresh project.
function upcomingExam(day: number) {
  const now = new Date();
  const year = now.getUTCFullYear();
  for (const month of [5, 11, 17]) {
    const exam = new Date(Date.UTC(year, month, day));
    if (exam.getTime() > now.getTime()) return exam.toISOString().slice(0, 10);
  }
  throw new Error("Could not select an exam session.");
}

export function fixture(username: DemoUser): Account {
  const alina = username === "alina.volkova";
  const courses = alina ? diplomacy : economics;
  const change = alina ? l(
    "Семинар по дипломатическому протоколу перенесён со вторника, 13:00 (А-302), на среду, 10:45 (А-214).",
    "The Diplomatic Protocol seminar moved from Tuesday at 13:00 (А-302) to Wednesday at 10:45 (А-214).",
  ) : l(
    "Семинар по международной торговле перенесён со вторника, 09:00 (В-115), на среду, 13:00 (В-203).",
    "The International Trade seminar moved from Tuesday at 09:00 (В-115) to Wednesday at 13:00 (В-203).",
  );
  const prefix = demoUsers[username].slice(0, 8);
  const id = (section: number, n: number) =>
    `${prefix}-000${section}-4000-8000-${String(n + 1).padStart(12, "0")}`;
  const times = [["09:00", "10:30"], ["10:45", "12:15"], ["13:00", "14:30"]];
  const lessons: Lesson[] = Array.from({ length: 10 }, (_, i) => {
    const [subject, teacher, room] = courses[i % courses.length];
    const [start, end] = times[(i % 2) + (alina ? 0 : 1)];
    return {
      id: id(1, i), weekday: Math.floor(i / 2) + 1, start, end, subject, teacher, room,
      ...(i === 5 ? { change } : {}),
    };
  });
  const grades: Grade[] = courses.map(([subject], i) => ({
    id: id(2, i), subject,
    score: (alina ? [91, 86, null, 94, 88] : [85, 93, null, 81, 90])[i],
    credits: [5, 5, 4, 3, 2][i],
    assessment: i < 3 ? "exam" : "credit",
    ...(i === 2 ? { examDate: upcomingExam(alina ? 17 : 18) } : {}),
  }));
  return {
    demo: true,
    profile: alina ? {
      name: l("Алина Волкова", "Alina Volkova"),
      faculty: l("Факультет международных отношений", "Faculty of International Relations"),
      program: l("Международные отношения: дипломатия", "International Relations and Diplomacy"),
      year: 2, group: "МО-25-1",
    } : {
      name: l("Марк Иванов", "Mark Ivanov"),
      faculty: l("Факультет международных экономических отношений", "Faculty of International Economic Relations"),
      program: l("Международные экономические отношения", "International Economic Relations"),
      year: 3, group: "МЭО-24-2",
    },
    lessons, grades,
    applications: [
      { id: id(3, 0), kind: "certificate", note: "Справка об обучении", noteLabel: l("Справка об обучении", "Proof of enrolment"), status: "ready", createdAt: "2026-11-02T08:00:00Z" },
      { id: id(3, 1), kind: "application", note: "Запись на консультацию", noteLabel: l("Запись на консультацию", "Request for an appointment"), status: "review", createdAt: "2026-10-28T11:00:00Z" },
    ],
    notifications: [
      {
        id: id(4, 0), kind: "schedule", date: "2026-11-10T07:30:00Z", read: false,
        title: l("Перенос семинара на среду", "Seminar moved to Wednesday"),
        body: change,
      },
      {
        id: id(4, 1), kind: "deadline", date: "2026-11-09T10:00:00Z", read: false,
        title: l("Выбор дисциплин", "Elective registration"),
        body: l("Подайте заявление на дисциплины по выбору до 27 ноября.", "Submit your elective choices by 27 November."),
      },
      {
        id: id(4, 2), kind: "announcement", date: "2026-11-05T09:00:00Z", read: true,
        title: l("Приём в деканате", "Dean’s office hours"),
        body: l("Деканат принимает студентов в будни с 10:00 до 16:00.", "The dean’s office is open on weekdays from 10:00 to 16:00."),
      },
    ],
  };
}
