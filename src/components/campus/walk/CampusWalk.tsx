"use client";

import { localized } from "@/lib/i18n";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Footprints, Map as MapIcon, MoveUpRight } from "lucide-react";
import { useLanguage } from "../../identity";
import { PublicNav } from "../../PublicNav";
import { canStand, spawn, step, stops, type Pose } from "./world";
import { softwareView } from "./software";
import WalkingMap from "./WalkingMap";
import s from "./walk.module.css";

const movement = new Set(["KeyW","KeyA","KeyS","KeyD","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","ShiftLeft","ShiftRight"]);
export default function CampusWalk() {
  const { lang, t } = useLanguage();
  const [aerial, setAerial] = useState(true);
  const [active,setActive]=useState(false),[started,setStarted]=useState(false);
  const [pose,setPose]=useState<Pose>(()=>spawn(0)),[invalid,setInvalid]=useState(false);
  const player=useRef<Pose>(spawn(0)),keys=useRef(new Set<string>());
  const stage=useRef<HTMLDivElement>(null),mount=useRef<HTMLDivElement>(null);
  const drag=useRef<{id:number;x:number;y:number}|null>(null);
  const held=useRef(new Map<string,number>());
  const [quality,setQuality]=useState<"loading"|"full"|"light">("loading");

  const pause=useCallback(()=>{
    keys.current.clear();held.current.clear();drag.current=null;
    setPose({...player.current});setActive(false);
  },[]);
  useEffect(()=>{
    if(!active || !mount.current) return;
    const host=mount.current, pressed=keys.current;
    let canvas=document.createElement("canvas"); host.appendChild(canvas);
    let closed=false,frame=0,previous=0,lastHUD=0;
    let view:ReturnType<typeof softwareView>|undefined;
    let observer:ResizeObserver|undefined;
    function size() {view?.resize(Math.max(1,host.clientWidth),Math.max(1,host.clientHeight));}
    function light() {
      view?.dispose();
      const next=document.createElement("canvas");canvas.replaceWith(next);canvas=next;
      view=softwareView(canvas);size();setQuality("light");
    }
    function lost(e:Event) {e.preventDefault();if(!closed)light();}
    async function init() {
      try {
        const {createLandscape}=await import("./landscape");
        if(closed)return;
        view=createLandscape(canvas);canvas.addEventListener("webglcontextlost",lost,{once:true});setQuality("full");
      } catch {if(closed)return; light();}
      observer=new ResizeObserver(size);observer.observe(host);size();
      function update(time:number) {
        if(closed)return;
        frame=requestAnimationFrame(update);
        if(time-previous<1000/40) return;
        const dt=Math.min((time-previous)/1000,.07);previous=time;
        step(player.current,pressed,dt);view?.draw(player.current);
        if(time-lastHUD>120) {
          const p=player.current;
          setPose(old=>old.x===p.x && old.z===p.z && old.heading===p.heading ? old : {...p});
          lastHUD=time;
        }
      }
      frame=requestAnimationFrame(update);
    }
    function visibility() {if(document.hidden) pause();}
    window.addEventListener("blur",pause);document.addEventListener("visibilitychange",visibility);
    stage.current?.focus({preventScroll:true});void init();
    return ()=>{
      closed=true;pressed.clear();cancelAnimationFrame(frame);observer?.disconnect();
      window.removeEventListener("blur",pause);document.removeEventListener("visibilitychange",visibility);
      canvas.removeEventListener("webglcontextlost",lost);view?.dispose();canvas.remove();
    };
  },[active,pause]);

  function place(p:Pose) {player.current=p;setPose({...p});setInvalid(false);}
  function start() {setQuality("loading");setStarted(true);setActive(true);}
  function mapPoint(x:number,z:number) {
    if(!canStand(x,z)){setInvalid(true);return;}
    place({...player.current,x,z});
  }
  const nearest=stops.reduce((best,stop)=>Math.hypot(stop.x-pose.x,stop.z-pose.z)<Math.hypot(best.x-pose.x,best.z-pose.z)?stop:best);
  const distance=Math.round(Math.hypot(nearest.x-pose.x,nearest.z-pose.z));
  const direction=((Math.round(pose.heading*180/Math.PI)%360)+360)%360;
  const pad=[
    ["KeyW",ArrowUp,t("Move forward","Шаг вперёд")],["KeyA",ArrowLeft,t("Step left","Шаг влево")],
    ["KeyS",ArrowDown,t("Move backward","Шаг назад")],["KeyD",ArrowRight,t("Step right","Шаг вправо")],
  ] as const;
  return <div className={s.page}>
    <PublicNav/>
    <main className={s.main}>
      {!active ? <section className={s.setup} aria-labelledby="walk-title">
        <div className={s.choices}><p className={s.kicker}>{t("MGIMO · Vernadsky campus","МГИМО · Кампус на Вернадского")}</p>
          <h1 id="walk-title">{t("Campus walk","Прогулка по кампусу")}</h1>
          <p>{t("Place yourself on the map or choose a starting point. Explore the outdoor grounds at street level.","Отметьте точку на карте или выберите место старта. Осмотрите территорию кампуса с уровня пешехода.")}</p>
          <label htmlFor="starting-point">{t("Starting point","Место старта")}</label>
          <select id="starting-point" value={stops.findIndex(stop=>stop.x===pose.x&&stop.z===pose.z)}
            onChange={e=>place(spawn(Number(e.target.value)))}>
            <option value="-1" disabled>{t("Your map position","Ваша точка на карте")}</option>
            {stops.map((stop,i)=><option key={stop.en} value={i}>{localized(lang, stop)}</option>)}
          </select>
          <button className={s.start} onClick={start}><Footprints size={19}/>{started?t("Continue walking","Продолжить прогулку"):t("Start walking","Начать прогулку")}<ArrowRight size={18}/></button>
          <p className={s.instructions}>{t("WASD to walk, drag to look, Shift to run. On a phone, hold a direction and swipe the scene to look around.","WASD — ходьба, потяните мышью для обзора, Shift — бег. На телефоне удерживайте стрелку и проведите по экрану для обзора.")}</p>
        </div>
        <div className={s.board}><WalkingMap pose={pose} lang={lang} onPlace={mapPoint} aerial={aerial}/>
          <div className={s.mapLayers} role="group" aria-label={t("Campus map and walking position","Карта кампуса и ваше положение")}>
            <button aria-pressed={aerial} onClick={() => setAerial(true)}>{t("Aerial view","Вид с воздуха")}</button>
            <button aria-pressed={!aerial} onClick={() => setAerial(false)}>{t("Schematic view","Схема")}</button>
          </div><p role="status">{invalid?t("Choose open ground inside the campus boundary.","Выберите свободное место в границах кампуса."):t("Tap open ground to place your starting marker.","Коснитесь свободного участка, чтобы поставить метку старта.")}</p></div>
      </section> : <section className={s.stage} ref={stage} tabIndex={0} aria-label={t("First-person campus walk","Прогулка от первого лица")}
        onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget)){keys.current.clear();held.current.clear();}}}
        onKeyDown={e=>{
          if(e.key==="Escape"){pause();return;}
          if(!movement.has(e.code))return;e.preventDefault();
          if(!e.repeat&&!keys.current.has(e.code))step(player.current,new Set([e.code]),.055);
          keys.current.add(e.code);
        }}
        onKeyUp={e=>{if(movement.has(e.code)){e.preventDefault();keys.current.delete(e.code);}}}>
        <div className={s.screen} ref={mount}
          onPointerDown={e=>{if(drag.current)return;stage.current?.focus();e.currentTarget.setPointerCapture(e.pointerId);drag.current={id:e.pointerId,x:e.clientX,y:e.clientY};}}
          onPointerMove={e=>{const d=drag.current;if(!d||d.id!==e.pointerId)return;
            player.current.heading+=(e.clientX-d.x)*.004;player.current.pitch=Math.max(-.87,Math.min(.96,player.current.pitch-(e.clientY-d.y)*.0035));
            d.x=e.clientX;d.y=e.clientY;}}
          onLostPointerCapture={()=>{drag.current=null;}}/>
        <div className={s.topBar}><button onClick={pause}><MapIcon size={16}/>{t("Place on map","На карту")}</button>
          <span>{String(direction).padStart(3,"0")}°</span></div>
        <button className={s.radar} onClick={pause} aria-label={t("Open position map","Открыть карту позиции")}><WalkingMap pose={pose} lang={lang} mini/></button>
        <div className={s.position}><b>{localized(lang, nearest)}</b><span>{distance} {t("m to landmark marker","м до метки на карте")}</span></div>
        <div className={s.pad} role="group" aria-label={t("Movement controls","Управление движением")}>{pad.map(([code,Icon,label])=>
          <button key={code} aria-label={label}
            onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);keys.current.add(code);held.current.set(code,performance.now());}}
            onPointerUp={()=>{const since=held.current.get(code);if(since!==undefined&&performance.now()-since<100)step(player.current,new Set([code]),.12);keys.current.delete(code);held.current.delete(code);}}
            onLostPointerCapture={()=>{keys.current.delete(code);held.current.delete(code);}}
            onClick={e=>{if(e.detail===0)step(player.current,new Set([code]),.16);}}><Icon size={20}/></button>)}</div>
        <div className={s.hint} role="status">{quality==="loading"?t("Loading the grounds…","Загрузка территории…"):
          <><span className={s.desktopHint}>{t("Drag to look · Arrows to walk and turn · Esc for map","Потяните для обзора · Стрелки для движения и поворота · Esc — карта")}</span>
          <span className={s.touchHint}>{t("Swipe to look · Hold an arrow to move","Смахните для обзора · Удерживайте стрелку для ходьбы")}</span></>}</div>
      </section>}
      <footer className={s.footer}><span>{t("Outdoor reconstruction · Building heights and landscaping are approximate.","Реконструкция территории · Высота зданий и озеленение приблизительны.")}</span>
        <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>
        <a href="/campus-map/CREDITS.txt">{t("Map credits","Источники карты")} <MoveUpRight size={12}/></a></footer>
    </main>
  </div>;
}
