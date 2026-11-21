import { localized, translate } from "@/lib/i18n";
import { useRef } from "react";
import { grounds, stops, type Pose } from "./world";
import type { Lang } from "../../identity";
import s from "./walk.module.css";

const path=(points:number[][])=>"M"+points.map(p=>p.join(" ")).join("L");
const polygons=grounds.buildings.map(b=>[b.outline,...b.holes].map(p=>path(p)+"Z").join(""));
export default function WalkingMap({pose,lang,onPlace,mini=false,aerial=false}:{pose:Pose;lang:Lang;onPlace?:(x:number,z:number)=>void;mini?:boolean;aerial?:boolean}) {
  const ref=useRef<SVGSVGElement>(null);
  const view=mini ? [pose.x-70,pose.z-60,140,120].join(" ") : "-20 -22 732 640";
  return <svg ref={ref} className={s.map} viewBox={view} preserveAspectRatio={mini?"xMidYMid slice":"xMidYMid meet"}
    aria-label={translate(lang,"Campus map and walking position","Карта кампуса и ваше положение")} role="img"
    onClick={onPlace?e=>{
      const transform=ref.current?.getScreenCTM(); if(!transform) return;
      const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(transform.inverse());
      onPlace(p.x,p.y);
    }:undefined}>
    <rect x="-250" y="-250" width="1200" height="1200" fill="#daddd3"/>
    <path d={path(grounds.boundary)+"Z"} fill="#bec9ac" stroke="#84947d" strokeWidth="2"/>
    {grounds.fields.map((f,i)=><path key={i} d={path(f.outline)+"Z"} fill={f.sport==="running"?"#c59c89":"#8cac8c"} stroke="#efebd8" strokeWidth="1"/>)}
    {grounds.roads.map((road,i)=><path key={i} d={path(road.line)} fill="none" stroke="#f3eddc" strokeWidth={road.width+1}/>)}
    {polygons.map((d,i)=><path key={i} d={d} fill="#88969a" fillRule="evenodd" stroke="#596a72" strokeWidth=".9"/>)}
    {aerial && !mini && <image href="/campus-map/campus-overhead.webp" x="-20" y="-22" width="732" height="640" pointerEvents="none"/>}
    {!mini && stops.map((stop,i)=><text className={s.stopName} key={stop.en} x={stop.x} y={stop.z-10} textAnchor="middle" fontSize="12" fill="#1e3448"
      paintOrder="stroke" stroke="#edf0de" strokeWidth="3.4" fontWeight="700">{localized(lang, stop) || i}</text>)}
    <g transform={`translate(${pose.x} ${pose.z}) rotate(${pose.heading*180/Math.PI})`}>
      <circle r={mini?5:8} fill="#ebe1ab" stroke="#1c324d" strokeWidth={mini?1:2}/>
      <path d={mini?"M0 -12L-3 -4H3Z":"M0 -18L-5 -6H5Z"} fill="#172c49"/>
    </g>
  </svg>;
}
