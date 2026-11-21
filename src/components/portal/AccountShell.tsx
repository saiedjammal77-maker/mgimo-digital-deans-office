"use client";

import { localized } from "@/lib/i18n";
import { flushSync } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Bell, CalendarDays, Files, Mail, GraduationCap, LayoutGrid, LoaderCircle, LogOut, RotateCw } from "lucide-react";
import { Brand, LanguageSwitch, useLanguage } from "@/components/identity";
import { formatDate, initials, loadAccount, postJSON, sections, type Account, type Lang } from "./model";
import s from "./portal.module.css";

type Mutation = (endpoint: "applications" | "notifications", body: object) => Promise<boolean>;
type Translator = (en: string, ru: string) => string;
interface PortalContextValue {
  data: Account;
  lang: Lang;
  t: Translator;
  now: Date;
  busy: boolean;
  mutate: Mutation;
  refresh(): void;
}

const PortalContext = createContext<PortalContextValue | null>(null);
export function usePortal() {
  const portal = useContext(PortalContext);
  if (!portal) throw new Error("Account context is required");
  return portal;
}

const icons = { overview: LayoutGrid, schedule: CalendarDays, grades: GraduationCap, applications: Files, tickets: Mail, notifications: Bell };
type Section = keyof typeof sections;
const sectionKeys = Object.keys(sections) as Section[];

function signInUrl() {
  const path = window.location.pathname.replace(/\/$/, "");
  return path === "/account" ? "/login" : "/login?next=" + encodeURIComponent(path);
}

export function AccountShell({ children }: { children: ReactNode }) {
  const { lang, t } = useLanguage();
  const pathname = usePathname();
  const section = sectionKeys.find((key) => sections[key].href === pathname?.replace(/\/$/, "")) ?? "overview";
  const [data, setData] = useState<Account | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const sessionChannel = useRef<BroadcastChannel | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<"applications" | "notifications" | "logout" | null>(null);
  const request = useRef<AbortController | null>(null);
  const writing = useRef(false);
  const unread = data?.notifications.filter((notice) => !notice.read).length ?? 0;

  useEffect(() => {
    document.title = localized(lang, sections[section]) + " · Atlas MGIMO";
  }, [section, lang]);

  const reload = useCallback(() => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    return loadAccount(controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      if (result.status === "anonymous") {
        setData(null);
        window.location.replace(signInUrl());
        return;
      }
      setLoading(false);
      setLoadError(result.status === "error");
      if (result.status === "ready") {
        setData(result.account);
        setNow(new Date());
      }
    });
  }, []);

  useEffect(() => {
    void reload();
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setData(null);
        void reload();
      }
    };
    const clearPrivateView = () => flushSync(() => setData(null));
    const channel = new BroadcastChannel("dean-account-session");
    sessionChannel.current = channel;
    channel.onmessage = () => {
      request.current?.abort();
      clearPrivateView();
      window.location.replace(signInUrl());
    };
    window.addEventListener("pagehide", clearPrivateView);
    window.addEventListener("pageshow", restore);
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => {
      request.current?.abort();
      sessionChannel.current = null;
      channel.close();
      window.removeEventListener("pagehide", clearPrivateView);
      window.clearInterval(timer);
      window.removeEventListener("pageshow", restore);
    };
  }, [reload]);

  useEffect(() => {
    if (!data?.demoExpiresAt) return;
    const expires = data.demoExpiresAt;
    const expire = () => {
      if (Date.now() >= expires) {
        setData(null);
        window.location.replace(signInUrl());
      }
    };
    const timer = window.setTimeout(expire, Math.max(0, expires - Date.now()));
    document.addEventListener("visibilitychange", expire);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", expire);
    };
  }, [data?.demoExpiresAt]);

  async function submit(endpoint: "applications" | "notifications" | "logout", body: object) {
    if (writing.current) return false;
    writing.current = true;
    setBusy(true);
    setActionError(null);
    try {
      const response = await postJSON(endpoint, body);
      if (response.status === 401) {
        setData(null);
        window.location.replace(signInUrl());
        return false;
      }
      if (!response.ok) throw new Error("Update declined");
      if (endpoint === "logout") {
        request.current?.abort();
        flushSync(() => setData(null));
        sessionChannel.current?.postMessage("logout");
        window.location.replace("/login");
      } else {
        await reload();
      }
      return true;
    } catch {
      setActionError(endpoint);
      return false;
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }

  const signOut = <button className={s.signout} type="button" disabled={busy} onClick={() => void submit("logout", {})}>
    <LogOut size={17} aria-hidden="true" /><span>{t("Sign out", "Выйти")}</span>
  </button>;

  function navLinks(mobile: boolean) {
    return sectionKeys.map((key) => {
      const Icon = icons[key];
      const label = localized(lang, sections[key]);
      return <Link key={key} href={sections[key].href} aria-current={section === key ? "page" : undefined} aria-label={label}>
        <Icon size={19} strokeWidth={1.65} aria-hidden="true" />
        <span>{mobile && key === "notifications" ? t("Inbox", "Почта") : label}</span>
        {key === "notifications" && unread > 0 && <b className={s.count}>{unread}</b>}
      </Link>;
    });
  }

  return (
    <div className={s.root} lang={lang}>
      <a className={s.skip} href="#account-content">{t("Skip to content", "К содержанию")}</a>
      <header className={s.mast}><div className={s.mastInner}>
        <div className={s.brandArea}><Brand /><span className={s.brandDivider} /><span className={s.mastTitle}>{data?.demo?t("Demo account","Демоаккаунт"):t("Student portal", "Личный кабинет")}</span></div>
        <div className={s.tools}><LanguageSwitch />{data && <span className={s.monogram} aria-label={localized(lang, data.profile.name)}>{initials(localized(lang, data.profile.name))}</span>}
          <div className={s.mobileLogout}>{signOut}</div>
        </div>
      </div></header>
      <div className={s.workspace}>
        <aside className={s.rail}>
          <div className={s.railInner}>
            <p className={s.smallLabel}>{t("Student portal", "Личный кабинет")}</p>
            <nav className={s.nav} aria-label={t("Student portal", "Личный кабинет")}>{navLinks(false)}</nav>
            <div className={s.railFoot}>{signOut}</div>
          </div>
        </aside>
        <main className={s.main} id="account-content" tabIndex={-1}>
          <div className={s.heading}>
            <h1>{localized(lang, sections[section])}</h1>
            {now && <div className={s.today}><CalendarDays size={15} aria-hidden="true" /><span>{formatDate(now, lang, { day: "numeric", month: "short", year: "numeric" })}</span><b>{t("MSK", "МСК")}</b></div>}
          </div>
          {actionError && <p className={s.alert} role="alert">{actionError === "logout" ? t("Could not sign out. Please try again.", "Не удалось выйти. Попробуйте ещё раз.")
            : actionError === "applications" ? t("Could not submit your request. Please try again.", "Не удалось отправить заявку. Попробуйте ещё раз.")
            : t("Could not mark the notice as read. Please try again.", "Не удалось отметить уведомление как прочитанное. Попробуйте ещё раз.")}</p>}
          {loadError && <div className={s.alert} role="alert">
            <span>{data ? t("Could not refresh your account.", "Не удалось обновить данные кабинета.") : t("Could not load your account.", "Не удалось загрузить данные кабинета.")}</span>
            <button type="button" disabled={loading} className={s.textButton} onClick={() => { setLoading(true); void reload(); }}><RotateCw size={14} />{t("Retry", "Повторить")}</button>
          </div>}
          {!data && !loadError && <div className={s.loading} role="status"><LoaderCircle size={25} />{t("Loading your account…", "Загружаем данные…")}</div>}
          {data && now && <PortalContext.Provider value={{ data, now, lang, t, busy: busy || loading || loadError, mutate: submit, refresh: reload }}>{children}</PortalContext.Provider>}
        </main>
      </div>
      <nav className={s.mobileNav} aria-label={t("Student portal", "Личный кабинет")}>{navLinks(true)}</nav>
    </div>
  );
}
