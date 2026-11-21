"use client";
import Link from "next/link";
import {useId,useState} from "react";
import {ArrowUpRight,Stamp} from "lucide-react";
import {useLanguage} from "../identity";
import s from "./folio.module.css";

export function AtlasSeal({caption="ATLAS  ·  STUDENT EDITION  ·  MGIMO  ·  MOSCOW  ·  "}:{caption?:string}){
  const id=useId().replace(/:/g,"");
  const petals=Array.from({length:241},(_,i)=>{const a=i*Math.PI/120,r=43+3*Math.cos(a*24);return (i?"L":"M")+(50+r*Math.cos(a)).toFixed(2)+" "+(50+r*Math.sin(a)).toFixed(2)}).join("");
  return <svg className={s.seal} viewBox="0 0 100 100" aria-hidden="true"><defs><path id={id} d="M50 17a33 33 0 1 1-.01 0"/></defs><g stroke="currentColor" fill="none"><path d={petals} strokeWidth=".8"/><circle cx="50" cy="50" r="40"/><circle cx="50" cy="50" r="27" strokeWidth=".6"/><path d="M50 26l4.6 19.4L74 50l-19.4 4.6L50 74l-4.6-19.4L26 50l19.4-4.6Z"/><path d="m50 26 0 24 4.6-4.6Zm24 24H50l4.6 4.6ZM50 74V50l-4.6 4.6ZM26 50h24l-4.6-4.6Z" fill="currentColor"/></g><text fill="currentColor" fontFamily="monospace" fontSize="6.6" letterSpacing=".5"><textPath href={"#"+id} textLength="206">{caption}</textPath></text></svg>
}
const files=[
 {code:"TT",name:["Timetable","Расписание"],title:["A seminar changes rooms.","Семинар перенесли."],blurb:["Two lines in a timetable can change your whole morning. Compare the dean’s original entry with the amendment.","Две строки в расписании меняют планы на всё утро. Сравните исходную запись деканата с исправлением."],route:"/account/schedule"},
 {code:"AR",name:["Grades","Оценки"],title:["Read the academic ledger.","Откройте зачётную книжку."],blurb:["A mark and a credit answer different questions. Read them side by side, and see which examination is still ahead.","Оценка и зачётная единица отвечают на разные вопросы. Сверьте их и узнайте, какой экзамен ещё впереди."],route:"/account/grades"},
 {code:"RQ",name:["Requests","Заявки"],title:["Follow a paper trail.","Проследите путь справки."],blurb:["A certificate has a journey of its own. Follow it from the student’s desk to the registry and back.","У справки есть свой маршрут. Проследите его от студента до деканата и обратно."],route:"/account/applications"},
 {code:"IN",name:["Dispatches","Депеши"],title:["A cable from the dean.","Депеша из деканата."],blurb:["A short message carries the essential detail: what changed, who needs to know, and when to act.","Короткое сообщение отвечает на главные вопросы: что изменилось, кому это важно и когда действовать."],route:"/account/notifications"},
 {code:"ID",name:["Student ID","Профиль"],title:["Meet the delegate.","Знакомьтесь: студент."],blurb:["Each account opens a different fieldbook. This specimen belongs to Alina, a second-year diplomacy student.","У каждого студента свой атлас. Этот образец принадлежит Алине, студентке второго курса направления «Дипломатия»."],route:"/account"}
];
export default function Folio(){
 const {lang}=useLanguage(),i=lang==="en"?0:1,t=(en:string,ru:string)=>i?ru:en;
 const [active,select]=useState(0),[amended,amend]=useState(true);const file=files[active];
 const entries: Array<[string,string]>=active===0?[[t("Day","День"),amended?t("Wednesday","Среда"):t("Tuesday","Вторник")],[t("Time · Moscow","Время · Москва"),amended?"10:45":"13:00"],[t("Room","Аудитория"),amended?"А–214":"А–302"]]:active===1?[[t("Diplomatic Protocol","Дипломатический протокол"),t("91 / 100 · 5 credits","91 / 100 · 5 з. е.")],[t("French","Французский язык"),t("94 / 100 · 3 credits","94 / 100 · 3 з. е.")],[t("International Law","Международное право"),t("Exam pending","Предстоит экзамен")]]:active===2?[[t("Origin","Отправитель"),t("Student desk","Студент")],[t("Document","Документ"),t("Proof of enrolment","Справка об обучении")],[t("Status","Статус"),t("Ready for collection","Готова к выдаче")]]:active===3?[[t("From","От"),t("Dean’s office","Деканат")],[t("Subject","Тема"),t("Elective registration","Выбор дисциплин")],[t("Action by","Срок"),t("27 November","27 ноября")]]:[[t("Name","Имя"),t("Alina Volkova","Алина Волкова")],[t("Faculty","Факультет"),t("International Relations","Международные отношения")],[t("Year / Group","Курс / Группа"),"II / МО-25-1"]];
 const documentNames=[t("Diplomatic Protocol","Дипломатический протокол"),t("Record of marks","Ведомость оценок"),t("Certificate register","Реестр справок"),t("Incoming cable","Входящая депеша"),t("Identity record","Личная карточка")];
 return <section className={s.desk} id="services"><div className={s.wrap}>
 <div className={s.shelf}><span>{t("THE READING ROOM","ЧИТАЛЬНЫЙ ЗАЛ")}</span><b/><span>{t("Open collection · 5 files","Открытая коллекция · 5 дел")}</span></div>
 <h2 data-rise>{t("The student’s ","Студенческий ")}<em>{t("fieldbook.","атлас.")}</em></h2>
 <div className={s.tabs} role="group" aria-label={t("Choose a dossier","Выберите дело")}>{files.map((item,num)=><button key={item.code} onClick={()=>select(num)} aria-pressed={num===active}><small>{item.code}</small>{item.name[i]}</button>)}</div>
 <div className={s.binding}><div className={s.spread} key={active}><article className={s.left}><div className={s.folioNo}>MGIMO / {file.code} <span>✧</span></div><h3>{file.title[i]}</h3><p>{file.blurb[i]}</p><Link href={"/login?next="+encodeURIComponent(file.route)}>{t("Open in my account","Открыть в кабинете")} <ArrowUpRight size={16}/></Link><div className={s.folioFoot}>{t("ATLAS · STUDENT EDITION","АТЛАС · СТУДЕНЧЕСКОЕ ИЗДАНИЕ")}</div></article>
 <article className={s.right}><div className={s.docTop}><small>{t("FICTIONAL SPECIMEN","УЧЕБНЫЙ ОБРАЗЕЦ")}</small><span>№ {file.code}–0{active+1}</span></div><h4>{documentNames[active]}</h4>
 <dl>{entries.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
 <div className={s.docBottom}>{active===0?<button aria-pressed={amended} onClick={()=>amend(!amended)}><Stamp size={15}/>{amended?t("View original entry","Показать оригинал"):t("Apply amendment","Показать исправление")}</button>:<small>{t("Office copy","Экземпляр деканата")}</small>}<span className={s.stamped}>{[amended?t("AMENDED","ПЕРЕНЕСЕНО"):t("ORIGINAL","ОРИГИНАЛ"),t("EXAM FILE","СЕССИЯ"),t("READY","ГОТОВО"),t("RECEIVED","ПОЛУЧЕНО"),t("SPECIMEN","ОБРАЗЕЦ")][active]}</span></div>
 </article></div></div></div></section>
}
