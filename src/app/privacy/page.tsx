"use client";
import Link from "next/link";
import {useLanguage} from "@/components/identity";
import {PublicNav} from "@/components/PublicNav";
import s from "./privacy.module.css";
export default function Privacy(){
 const { t } = useLanguage();
 return <><PublicNav/><main className={s.paper}>
 <p className={s.kicker}>{t("STUDENT SERVICES","СЕРВИСЫ СТУДЕНТА")}</p><h1>{t("Student privacy","Защита данных студента")}</h1>
 <p className={s.intro}>{t("The campus tour is public. Student records and the dean’s inbox require sign-in.","Экскурсия по кампусу открыта всем. Для доступа к данным студента и обращениям в деканат требуется вход.")}</p>
 <section><h2>{t("Using a demo account","Демоаккаунты")}</h2><p>{t("Alina and Mark are fictional students with public demo passwords. Use invented details when trying a request or a ticket. Demo tickets do not reach MGIMO staff.","Алина и Марк — вымышленные студенты с открытыми демопаролями. При создании заявки или обращения используйте только вымышленные данные. Демообращения не поступают сотрудникам МГИМО.")}</p></section>
 <section><h2>{t("Personal accounts","Личные кабинеты")}</h2><p>{t("In a connected university deployment, access follows your signed-in account: your profile, grades, requests and notifications belong to you. Other students cannot browse them. A dean ticket is available to its author and authorized dean’s office staff.","При подключении к университетской базе доступ определяется вашей учётной записью. Другие студенты не могут просматривать ваш профиль, оценки, заявки и уведомления. Обращение в деканат доступно его автору и уполномоченным сотрудникам деканата.")}</p></section>
 <section><h2>{t("On a shared device","На общем устройстве")}</h2><p>{t("Sign out when you finish. Keep real passwords, passport numbers and medical information out of the competition demo.","Завершив работу, выйдите из аккаунта. Не вводите в конкурсном демо реальные пароли, паспортные или медицинские данные.")}</p></section>
 <Link href="/">{t("Return to the campus homepage","На главную страницу")}</Link></main></>
}
