import { localized } from "@/lib/i18n";
import type { Lang } from "../identity";
import { landmarks, stopNumber } from "./landmarks";
import s from "./campus.module.css";

export default function CampusPlan({ lang, selected, select }: {
  lang: Lang; selected: number; select: (index: number) => void;
}) {
  return <div className={s.plan}>
    <svg viewBox="-18 -13 36 26" aria-hidden="true">
      <rect x="-16.5" y="-11.5" width="33" height="23" fill="#d7dbc5" stroke="#a9ad9c" strokeWidth=".16" />
      <path d="M-16 0H16M-1 -11V11M-16 9.4H16" fill="none" stroke="#faf4e8" strokeWidth="1.3" />
      <g stroke="#506671" strokeWidth=".13" fill="#c2cbca">
        <path d="M-13.8 -8.5h12v7.1h-2.8v-4.7h-6.4v4.1h-2.8Z" />
        <path d="M-4.5 -1.4h1.8v3h-1.8Z" />
      </g>
      <g stroke="#526574" strokeWidth=".15" fill="#f1e9d8">
        <path d="M-11.5 1.2h9v5.6h-2v1.5h-5V6.8h-2Z" />
        <rect x="-10.4" y="1.8" width="6.8" height="4.2" fill="#c1c9c5" />
        <path d="M3.1 1.2h5.8v1.2h2.8v3.4H3.1Z" />
        <rect x="3.6" y="2.8" width="3.5" height="2" fill="#c1c9c5" />
        <rect x="2.5" y="-9.2" width="11" height="5.2" />
        {Array.from({length: 7}, (_, i) => <rect key={i} x={3.3 + i * 1.45} y="-8.9" width=".7" height="4.6" fill="#b5cdd0" />)}
      </g>
      <g fill="#9aae93" stroke="#798f79" strokeWidth=".1">
        {[-10,-6,-2,2,6,10,14].map(x => <circle key={x} cx={x} cy="10.6" r=".52" />)}
        {[-6,-2,2,6].map(z => <circle key={z} cx="15" cy={z} r=".6" />)}
      </g>
    </svg>
    {landmarks.map((stop,i) => <button key={stop.id} className={s.planMarker}
      style={{ left: ((stop.anchor[0] + 18) / 36 * 100) + "%", top: ((stop.anchor[2] + 13) / 26 * 100) + "%" }}
      aria-label={localized(lang, stop.name)} aria-pressed={selected === i} onClick={() => select(i)}>
      {stopNumber(i)}<span>{localized(lang, stop.label)}</span>
    </button>)}
  </div>;
}
