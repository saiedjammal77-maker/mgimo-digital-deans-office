"use client";

import { localized } from "@/lib/i18n";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Brand, LanguageSwitch, useLanguage } from "@/components/identity";
import type { InboxTicket } from "@/lib/server/account";
import { formatDate, postJSON, statusLabels } from "./model";
import s from "./portal.module.css";

const endpoint = "dean/tickets";

export function DeanInbox() {
  const { lang, t } = useLanguage();
  const [tickets, setTickets] = useState<InboxTicket[] | null>(null);
  const sessionChannel = useRef<BroadcastChannel | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const current = useRef(true);

  function checkAccess(response: Response) {
    if (response.status === 401 || response.status === 403) {
      setTickets(null);
      window.location.replace(response.status === 401 ? "/login?next=%2Fdean" : "/dean");
      return false;
    }
    if (!response.ok) throw new Error("Ticket service unavailable");
    return true;
  }

  useEffect(() => {
    current.current = true;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/" + endpoint, { cache: "no-store", signal: controller.signal });
        if (checkAccess(response)) setTickets(await response.json());
      } catch {
        if (!controller.signal.aborted) { setTickets(null); setError(true); }
      }
    }
    void load();
    const hide = () => { controller.abort(); flushSync(() => setTickets(null)); };
    const restore = (event: PageTransitionEvent) => { if (event.persisted) window.location.reload(); };
    const channel = new BroadcastChannel("dean-account-session");
    sessionChannel.current = channel;
    channel.onmessage = () => { hide(); window.location.replace("/login?next=%2Fdean"); };
    window.addEventListener("pagehide", hide);
    window.addEventListener("pageshow", restore);
    return () => {
      current.current = false;
      controller.abort();
      sessionChannel.current = null;
      channel.close();
      window.removeEventListener("pagehide", hide);
      window.removeEventListener("pageshow", restore);
    };
  }, [revision]);

  async function update(id?: string, status?: string) {
    setBusy(true);
    setError(false);
    try {
      const response = await postJSON(id ? endpoint : "logout", id ? { id, status } : {});
      if (!current.current || !checkAccess(response)) return;
      if (id) {
        setTickets(rows => rows?.map(row => row.id === id ? { ...row, status: status as InboxTicket["status"] } : row) ?? null);
      } else {
        flushSync(() => setTickets(null));
        sessionChannel.current?.postMessage("logout");
        window.location.replace("/login");
      }
    } catch { setError(true); }
    finally { setBusy(false); }
  }

  return <div className={s.root} lang={lang}>
    <header className={s.mast}><div className={s.mastInner}><Brand /><LanguageSwitch /></div></header>
    <main className={s.staffMain}>
      <div className={s.heading}><h1>{t("Dean’s office inbox", "Обращения в деканат")}</h1>
        <button className={s.textButton} disabled={busy} onClick={() => void update()}>{t("Sign out", "Выйти")}</button></div>
      <section className={s.panel}>
        <div className={s.panelHead}><h2>{t("Private tickets", "Личные обращения")}</h2>
          <button className={s.textButton} disabled={busy} onClick={() => { setError(false); setRevision(n => n + 1); }}>{t("Refresh", "Обновить")}</button></div>
        {error && <p role="alert" className={s.alert}>{t("Could not complete the request. Refresh and try again.", "Не удалось выполнить запрос. Обновите список и попробуйте снова.")}</p>}
        {tickets === null ? !error && <p role="status" className={s.empty}>{t("Loading tickets…", "Загружаем обращения…")}</p>
          : tickets.length === 0 ? <p className={s.empty}>{t("No private tickets yet.", "Личных обращений пока нет.")}</p>
          : <ul className={s.history}>{tickets.map(ticket => <li key={ticket.id}>
            <h3>ID <code>{ticket.id}</code></h3>
            <p>{t("Student ID", "ID студента")} <code>{ticket.user_id}</code></p>
            <p>{ticket.note}</p>
            <time dateTime={ticket.createdAt}>{formatDate(ticket.createdAt, lang, { dateStyle: "medium", timeStyle: "short" })}</time>
            <label>{t("Status", "Статус")} <select disabled={busy} value={ticket.status}
              onChange={event => void update(ticket.id, event.target.value)}>
              {Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{localized(lang, label)}</option>)}
            </select></label>
          </li>)}</ul>}
      </section>
    </main>
  </div>;
}
