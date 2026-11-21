"use client";

import { localized } from "@/lib/i18n";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Files, GraduationCap } from "lucide-react";
import { usePortal } from "./AccountShell";
import { LessonList } from "./AcademicViews";
import { NoticeRow } from "./ServiceViews";
import { formatDate, newestFirst, sections, upcomingDay } from "./model";
import s from "./portal.module.css";

export function Overview() {
  const { data, now, lang, t } = usePortal();
  const { profile } = data;
  const upcoming = upcomingDay(data.lessons, now);
  const notices = newestFirst(data.notifications, (item) => item.date).slice(0, 3);
  const results = data.grades.filter((item) => item.score !== null).length;
  const openRequests = data.applications.filter((item) => item.kind !== "ticket" && item.status !== "ready").length;
  return <div className={s.stack}>
    <section className={s.profile}>
      <div className={s.profileArt} aria-hidden="true"/>
      <div className={s.profileText}>
        <p className={s.heroLabel}><i />{t("Student fieldbook · Identity page", "Атлас студента · Личная карточка")}</p>
        <h2>{localized(lang, profile.name)}</h2>
        <p className={s.program}>{localized(lang, profile.program)}</p>
        <p className={s.faculty}>{localized(lang, profile.faculty)}</p>
        <div className={s.profileMeta}><span>{t("Year", "Курс")} <b>{profile.year}</b></span><i />
          <span>{t("Group", "Группа")} <b>{profile.group}</b></span></div>
      </div>
    </section>
    <div className={s.overviewGrid}>
      <section className={s.panel}>
        <div className={s.panelHead}><div><p className={s.smallLabel}>{t("Schedule", "Расписание")}</p><h2>{t("Upcoming classes", "Ближайшие занятия")}</h2></div></div>
        {upcoming ? <><div className={s.dateStrip}>{formatDate(upcoming.date, lang, { weekday: "long", day: "numeric", month: "short" })}<span>{t("MSK", "МСК")}</span></div>
          <LessonList lessons={upcoming.lessons.slice(0, 2)} /></> : <p className={s.empty}>{t("No classes scheduled.", "В расписании пока нет занятий.")}</p>}
        <Link className={s.panelLink} href={sections.schedule.href}>{t("Full schedule", "Всё расписание")}<ArrowRight size={16} /></Link>
      </section>
      <section className={s.panel}>
        <div className={s.panelHead}><div><p className={s.smallLabel}>{t("Dean’s office", "Деканат")}</p><h2>{t("Latest notices", "Уведомления")}</h2></div></div>
        {notices.length ? <ul className={s.noticeList}>{notices.map((notice) => <NoticeRow key={notice.id} notice={notice} preview />)}</ul> : <p className={s.empty}>{t("No notifications yet.", "Уведомлений пока нет.")}</p>}
        <Link className={s.panelLink} href={sections.notifications.href}>{t("All notifications", "Все уведомления")}<ArrowRight size={16} /></Link>
      </section>
    </div>
    <div className={s.quickLinks}>
      <Link href={sections.grades.href}><GraduationCap size={23} /><div><h2>{t("Academic record", "Зачётная книжка")}</h2><p>{t("Results posted", "Выставлено оценок")} · {results}/{data.grades.length}</p></div><ArrowUpRight size={17} /></Link>
      <Link href={sections.applications.href}><Files size={22} /><div><h2>{t("Student requests", "Заявки в деканат")}</h2><p>{t("Open requests", "В обработке")} · {openRequests}</p></div><ArrowUpRight size={17} /></Link>
    </div>
  </div>;
}
