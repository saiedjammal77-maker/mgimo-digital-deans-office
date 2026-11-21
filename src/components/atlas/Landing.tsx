"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Bell, BookOpen, Box, CalendarDays, FileText, MapPin, Send, X } from "lucide-react";
import { useLanguage } from "../identity";
import { PublicNav } from "../PublicNav";
import s from "./university.module.css";

const Building = dynamic(() => import("./Building"), {
  ssr: false,
  loading: () => <div className={s.viewer} aria-busy="true"/>,
});
const services = [
  { icon: CalendarDays, path: "schedule", en: "Timetable", ru: "Расписание", detail: ["Classes, rooms and changes", "Занятия, аудитории и переносы"] },
  { icon: BookOpen, path: "grades", en: "Academic record", ru: "Успеваемость", detail: ["Marks, credits and exams", "Баллы, зачёты и экзамены"] },
  { icon: FileText, path: "applications", en: "Documents", ru: "Документы", detail: ["Order a certificate or track a request", "Заказать справку или узнать статус"] },
  { icon: Bell, path: "notifications", en: "Notifications", ru: "Уведомления", detail: ["Deadlines and announcements", "Сроки и объявления деканата"] },
  { icon: Send, path: "tickets", en: "Ask the dean", ru: "Написать в деканат", detail: ["A private ticket to the dean’s office", "Личное обращение в деканат"] },
];

export default function Landing() {
  const { lang, t } = useLanguage();
  const root = useRef<HTMLDivElement>(null);
  const viewer = useRef<HTMLDialogElement>(null);
  const [showModel, setShowModel] = useState(false);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let undo: (() => void) | undefined;
    let stopped = false;
    Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([{ gsap }, { ScrollTrigger }]) => {
      if (stopped) return;
      gsap.registerPlugin(ScrollTrigger);
      const scope = gsap.context(() => {
        gsap.utils.toArray<HTMLElement>("[data-arrive]").forEach(el => gsap.from(el, {
          y: 16, duration: .58, ease:"power2.out", scrollTrigger: { trigger: el, start: "top 94%", once: true },
        }));
        if(matchMedia("(min-width: 851px) and (pointer:fine)").matches){
          gsap.fromTo("[data-campus-image]",{yPercent:-2},{yPercent:2,ease:"none",
            scrollTrigger:{trigger:"[data-campus-frame]",start:"top bottom",end:"bottom top",scrub:.45}});
        }
      }, root);
      undo = () => scope.revert();
    });
    return () => { stopped = true; undo?.(); };
  }, []);

  function openModel() {
    viewer.current?.showModal();
    setShowModel(true);
  }

  return <div className={s.site} ref={root}>
    <a className="atlas-skip" href="#main">{t("Skip to content", "К содержанию")}</a>
    <PublicNav/>
    <main id="main">
      <section className={s.cover} aria-labelledby="hero-title">
        <div className={s.heroCopy}>
          <h1 id="hero-title"><em>{t("Digital", "Цифровой")}</em> <strong>{t("Dean’s Office", "Деканат")}</strong></h1>
          <div className={s.heroText}><p>{t("Your classes, academic record and a direct line to the dean at MGIMO.", "Ваши занятия, успеваемость и прямая связь с деканатом МГИМО.")}</p>
          <Link className={s.primary} href="/login">{t("Open student account","Открыть личный кабинет")}<ArrowRight size={16}/></Link></div>
        </div>
        <div className={s.frame} data-campus-frame><Image className={s.landscape} data-campus-image src="/campus-photo/vernadsky.webp" fill preload sizes="100vw"
          alt={t("Blender reconstruction of MGIMO’s Vernadsky campus with its limestone façade and fluted auditorium roof.", "Реконструкция кампуса МГИМО на Вернадского с каменным фасадом и ребристой крышей актового зала.")}/>
        <div className={s.sceneBar}>
          <div className={s.location}><MapPin size={16}/><span><b>{t("Vernadsky campus", "Кампус на Вернадского")}</b><small>{t("Moscow · Architectural reconstruction","Москва · Архитектурная реконструкция")}</small></span></div>
          <div className={s.sceneLinks}><button onClick={openModel}><Box size={16}/>{t("Rotate building","Вращать здание")}</button><Link href="/campus/walk">{t("Walk the campus","Прогулка по кампусу")}<ArrowUpRight size={15}/></Link></div>
        </div></div>
      </section>
      <section id="services" className={s.services} aria-labelledby="services-title">
        <div className={s.intro}><p className={s.eyebrow}>{t("MGIMO · Student account","МГИМО · Личный кабинет")}</p>
          <h2 id="services-title">{(lang === "es" ? "Servicios" : t("Student", "Сервисы"))} <br/>{t("services", "студента")}</h2>
          <p>{t("Choose a service. Sign in to see your own records or follow a request.", "Выберите сервис. Войдите, чтобы посмотреть свои данные или проверить статус обращения.")}</p></div>
        <div className={s.directory}>{services.map(item => <Link data-arrive key={item.path} href={"/login?next=" + encodeURIComponent("/account/" + item.path)}>
          <item.icon aria-hidden size={21} strokeWidth={1.4}/><span><b>{t(item.en,item.ru)}</b><small>{t(item.detail[0],item.detail[1])}</small></span><ArrowUpRight size={18}/>
        </Link>)}</div>
      </section>
      <section className={s.bulletin} data-arrive aria-labelledby="bulletin-title">
        <div><p className={s.eyebrow}>{t("Campus bulletin", "Бюллетень кампуса")}</p>
          <h2 id="bulletin-title">{t("Diplomatic Protocol moves to Wednesday.", "Дипломатический протокол — в среду.")}</h2>
          <p>{t("Sample timetable · Group МО-25-1 · Irina Mirova", "Пример расписания · Группа МО-25-1 · Ирина Мирова")}</p></div>
        <div className={s.changeSheet}>
          <div><span>{t("Previously","Было")}</span><del>{t("Tue","Вт")} 13:00</del><small>{t("Room","Ауд.")} А-302</small></div>
          <div><span>{t("Rescheduled","Стало")}</span><strong>{t("Wed","Ср")} 10:45</strong><small>{t("Room","Ауд.")} А-214</small></div>
          <Link href="/login?next=%2Faccount%2Fschedule&day=3&student=alina.volkova">{t("View timetable","Открыть расписание")} <ArrowRight size={16}/></Link>
        </div>
      </section>
      <section className={s.documents} aria-labelledby="documents-title" data-arrive>
        <div><p className={s.eyebrow}>{t("Student administration","Учебная часть")}</p><h2 id="documents-title">{t("Documents","Документы")}</h2>
          <p>{t("Choose a request to open the form in your account. Your submitted requests and their status stay together in your history.","Выберите нужную форму. Отправленные заявки и их статусы появятся в истории вашего кабинета.")}</p></div>
        <div className={s.forms}>{[
          ["certificate",t("Order a certificate","Заказать справку")],
          ["application",t("Submit an application","Подать заявление")],
        ].map(([kind,name])=><Link key={kind} href={"/login?next=%2Faccount%2Fapplications&kind="+kind}><span>{name}</span><ArrowUpRight size={20}/></Link>)}</div>
      </section>
      <section id="contact" className={s.contact} data-arrive>
        <div><p className={s.eyebrow}>{t("Contact","Контакты")}</p><h2>{t("Dean’s office","Связь с деканатом")}</h2></div>
        <div><p>{t("76 Vernadsky Avenue, Moscow","Москва, проспект Вернадского, 76")}</p>
        <Link href="/login?next=%2Faccount%2Ftickets">{t("Open a private ticket","Создать личное обращение")} <ArrowUpRight size={16}/></Link>
        <a href="https://mgimo.ru/about/contacts/">{t("University contact directory","Официальные контакты МГИМО")} <ArrowUpRight size={16}/></a></div>
      </section>
    </main>
    <footer className={s.footer}>
      <p>{t("Independent competition project. Demo accounts use fictional records.","Независимый конкурсный проект. В демоаккаунтах используются вымышленные данные.")}</p>
      <Link href="/privacy">{t("Student privacy","Защита данных")}</Link><a href="/campus-photo/CREDITS.txt">{t("Render credits","Авторы визуализации")}</a><Link href="/login">{t("Student sign-in","Вход в кабинет")} ↗</Link>
    </footer>
    <dialog className={s.dialog} ref={viewer} onClose={() => setShowModel(false)} aria-labelledby="model-title">
      <header><h2 id="model-title">{t("Vernadsky campus","Кампус на Вернадского")}</h2><button aria-label={t("Close viewer","Закрыть просмотр")} onClick={() => viewer.current?.close()}><X size={22}/></button></header>
      {showModel && <Building lang={lang}/>}
    </dialog>
  </div>;
}
