"use client";

import { localized } from "@/lib/i18n";
import { useEffect, useImperativeHandle, useLayoutEffect, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrthographicCamera, Vector3 } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Architecture } from "./Architecture";
import { landmarks, stopNumber } from "./landmarks";
import type { Lang } from "../identity";
import s from "./campus.module.css";

export type CameraAction = "left" | "right" | "in" | "out";
type Props = {
  selected: number;
  select: (index: number) => void;
  lang: Lang;
  onFail: () => void;
  onReady: () => void;
  cameraAction: RefObject<((action: CameraAction) => void) | null>;
};
type RigProps = Props & { labels: RefObject<(HTMLButtonElement | null)[]> };

function Rig({ selected, labels, onFail, onReady, cameraAction }: RigProps) {
  const { camera, gl, size, invalidate } = useThree();
  const controls = useRef<OrbitControls | null>(null);
  const point = useRef(new Vector3());

  useLayoutEffect(() => {
    const orbit = new OrbitControls(camera, gl.domElement);
    controls.current = orbit;
    orbit.enablePan = false;
    orbit.minPolarAngle = .15;
    orbit.maxPolarAngle = Math.PI * .46;
    const redraw = () => invalidate();
    orbit.addEventListener("change", redraw);
    gl.domElement.addEventListener("webglcontextlost", onFail);
    return () => {
      controls.current = null;
      gl.domElement.removeEventListener("webglcontextlost", onFail);
      orbit.removeEventListener("change", redraw);
      orbit.dispose();
    };
  }, [camera, gl, invalidate, onFail]);

  useImperativeHandle(cameraAction, () => (action: CameraAction) => {
    const orbit = controls.current;
    if (!orbit) return;
    if (action === "in") orbit.dollyIn(.82);
    if (action === "out") orbit.dollyOut(.82);
    if (action === "left") orbit.rotateLeft(Math.PI / 12);
    if (action === "right") orbit.rotateLeft(-Math.PI / 12);
  }, []);

  useLayoutEffect(() => {
    const orbit = controls.current;
    if (!orbit || !(orbit.object instanceof OrthographicCamera)) return;
    const camera = orbit.object;
    const stop = landmarks[selected];
    const focus = selected === 0 ? .2 : .65;
    orbit.target.set(stop.anchor[0] * focus, .9, stop.anchor[2] * focus);
    camera.position.fromArray(stop.eye).add(orbit.target);
    const fit = Math.min(size.width / 43, size.height / 28);
    camera.zoom = selected === 0 ? fit : fit * 1.28;
    orbit.minZoom = fit * .65;
    orbit.maxZoom = fit * 3;
    camera.updateProjectionMatrix();
    orbit.update();
    invalidate();
  }, [camera, selected, size.width, size.height, invalidate]);

  useEffect(onReady, [onReady]);
  useFrame(() => {
    // Project labels with the current orbit before the demand-driven frame is drawn.
    camera.updateMatrixWorld();
    landmarks.forEach(({ anchor }, i) => {
      const label = labels.current[i];
      if (!label) return;
      const p = point.current.fromArray(anchor).project(camera);
      label.style.left = ((p.x + 1) * 50) + "%";
      label.style.top = ((1 - p.y) * 50) + "%";
      label.style.visibility = Math.abs(p.x) < .96 && Math.abs(p.y) < .93 ? "visible" : "hidden";
    });
  });
  return null;
}

export default function CampusScene(props: Props) {
  const labels = useRef<(HTMLButtonElement | null)[]>([]);
  return <div className={s.scene}>
    <Canvas orthographic camera={{ position: [15, 21, 32], near: .1, far: 180 }} dpr={[1, 1.6]}
      frameloop="demand" gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}>
      <Rig {...props} labels={labels} />
      <Architecture select={props.select} />
    </Canvas>
    {landmarks.map((stop, i) => <button key={stop.id} ref={el => { labels.current[i] = el; }}
      className={s.marker} aria-label={localized(props.lang, stop.name)} aria-pressed={props.selected === i}
      onClick={() => props.select(i)}>
      {stopNumber(i)}<span>{localized(props.lang, stop.label)}</span>
    </button>)}
  </div>;
}
