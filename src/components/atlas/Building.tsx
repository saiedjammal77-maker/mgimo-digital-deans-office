"use client";

import { translate } from "@/lib/i18n";
import { Canvas, useLoader, useThree } from "@react-three/fiber";
import { Component, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RotateCcw, RotateCw } from "lucide-react";
import type { Lang } from "../identity";
import s from "./university.module.css";

class RenderBoundary extends Component<{ children: ReactNode; failed: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.failed(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function Model({ orbitRef, onReady, onFail }: {
  orbitRef: React.RefObject<OrbitControls | null>; onReady: () => void; onFail: () => void;
}) {
  const { scene } = useLoader(GLTFLoader, "/campus-photo/vernadsky.glb");
  const { camera, gl, invalidate, size } = useThree();
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.target.set(0, 6.7, 0);
    const distanceScale = Math.max(1, 1.55 / (size.width / size.height));
    camera.position.set(33 * distanceScale, 19 * distanceScale, 49 * distanceScale);
    controls.minAzimuthAngle = -.55;
    controls.maxAzimuthAngle = 1.48;
    controls.maxPolarAngle = Math.PI * .485;
    controls.minPolarAngle = .56;
    controls.minDistance = 32;
    controls.maxDistance = Math.max(92, camera.position.length() * 1.2);
    controls.enablePan = false;
    const redraw = () => invalidate();
    controls.addEventListener("change", redraw);
    controls.update();
    gl.domElement.addEventListener("webglcontextlost", onFail);
    orbitRef.current = controls;
    onReady();
    return () => {
      controls.dispose();
      controls.removeEventListener("change", redraw);
      gl.domElement.removeEventListener("webglcontextlost", onFail);
      orbitRef.current = null;
    };
  }, [camera, gl, invalidate, onFail, onReady, orbitRef, size.height, size.width]);
  return <primitive object={scene}/>;
}

export default function Building({ lang }: { lang: Lang }) {
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const orbit = useRef<OrbitControls | null>(null);
  const onReady = useCallback(() => setStatus("ready"), []);
  const onFail = useCallback(() => setStatus("failed"), []);
  const t = (en: string, ru: string) => translate(lang, en, ru);
  return <>
    <div className={s.viewer} data-ready={status === "ready"}>
      {status !== "failed" && <RenderBoundary failed={onFail}>
        <Canvas frameloop="demand" camera={{ fov: 37, near: .1, far: 400 }} dpr={[1, 1.5]} gl={{ antialias: true, powerPreference: "low-power" }}
          fallback={t("Architectural reconstruction","Архитектурная реконструкция")}>
          <color attach="background" args={["#e2e1da"]}/>
          <hemisphereLight args={["#fff9e8", "#a6a99c", 2.05]}/>
          <directionalLight position={[-30, 55, 45]} intensity={2.7}/>
          <Suspense fallback={null}><Model orbitRef={orbit} onReady={onReady} onFail={onFail}/></Suspense>
        </Canvas>
      </RenderBoundary>}
    </div>
    <div className={s.viewerControls}>
      <p role="status">{status === "ready" ? t("Drag to orbit · Pinch or scroll to zoom", "Вращайте пальцем или мышью · Сведите пальцы для масштаба") :
        status === "failed" ? t("Still view · 3D is unavailable on this device", "Статичный вид · 3D недоступно на этом устройстве") :
          t("Loading building…", "Загружаем модель…")}</p>
      {status === "ready" && <div>{[1, -1].map(direction => <button key={direction}
        aria-label={direction === 1 ? t("Rotate left","Повернуть влево") : t("Rotate right","Повернуть вправо")}
        onClick={() => { orbit.current?.rotateLeft(direction * Math.PI / 12); orbit.current?.update(); }}>
        {direction === 1 ? <RotateCcw size={17}/> : <RotateCw size={17}/>}
      </button>)}</div>}
    </div>
  </>;
}

