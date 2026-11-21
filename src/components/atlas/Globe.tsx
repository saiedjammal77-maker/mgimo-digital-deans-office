"use client";
import dynamic from "next/dynamic";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { Hand, MapPin } from "lucide-react";
import { useLanguage } from "../identity";
import st from "./landing.module.css";
const WorldCanvas=dynamic(()=>import("./WorldCanvas"),{ssr:false,loading:()=>null});
class SurfaceBoundary extends Component<{children:ReactNode;onFail:()=>void},{failed:boolean}> {
  state={failed:false}; static getDerivedStateFromError(){return {failed:true}}
  componentDidCatch(){this.props.onFail()}
  render(){return this.state.failed?null:this.props.children}
}
const centerX=320,centerY=248;
function orbit(angle:number,rx:number,ry:number,front:boolean) {
  return Array.from({length:125},(_,i)=>{const phi=(i/124+(front?0:1))*Math.PI,x=rx*Math.cos(phi),y=ry*Math.sin(phi),rot=angle*Math.PI/180;return (i?"L":"M")+(centerX+x*Math.cos(rot)-y*Math.sin(rot)).toFixed(2)+" "+(centerY+x*Math.sin(rot)+y*Math.cos(rot)).toFixed(2)}).join("")
}
function Instruments({front}:{front:boolean}){
  const cut=front?"fore":"rear";return <svg className={st.drawing} viewBox="0 0 640 496" aria-hidden="true">
    <defs><linearGradient id={cut+"brass"} x1="0" y1="1" x2="1" y2="0" gradientUnits="objectBoundingBox"><stop stopColor="#7b644d"/><stop offset=".19" stopColor="#ffde99"/><stop offset=".4" stopColor="#86683e"/><stop offset=".67" stopColor="#ebc695"/><stop offset="1" stopColor="#9d876f"/></linearGradient></defs>
    {!front&&<g fill="none"><circle cx="320" cy="248" r="222" stroke="#ada2c7" strokeOpacity=".19" strokeDasharray="2 7"/><circle cx="320" cy="248" r="237" stroke="#ada2c7" strokeOpacity=".1"/>{Array.from({length:84},(_,i)=><path key={i} transform={`rotate(${i*360/84} 320 248)`} d={i%7?"M320 26v3":"M320 22v8"} stroke="#a29bb8" opacity={i%7?.35:.7} strokeWidth=".8"/>)}<path d="M35 248h45m480 0h45M320 3v13m0 461v16" stroke="#ded3e6" opacity=".33" strokeWidth=".8"/></g>}
    <g fill="none" strokeLinecap="round" opacity={front?.95:.6}><path d={orbit(-22,285,85,front)} stroke={"url(#"+cut+"brass)"} strokeWidth="1.6"/><path d={orbit(-22,285,88,front)} stroke="#c3a58b" strokeWidth=".55"/><path d={orbit(53,222,66,front)} stroke="#c1a3cf" strokeWidth=".8" opacity=".65"/><path d={orbit(-71,205,129,front)} stroke={"url(#"+cut+"brass)"} strokeWidth="1.2" opacity=".9"/></g>
    {front&&<g><circle cx="97" cy="370" r="4.3" fill="#d2b179" stroke="#fce4b3"/><circle cx="97" cy="370" r="8" stroke="#b49665" opacity=".35" fill="none"/><path d="M542 104v13m-6.5-6.5h13" stroke="#e5be83"/><circle cx="185" cy="45" r="2" fill="#e6d6bc"/></g>}
  </svg>
}
const stations=[
  {city:["Moscow","Москва"],zone:"Europe/Moscow",coords:"55°45′ N · 37°37′ E",lon:37.62,lat:55.75,slug:"moscow"},
  {city:["Geneva","Женева"],zone:"Europe/Zurich",coords:"46°12′ N · 06°09′ E",lon:6.15,lat:46.2,slug:"geneva"},
  {city:["New York","Нью-Йорк"],zone:"America/New_York",coords:"40°43′ N · 74°00′ W",lon:-74.0,lat:40.72,slug:"new-york"}
];
export default function Globe(){
  const {lang}=useLanguage(),ru=lang==="ru";
  const [mode,setMode]=useState<"poster"|"canvas"|"video">("poster"),[angles,setAngles]=useState([43*Math.PI/180,19*Math.PI/180]);
  const drag=useRef<{x:number,y:number,yaw:number,pitch:number}|null>(null);
  const [station,setStation]=useState(0),[clock,tick]=useState<number|null>(null);
  const loc=stations[station],poster=station===0?"/atlas/globe-poster.webp":"/atlas/"+loc.slug+".webp";
  useEffect(()=>{const update=()=>tick(Date.now());const first=setTimeout(update,0),timer=setInterval(update,15000);return()=>{clearTimeout(first);clearInterval(timer)}},[]);
  function tune(index:number){setStation(index);const place=stations[index];setAngles(index===0?[43*Math.PI/180,19*Math.PI/180]:[place.lon*Math.PI/180,place.lat*.65*Math.PI/180])}
  useEffect(()=>{const motion=window.matchMedia("(prefers-reduced-motion: reduce)"),width=window.matchMedia("(min-width: 680px)");function check(){const nav=navigator as Navigator&{deviceMemory?:number,connection?:{saveData?:boolean}};
    if(motion.matches||nav.connection?.saveData||(nav.deviceMemory||8)<4){setMode("poster");return}
    if(!width.matches){setMode("video");return}
    try{const probe=document.createElement("canvas").getContext("webgl2",{failIfMajorPerformanceCaveat:true});if(probe)probe.getExtension("WEBGL_lose_context")?.loseContext();setMode(probe?"canvas":"poster")}catch{setMode("poster")}
  }check();motion.addEventListener("change",check);width.addEventListener("change",check);return()=>{motion.removeEventListener("change",check);width.removeEventListener("change",check)}},[]);
  const reset=()=>setMode("poster");
  return <div className={st.instrument}><div className={st.instrumentGlow}/><div className={st.plate}><Instruments front={false}/>
    <div className={st.sphere} style={{backgroundImage:"url("+poster+")"}}>
      {mode==="canvas"&&<SurfaceBoundary onFail={reset}><WorldCanvas yaw={angles[0]} pitch={angles[1]} onFail={reset}/></SurfaceBoundary>}
      {mode==="video"&&station===0&&<video aria-hidden="true" poster="/atlas/globe-poster.webp" muted playsInline autoPlay loop disablePictureInPicture onError={reset} src="/atlas/mobile-orbit.mp4"/>}
    </div><Instruments front/>
    {mode==="canvas"&&<div className={st.dragLayer} role="slider" tabIndex={0} aria-label={ru?"Повернуть глобус":"Rotate the globe"} aria-valuemin={0} aria-valuemax={360} aria-valuenow={Math.round((angles[0]*180/Math.PI%360+360)%360)} onKeyDown={e=>{if(!["ArrowLeft","ArrowRight","Home"].includes(e.key))return;e.preventDefault();setAngles(e.key==="Home"?[43*Math.PI/180,19*Math.PI/180]:[angles[0]+(e.key==="ArrowLeft"?-.16:.16),angles[1]])}}
    onPointerDown={e=>{drag.current={x:e.clientX,y:e.clientY,yaw:angles[0],pitch:angles[1]};e.currentTarget.setPointerCapture(e.pointerId)}} onPointerUp={()=>{drag.current=null}} onPointerCancel={()=>{drag.current=null}} onPointerMove={e=>{const d=drag.current;if(d)setAngles([d.yaw-(e.clientX-d.x)*.009,Math.max(-1.2,Math.min(1.2,d.pitch+(e.clientY-d.y)*.006))])}}/>}
    </div><div className={st.globeAnnotation}><MapPin size={12}/> {loc.city[ru?1:0].toUpperCase()} <span>{loc.coords}</span></div>
    <div className={st.stationDesk}><div className={st.stationHead}><span>{ru?"МЕСТНОЕ ВРЕМЯ":"MERIDIAN TIME"}</span><b>{clock?new Intl.DateTimeFormat("en-GB",{hour:"2-digit",minute:"2-digit",timeZone:loc.zone,hourCycle:"h23"}).format(clock):"––:––"}</b></div><div className={st.stations} role="group" aria-label={ru?"Выбрать меридиан":"Choose a meridian"}>{stations.map((place,index)=><button type="button" key={place.zone} aria-pressed={index===station} onClick={()=>tune(index)}>{place.city[ru?1:0]}</button>)}</div></div>
    {mode==="canvas"&&<div className={st.rotateHint}><Hand size={12}/> {ru?"Вращайте":"Drag globe"}</div>}
  </div>
}
