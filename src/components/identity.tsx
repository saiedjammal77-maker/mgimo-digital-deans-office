"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { languages, translate, type Lang } from "@/lib/i18n";
export type { Lang } from "@/lib/i18n";
const Language = createContext<{lang:Lang,setLang:(lang:Lang)=>void}>({lang:"ru",setLang:()=>{}});
let memory:Lang="ru";
function subscribeLang(notify:()=>void){window.addEventListener("atlas-language",notify);window.addEventListener("storage",notify);return ()=>{window.removeEventListener("atlas-language",notify);window.removeEventListener("storage",notify)}}
function readLang():Lang{try{const value=localStorage.getItem("atlas.lang") || memory; return Object.hasOwn(languages,value) ? value as Lang : "ru"}catch{return memory}}
function setLang(next:Lang){memory=next;try{localStorage.setItem("atlas.lang",next)}catch{}window.dispatchEvent(new Event("atlas-language"))}
export function LanguageProvider({children}:{children:ReactNode}) {
  const lang=useSyncExternalStore(subscribeLang,readLang,()=>"ru" as Lang);
  useEffect(()=>{document.documentElement.lang=lang==="zh"?"zh-Hans":lang},[lang]);
  return <Language.Provider value={{lang,setLang}}>{children}</Language.Provider>
}
export function useLanguage() {
  const context = useContext(Language);
  const t = useCallback((en: string, ru: string) => translate(context.lang, en, ru), [context.lang]);
  return { ...context, t };
}
export function Rose({className}:{className?:string}){
  return <svg className={className} aria-hidden="true" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="22" stroke="currentColor" strokeWidth=".75"/><circle cx="32" cy="32" r="18.5" stroke="currentColor" strokeWidth=".55" strokeDasharray="1 3"/>{[0,90,180,270].map(deg=><g key={deg} transform={`rotate(${deg} 32 32)`}><path d="M32 1 37 27 32 32Z" fill="currentColor"/><path d="M32 1 27 27 32 32Z" stroke="currentColor" strokeWidth=".8"/><path d="M15 15 30 25 32 32 25 30Z" stroke="currentColor" strokeWidth=".65"/></g>)}<circle cx="32" cy="32" r="2" fill="currentColor"/></svg>
}
export function Brand() {
  const { t, lang } = useLanguage();
  return <Link className="desk-brand" href="/" aria-label={t("Atlas MGIMO — home", "Атлас МГИМО — главная")}><b>{lang === "ru" ? "МГИМО" : "MGIMO"}</b><i aria-hidden="true">/</i>{t("Student desk", "Деканат")}</Link>;
}

export function LanguageSwitch() {
  const { lang, setLang, t } = useLanguage();
  return <select className="atlas-language" aria-label={t("Language", "Язык")} value={lang} onChange={event => setLang(event.target.value as Lang)}>
    {Object.entries(languages).map(([code, name]) => <option key={code} value={code} lang={code}>{name}</option>)}
  </select>;
}
