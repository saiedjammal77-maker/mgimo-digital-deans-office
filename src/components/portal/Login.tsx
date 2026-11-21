"use client";

import { localized, translate } from "@/lib/i18n";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, ArrowUpRight, Eye, EyeOff, LoaderCircle, LockKeyhole, UserRound } from "lucide-react";
import { useLanguage } from "@/components/identity";
import { PublicNav } from "@/components/PublicNav";
import { getAccount, initials, postJSON, sections } from "./model";
import styles from "./login.module.css";

const demos = [
  { login: "alina.volkova", en: "Alina Volkova", ru: "Алина Волкова" },
  { login: "mark.ivanov", en: "Mark Ivanov", ru: "Марк Иванов" },
];
const demoPassword = "Atlas2026!";

function enterPortal(home = "/account") {
  const query = new URLSearchParams(window.location.search);
  const next = query.get("next");
  if (next === "/dean") { window.location.replace("/dean"); return; }
  const destination = Object.values(sections).find((section) => section.href === next);
  const day = destination?.href === "/account/schedule" && query.get("day") === "3" ? "?day=3" : "";
  const kind = destination?.href === "/account/applications" && query.get("kind")==="application" ? "?kind=application" : "";
  window.location.replace((destination?.href ?? home) + (day || kind));
}

export function Login() {
  const { lang, t } = useLanguage();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<"credentials" | "service" | "empty" | null>(null);
  const submitting = useRef(false);
  const submitButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    document.title = translate(lang, "Student sign in", "Вход в личный кабинет") + " · Atlas MGIMO";
  }, [lang]);

  useEffect(() => {
    const controller = new AbortController();
    async function checkSession() {
      try {
        const staffLogin = new URLSearchParams(window.location.search).get("next") === "/dean";
        const response = staffLogin
          ? await fetch("/api/dean/access", { cache: "no-store", signal: controller.signal })
          : await getAccount(controller.signal);
        if (controller.signal.aborted || submitting.current) return;
        if (response.ok) enterPortal();
        else if (response.status === 401) {
          const requested = new URLSearchParams(window.location.search).get("student");
          const demo = demos.find(item => item.login === requested);
          if (demo) {
            setUsername(current => current || demo.login);
            setPassword(current => current || demoPassword);
          }
        }
      } catch {
        // The form remains available if the initial session check is offline.
      }
    }
    void checkSession();
    return () => controller.abort();
  }, []);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    if (!username.trim() || !password) {
      setError("empty");
      return;
    }
    submitting.current = true;
    setPending(true);
    setError(null);
    try {
      const response = await postJSON("login", { username: username.trim(), password });
      if (response.ok) {
        const { home } = await response.json();
        enterPortal(home === "/dean" ? "/dean" : "/account");
        return;
      }
      setError([400, 401, 403].includes(response.status) ? "credentials" : "service");
    } catch {
      setError("service");
    }
    submitting.current = false;
    setPending(false);
  }

  return (
    <div className={styles.root} lang={lang}>
      <PublicNav/>
      <main className={styles.split}>
        <div className={styles.cover}>
          <div className={styles.coverText}>
            <p className={styles.kicker}><span />{t("Dean’s office", "Деканат")}</p>
            <p className={styles.coverTitle}>{(lang === "es" ? "Portal" : t("Student", "Личный"))}<br /><em>{t("portal", "кабинет")}</em></p>
          </div>
          <div className={styles.mapCaption}>{t("MGIMO · Moscow","МГИМО · Москва")}</div>
        </div>
        <section className={styles.panel} aria-labelledby="login-title">
          <div className={styles.panelInner}>
            <h1 id="login-title">{t("Sign in", "Войти")}</h1>
            <p className={styles.lead}>{t("Enter your portal username and password.", "Введите логин и пароль от личного кабинета.")}</p>
            <form method="post" onSubmit={signIn} noValidate className={styles.form}>
              <label htmlFor="atlas-username">{t("Username", "Логин")}</label>
              <div className={styles.field}>
                <UserRound size={17} aria-hidden="true" />
                <input id="atlas-username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required disabled={pending}
                  placeholder={t("Your username", "Ваш логин")} value={username} onChange={(event) => { setUsername(event.target.value); setError(null); }} />
              </div>
              <label htmlFor="atlas-password">{t("Password", "Пароль")}</label>
              <div className={styles.field}>
                <LockKeyhole size={17} aria-hidden="true" />
                <input id="atlas-password" name="password" type={visible ? "text" : "password"} autoComplete="current-password" required disabled={pending}
                  placeholder={t("Your password", "Ваш пароль")} value={password} onChange={(event) => { setPassword(event.target.value); setError(null); }} />
                <button type="button" className={styles.reveal} aria-label={visible ? t("Hide password", "Скрыть пароль") : t("Show password", "Показать пароль")}
                  onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
              {error && <p role="alert" className={styles.error}>{error === "credentials"
                ? t("Check your username and password, then try again.", "Проверьте логин и пароль и попробуйте ещё раз.")
                : error === "empty" ? t("Enter both your username and password.", "Введите логин и пароль.")
                : t("Sign-in is unavailable. Please try again.", "Не удалось войти. Попробуйте ещё раз.")}</p>}
              <button type="submit" ref={submitButton} disabled={pending} className={styles.submit}>
                {pending ? t("Signing in…", "Входим…") : t("Sign in", "Войти")}
                {pending ? <LoaderCircle size={18} /> : <ArrowRight size={18} />}
              </button>
            </form>
            <div className={styles.demos}>
              <h2>{t("Demo accounts", "Демоаккаунты")}</h2>
              <p>{t("Choose a student to fill in the form. All demo records are fictional.", "Выберите студента, чтобы заполнить форму. Все демоданные вымышлены.")}</p>
              <div className={styles.demoPassword}><span>{t("Demo password", "Пароль демоаккаунтов")}</span><code>{demoPassword}</code></div>
              <div className={styles.demoList}>{demos.map((demo) => (
                <button key={demo.login} type="button" disabled={pending} onClick={() => {
                  setUsername(demo.login);
                  setPassword(demoPassword);
                  setError(null);
                  submitButton.current?.focus();
                }}>
                  <span className={styles.avatar}>{initials(localized(lang, demo))}</span>
                  <span><b>{localized(lang, demo)}</b><small>{demo.login}</small></span>
                  <ArrowUpRight size={15} aria-hidden="true" />
                </button>
              ))}</div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
