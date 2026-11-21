"use client";

import { localized } from "@/lib/i18n";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { Component, useCallback, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Box, Layers, MapPin, Minus, Plus, RotateCcw, RotateCw } from "lucide-react";
import { useLanguage } from "../identity";
import { PublicNav } from "../PublicNav";
import { landmarks, officialMap, stopNumber } from "./landmarks";
import CampusPlan from "./CampusPlan";
import type { CameraAction } from "./CampusScene";
import s from "./campus.module.css";

const Scene = dynamic(() => import("./CampusScene"), { ssr: false });
const motionQuery = "(prefers-reduced-motion: reduce)";
function subscribeMotion(notify: () => void) {
  const query = matchMedia(motionQuery);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
}

class SceneBoundary extends Component<{ onFail: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFail(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export default function CampusTour() {
  const { lang, t } = useLanguage();
  const [selected, select] = useState(0);
  const [plan, setPlan] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const reduced = useSyncExternalStore(subscribeMotion, () => matchMedia(motionQuery).matches, () => true);
  const render3D = !reduced && !failed && !plan;
  const live3D = render3D && ready;
  const cameraAction = useRef<((action: CameraAction) => void) | null>(null);
  const onFail = useCallback(() => { setFailed(true); setReady(false); }, []);
  const onReady = useCallback(() => setReady(true), []);
  const stop = landmarks[selected];
  const cameraButtons = [
    ["left", RotateCcw, t("Orbit left", "Повернуть влево")],
    ["right", RotateCw, t("Orbit right", "Повернуть вправо")],
    ["out", Minus, t("Zoom out", "Отдалить")],
    ["in", Plus, t("Zoom in", "Приблизить")],
  ] as const;

  return <div className={s.page}>
    <a href="#tour" className="atlas-skip">{t("Skip to tour", "К экскурсии")}</a>
    <PublicNav/>
    <main>
      <section className={s.hero} aria-labelledby="campus-title">
        <Image src="/campus-photo/mgimo-hero-2048.webp" alt="" fill preload sizes="(max-width: 700px) 100vw, 72vw" className={s.photo} />
        <div className={s.heroInner}>
          <p className={s.kicker}><MapPin size={15} /> {t("76 Vernadsky Avenue · Moscow", "Проспект Вернадского, 76 · Москва")}</p>
          <h1 id="campus-title">{t("The Moscow", "Московский")} <em>{t("campus", "кампус")}</em></h1>
          <Link href="/campus/walk" className={s.enter}>{t("Walk the campus", "Прогулка по кампусу")} <ArrowRight size={17} /></Link>
          <a href="#tour" className={s.enter}>{t("Explore landmarks", "Места кампуса")} <ArrowDown size={17} /></a>
        </div>
      </section>
      <section id="tour" className={s.tour} aria-labelledby="tour-title">
        <header className={s.heading}>
          <div><p className={s.sectionLabel}>{t("Guided tour", "Экскурсия")}</p>
            <h2 id="tour-title">{t("Campus landmarks", "Места кампуса")}</h2></div>
          <a href={officialMap} className={s.source}>{t("Official MGIMO map", "Карта на сайте МГИМО")} <ArrowUpRight size={16} /></a>
        </header>
        <div className={s.spread}>
          <figure className={s.viewer}>
            <div className={s.stage}>
              {!live3D && <CampusPlan lang={lang} selected={selected} select={select} />}
              {render3D && <SceneBoundary onFail={onFail}><Scene {...{ lang, selected, select, onFail, onReady, cameraAction }} /></SceneBoundary>}
            </div>
            <div className={s.toolbar}>
              {!reduced && !failed ? <button onClick={() => { setPlan(!plan); setReady(false); }}>
                {plan ? <Box size={17} /> : <Layers size={17} />}
                {plan ? t("3D view", "3D-модель") : t("Plan view", "Вид сверху")}
              </button> : <span><Layers size={17} />{t("Plan view", "Вид сверху")}</span>}
              {live3D && <div className={s.camera} role="group" aria-label={t("Camera controls", "Управление камерой")}>
                {cameraButtons.map(([action, Icon, label]) => <button key={action} onClick={() => cameraAction.current?.(action)}
                  aria-label={label} title={label}><Icon size={16} /></button>)}
              </div>}
            </div>
            <figcaption>{t("Illustrated model, not to scale", "Иллюстративная модель без соблюдения масштаба")}
              <span>{live3D ? t("Drag to orbit · Scroll or pinch to zoom", "Тяните для поворота · Меняйте масштаб колесом или щипком")
                : failed ? t("3D unavailable · Select a stop on the plan", "3D недоступно · Выберите место на плане")
                : t("Select a stop on the plan", "Выберите место на плане")}</span>
            </figcaption>
          </figure>
          <div className={s.guide}>
            <div aria-live="polite" aria-atomic="true" className={s.details}>
              <p className={s.sectionLabel}>{t("Stop", "Остановка")} {stopNumber(selected)} / {stopNumber(landmarks.length - 1)}</p>
              <h3>{localized(lang, stop.name)}</h3><p>{localized(lang, stop.description)}</p>
            </div>
            <div className={s.paging}>
              <button onClick={() => select((selected + landmarks.length - 1) % landmarks.length)}><ArrowLeft size={17} />{t("Previous", "Назад")}</button>
              <button onClick={() => select((selected + 1) % landmarks.length)}>{t("Next", "Далее")}<ArrowRight size={17} /></button>
            </div>
            <ol className={s.stops} aria-label={t("Tour stops", "Остановки экскурсии")}>
              {landmarks.map((item, i) => <li key={item.id}><button aria-current={i === selected ? "step" : undefined} onClick={() => select(i)}>
                <span>{stopNumber(i)}</span>{localized(lang, item.name)} <i aria-hidden="true">↗</i>
              </button></li>)}
            </ol>
          </div>
        </div>
      </section>
      <figure className={s.aerial}>
        <a href="/campus-map/campus-aerial.webp" aria-label={t("Open full-resolution render","Открыть изображение в полном размере")}>
          <Image src="/campus-map/campus-aerial.webp" width={2000} height={1200} sizes="(max-width: 800px) 100vw, 90vw"
            alt={t("Blender reconstruction of the entire Vernadsky campus","Реконструкция всего кампуса на Вернадского в Blender")}/>
        </a>
        <figcaption><strong>{t("Full campus aerial view","Панорама кампуса")}</strong>
          <Link href="/campus/walk">{t("Walk the campus","Прогулка по кампусу")} ↗</Link></figcaption>
      </figure>
      <footer className={s.footer}>
        <span>{t("Campus photograph", "Фотография кампуса")} · <a href="https://commons.wikimedia.org/wiki/File:Mgimo.jpg">A.Savin, Wikipedia</a> · <a href="https://artlibre.org/licence/lal/en/">Free Art License 1.3</a> · <a href="/campus-photo/CREDITS.txt">{t("16:9 crop with colour overlay", "Кадрирование 16:9 и тонирование")}</a></span>
      </footer>
    </main>
  </div>;
}
