"use client";

import { localized } from "@/lib/i18n";
import { useState, type FormEvent } from "react";
import { Bell, CalendarClock, CalendarDays, Check, CheckCheck, Clock3, FileText, Megaphone, Send } from "lucide-react";
import { usePortal } from "./AccountShell";
import { applicationKinds, formatDate, newestFirst, noticeKinds, statusLabels, type Application, type Notice } from "./model";
import s from "./portal.module.css";

export function ApplicationsView({ tickets = false }: { tickets?: boolean }) {
  const { data, lang, t, busy, mutate, refresh } = usePortal();
  const [kind, setKind] = useState<Application["kind"]>(() =>
    !tickets && typeof window !== "undefined" && new URLSearchParams(window.location.search).get("kind")==="application" ? "application" : "certificate");
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);
  const noteBytes = new TextEncoder().encode(note.trim()).length;
  const tooLong = noteBytes > 256;
  const applications = newestFirst(data.applications.filter(item => (item.kind === "ticket") === tickets), (item) => item.createdAt);
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (tooLong || (tickets && !note.trim())) return;
    setSent(false);
    if (await mutate("applications", { kind: tickets ? "ticket" : kind, note: note.trim() })) {
      setNote("");
      setSent(true);
    }
  }

  return <div className={s.serviceGrid}>
    <section className={s.panel}>
      <div className={s.panelHead}><h2>{tickets ? t("Write to the dean", "Написать в деканат") : t("New request", "Новая заявка")}</h2><FileText size={21} className={s.headIcon} /></div>
      {tickets && <p className={s.historyNote}>{data.demo
        ? t("Demo only. Use fictional details. Your four latest tickets stay in this browser for this sign-in and are cleared at sign-out. The dean’s office receives nothing.",
            "Деморежим. Используйте вымышленные данные. Четыре последних обращения хранятся в браузере до выхода. Деканат их не получает.")
        : t("Only you and designated dean’s office staff can read your ticket in the portal.",
            "В кабинете обращение доступно только вам и уполномоченным сотрудникам деканата.")}</p>}
      <form autoComplete="off" className={s.requestForm} onSubmit={send}>
        {!tickets && <><label htmlFor="request-kind">{t("Request type", "Тип заявки")}</label>
        <select id="request-kind" value={kind} disabled={busy} onChange={(event) => { setKind(event.target.value as Application["kind"]); setSent(false); }}>
          <option value="certificate">{localized(lang, applicationKinds.certificate)}</option><option value="application">{localized(lang, applicationKinds.application)}</option>
        </select></>}
        <label htmlFor="request-note">{tickets ? t("Ticket details", "Текст обращения") : t("Request details", "Подробности заявки")}</label>
        <textarea id="request-note" rows={4} required={tickets} disabled={busy} value={note} aria-invalid={tooLong} aria-describedby="request-limit" placeholder={t("What do you need from the dean’s office?", "Чем вам может помочь деканат?")}
          onChange={(event) => { setNote(event.target.value); setSent(false); }} />
        <small id="request-limit" className={s.noteLimit} data-invalid={tooLong}>{tooLong ? t("Shorten your note", "Сократите текст") : tickets ? t("Required", "Обязательно") : t("Optional", "Необязательно")} · {noteBytes}/256 {t("bytes", "байт")}</small>
        <button type="submit" className={s.primaryButton} disabled={busy || tooLong || (tickets && !note.trim())}><Send size={15} />{tickets ? (data.demo ? t("Save demo ticket", "Сохранить демообращение") : t("Send ticket", "Отправить обращение")) : t("Submit request", "Отправить заявку")}</button>
        {sent && <p className={s.success} role="status"><Check size={16} />{tickets && data.demo ? t("Demo ticket saved in this browser.", "Демообращение сохранено в браузере.") : t("Request submitted.", "Заявка отправлена.")}</p>}
      </form>
    </section>
    <section className={s.panel}>
      <div className={s.panelHead}><h2>{tickets ? t("My tickets", "Мои обращения") : t("Request history", "История заявок")}</h2>{tickets ? <button type="button" className={s.textButton} disabled={busy} onClick={refresh}>{t("Refresh status", "Обновить статус")}</button> : <span className={s.pill}>{applications.length}</span>}</div>
      {!tickets && data.demo && <p className={s.historyNote}>{t("In demo mode, the four most recent submissions are kept alongside the sample requests.", "В деморежиме здесь сохраняются четыре последние отправленные заявки и примеры заявок.")}</p>}
      {applications.length ? <ul className={s.history}>{applications.map((item) => (
        <li key={item.id}>
          <div className={s.historyTop}><h3>{localized(lang, applicationKinds[item.kind])}</h3><span className={s.status} data-status={item.status}>{localized(lang, statusLabels[item.status])}</span></div>
          {tickets && <p>ID <code>{item.id}</code></p>}
          {item.note && <p>{item.noteLabel ? localized(lang, item.noteLabel) : item.note}</p>}
          <time dateTime={item.createdAt}><Clock3 size={13} />{formatDate(item.createdAt, lang, { day: "numeric", month: "short", year: "numeric" })}</time>
        </li>
      ))}</ul> : <p className={s.empty}>{tickets ? t("You have no tickets yet.", "Обращений пока нет.") : t("Your submitted requests will appear here.", "Здесь появятся отправленные вами заявки.")}</p>}
    </section>
  </div>;
}

const noticeIcons = { announcement: Megaphone, deadline: CalendarClock, schedule: CalendarDays };

export function NoticeRow({ notice, preview = false }: { notice: Notice; preview?: boolean }) {
  const { lang, t, mutate, busy } = usePortal();
  const Icon = noticeIcons[notice.kind];
  return <li className={s.notice} data-unread={!notice.read}>
    <span className={s.noticeIcon} data-kind={notice.kind}><Icon size={17} strokeWidth={1.65} /></span>
    <div className={s.noticeContent}>
      <div className={s.noticeMeta}><span>{localized(lang, noticeKinds[notice.kind])}</span><time dateTime={notice.date}>{formatDate(notice.date, lang, preview
        ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" })}</time></div>
      <h3>{localized(lang, notice.title)}</h3>
      {!preview && <><p>{localized(lang, notice.body)}</p>
        {notice.read ? <span className={s.read}><CheckCheck size={14} />{t("Read", "Прочитано")}</span>
          : <button type="button" disabled={busy} className={s.textButton} onClick={() => void mutate("notifications", { id: notice.id })}>
            <Check size={14} />{t("Mark as read", "Отметить как прочитанное")}</button>}</>}
    </div>
  </li>;
}

export function NotificationsView() {
  const { data, t } = usePortal();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const unread = data.notifications.filter((item) => !item.read);
  const visible = newestFirst(unreadOnly ? unread : data.notifications, (item) => item.date);
  return <section className={s.panel}>
    <div className={s.panelHead}><h2>{t("Inbox", "Входящие")}</h2><Bell size={21} className={s.headIcon} /></div>
    <div className={s.filters} role="group" aria-label={t("Filter notifications", "Фильтр уведомлений")}>
      <button type="button" aria-pressed={!unreadOnly} onClick={() => setUnreadOnly(false)}>{t("All", "Все")} <b>{data.notifications.length}</b></button>
      <button type="button" aria-pressed={unreadOnly} onClick={() => setUnreadOnly(true)}>{t("Unread", "Непрочитанные")} <b>{unread.length}</b></button>
    </div>
    {visible.length ? <ul className={s.noticeList}>{visible.map((notice) => <NoticeRow key={notice.id} notice={notice} />)}</ul>
      : <p className={s.empty}>{unreadOnly ? t("You’re all caught up.", "Все уведомления прочитаны.") : t("No notifications yet.", "Уведомлений пока нет.")}</p>}
  </section>;
}
