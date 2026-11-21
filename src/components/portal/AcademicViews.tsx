"use client";

import { localized } from "@/lib/i18n";
import { useState } from "react";
import { CalendarDays, Clock3, GraduationCap, MapPin } from "lucide-react";
import { usePortal } from "./AccountShell";
import { dayOffset, formatDate, lessonsForDay, moscowClock, weekdays, type Lesson } from "./model";
import s from "./portal.module.css";

export function LessonList({ lessons }: { lessons: Lesson[] }) {
  const { lang, t } = usePortal();
  return <ul className={s.lessons}>{lessons.map((lesson) => (
    <li key={lesson.id}>
      <div className={s.lessonTime}><b>{lesson.start}</b><span>{lesson.end}</span></div>
      <div className={s.lessonBody}>
        <h3>{localized(lang, lesson.subject)}</h3>
        <p>{localized(lang, lesson.teacher)}</p>
        <span className={s.room}><MapPin size={13} />{t("Room", "Ауд.")} {lesson.room}</span>
        {lesson.change && <p className={s.change}><Clock3 size={13} />{localized(lang, lesson.change)}</p>}
      </div>
    </li>
  ))}</ul>;
}

export function ScheduleView() {
  const { data, now, lang, t } = usePortal();
  const { weekday } = moscowClock(now);
  const [selection, setSelection] = useState<number | "week" | null>(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("day") === "3" ? 3 : null);
  const selected = selection ?? weekday;
  const days = selected === "week" ? weekdays : [selected];
  return <div className={s.stack}>
    <section className={s.panel} aria-label={t("Weekly schedule", "Недельное расписание")}>
      <div className={s.panelHead}>
        <div><p className={s.smallLabel}>{t("Group", "Группа")} {data.profile.group}</p>
          <h2>{t("This week", "На этой неделе")}</h2></div>
        <button type="button" className={s.filterButton} aria-pressed={selected === "week"} onClick={() => setSelection(selected === "week" ? null : "week")}>
          <CalendarDays size={15} />{t("Full week", "Вся неделя")}
        </button>
      </div>
      <div className={s.week} role="group" aria-label={t("Choose a day", "Выберите день")}>{weekdays.map((day) => {
        const date = dayOffset(now, day - weekday);
        return <button type="button" key={day} aria-pressed={selected === day} aria-current={day === weekday ? "date" : undefined}
          aria-label={formatDate(date, lang, { weekday: "long", day: "numeric", month: "long" })}
          onClick={() => setSelection(day)}><span>{formatDate(date, lang, { weekday: "short" })}</span><b>{formatDate(date, lang, { day: "numeric" })}</b></button>;
      })}</div>
    </section>
    {days.map((day) => {
      const lessons = lessonsForDay(data.lessons, day);
      const date = dayOffset(now, day - weekday);
      return <section className={s.panel} key={day}>
        <div className={s.panelHead}>
          <h2 className={s.dayTitle}>{formatDate(date, lang, { weekday: "long", month: "long", day: "numeric" })}</h2>
          <span className={s.timezone}>{t("MSK", "МСК")}</span>
        </div>
        {lessons.length ? <LessonList lessons={lessons} /> : <p className={s.empty}>{t("No classes scheduled.", "На этот день занятий нет.")}</p>}
      </section>;
    })}
  </div>;
}

export function GradesView() {
  const { data, lang, t } = usePortal();
  const graded = data.grades.filter((grade) => grade.score !== null);
  const credits = data.grades.reduce((total, grade) => total + grade.credits, 0);
  return <div className={s.stack}>
    <div className={s.metrics}>
      <div><span>{t("Mean posted score","Средний выставленный балл")}</span><strong>{graded.length ?
        new Intl.NumberFormat(lang,{maximumFractionDigits:1}).format(graded.reduce((total,g)=>total+(g.score ?? 0),0)/graded.length) : "—"}</strong></div>
      <div><span>{t("Subjects", "Дисциплины")}</span><strong>{data.grades.length}</strong></div>
      <div><span>{t("Results posted", "Выставлено оценок")}</span><strong>{graded.length}</strong></div>
      <div><span>{t("Course credits", "Зачётные единицы")}</span><strong>{credits}</strong></div>
    </div>
    <section className={s.panel}>
      <div className={s.panelHead}><h2>{t("Academic record", "Зачётная книжка")}</h2><GraduationCap className={s.headIcon} size={23} /></div>
      {data.grades.length ? <table className={s.grades}>
        <thead><tr><th scope="col">{t("Subject", "Дисциплина")}</th><th scope="col">{t("Assessment", "Аттестация")}</th>
          <th scope="col">{t("Credits", "З. е.")}</th><th scope="col">{t("Score", "Балл")}</th></tr></thead>
        <tbody>{data.grades.map((grade) => <tr key={grade.id}>
          <th scope="row">{localized(lang, grade.subject)}{grade.examDate && <small><CalendarDays size={13} />{formatDate(grade.examDate, lang, { day: "numeric", month: "short", year: "numeric" })}</small>}</th>
          <td>{grade.assessment === "exam" ? t("Exam", "Экзамен") : t("Pass/fail", "Зачёт")}</td>
          <td><span className={s.creditLabel}>{t("Credits", "З. е.")} · </span>{grade.credits}</td>
          <td>{grade.score === null ? <span className={s.pending}>{t("Pending", "Ожидается")}</span> : <b className={s.score}>{grade.score}</b>}</td>
        </tr>)}</tbody>
      </table> : <p className={s.empty}>{t("Your academic record is empty.", "В зачётной книжке пока нет записей.")}</p>}
    </section>
  </div>;
}
