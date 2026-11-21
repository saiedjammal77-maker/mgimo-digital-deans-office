"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Rose, LanguageSwitch, useLanguage } from "./identity";
import s from "./public-nav.module.css";

export function PublicNav() {
  const { t } = useLanguage();
  const path=usePathname(),menu=useRef<HTMLDialogElement>(null);
  const links=[
    ["/#services",t("Student services","Сервисы")],["/campus",t("Campus guide","Кампус")],
    ["/campus/walk",t("Campus walk","Прогулка в 3D")],["/#contact",t("Contact","Контакты")],
  ];
  const navigation=links.map(([href,title])=><Link key={href} href={href} aria-current={path===href?"page":undefined} onClick={()=>menu.current?.close()}>{title}</Link>);
  return <header className={s.header}>
    <Link className={s.signature} href="/" aria-label={t("MGIMO homepage","МГИМО — главная")}><Rose className={s.rose}/><b>{t("MGIMO","МГИМО")}</b><span>{t("Dean’s office","Деканат")}</span></Link>
    <nav className={s.desktop} aria-label={t("Main navigation","Главное меню")}>{navigation}</nav>
    <div className={s.actions}><LanguageSwitch/>
      {path!=="/login"&&<Link className={s.login} href="/login">{t("Sign in","Войти")}<ArrowUpRight size={14}/></Link>}
      <button className={s.menuButton} aria-label={t("Open menu","Открыть меню")} aria-haspopup="dialog" onClick={()=>menu.current?.showModal()}><Menu size={21}/></button>
    </div>
    <dialog className={s.dialog} ref={menu} aria-label={t("Site menu","Меню сайта")}>
      <div className={s.menuHead}><b>{t("MGIMO","МГИМО")}</b><button aria-label={t("Close menu","Закрыть меню")} onClick={()=>menu.current?.close()}><X size={24}/></button></div>
      <nav aria-label={t("Site sections","Разделы сайта")}>{navigation}<Link href="/login" onClick={()=>menu.current?.close()}>{t("Student account","Личный кабинет")}</Link></nav>
    </dialog>
  </header>;
}
