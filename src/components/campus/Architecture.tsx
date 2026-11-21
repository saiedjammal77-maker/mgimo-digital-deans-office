import { useLayoutEffect, useRef } from "react";
import { Color, InstancedMesh, Object3D } from "three";
import type { ThreeEvent } from "@react-three/fiber";

type Solid = [x: number, y: number, z: number, width: number, height: number, depth: number, paint: string];
const stone = "#ecdfbe", glass = "#548397", roof = "#acbab9", shade = "#74847c";
const groups: Solid[][] = [[], [], [], []];
const [hall, library, sports, site] = groups;

// A low auditorium, a glazed reading-room tower, and a long-span natatorium.
function wing(parts: Solid[], x: number, z: number, w: number, d: number, floors: number) {
  const h = floors * 1.02;
  parts.push([x, h / 2, z, w, h, d, stone], [x, h + .09, z, w + .15, .18, d + .15, roof]);
  for (let level = 0; level < floors; level++) {
    const y = .54 + level * 1.02;
    parts.push([x, y, z, w + .025, .49, d + .025, glass]);
  }
  for (let offset = .4; offset < w; offset += .94) {
    parts.push([x - w / 2 + offset, h / 2, z, .095, h, d + .05, stone]);
  }
  for (let offset = .4; offset < d; offset += .94) {
    parts.push([x, h / 2, z - d / 2 + offset, w + .05, h, .095, stone]);
  }
}
wing(hall, -7, 4, 9, 5.6, 2);
hall.push([-7, 2.68, 3.9, 6.8, 1.1, 4.2, stone], [-7, 3.27, 3.9, 7, .12, 4.4, roof],
  [-7, 1.35, 7.35, 5.1, .2, 1.4, stone]);
for (const x of [-9.2, -7, -4.8]) hall.push([x, .65, 7.8, .14, 1.3, .14, shade]);
for (let step = 0; step < 3; step++) hall.push([-7, .06 * (3 - step), 7.4 + step * .5, 5.3, .12 * (3 - step), 1.4, stone]);

wing(library, 6, 3.5, 5.8, 4.6, 5);
wing(library, 10.3, 4.1, 2.8, 3.4, 2);
library.push([5.3, 5.4, 3.5, 3.5, .55, 2, roof]);
wing(sports, 8, -6.6, 11, 5.2, 2);
for (let x = 3.5; x < 13; x += 1.45) {
  sports.push([x, 2.35, -6.6, .7, .42, 4.7, "#bdd9d9"]);
}

site.push([0, -.52, 0, 33, .7, 23, "#9a9b88"], [0, -.13, 0, 33, .12, 23, "#c3c5a7"],
  [0, -.035, -.2, 32, .04, 2.1, "#e1d9c6"], [-.7, -.035, 1, 1.6, .04, 21, "#e1d9c6"],
  [0, -.035, 9.3, 32, .04, 1.4, "#ded6c5"], [-7, -.01, 5.3, 10, .04, 7, "#ded6c5"]);
wing(site, -7.8, -7.3, 12, 2.4, 4);
wing(site, -12.4, -4.1, 2.8, 4.2, 3);
wing(site, -3.2, -3.8, 2.8, 4.8, 3);
wing(site, -3.6, .55, 1.8, 4, 1);
const trees = [
  [-14, 1.5], [-14, 4.3], [-14, 7.1], [-11, 10.4], [-5, 10.4], [1, 10.4], [7, 10.4], [13, 10.4],
  [-9.5, -3.5], [-7.6, -3.2], [1, -8.5], [1, -5.4], [14.7, -3], [14.7, .1], [14.7, 3.2], [14.7, 6.3],
];
for (const [x,z] of trees) site.push([x,.45,z,.18,.9,.18,"#857967"]);

function Batch({ parts, round, onClick }: { parts: Solid[]; round?: boolean; onClick?: (e: ThreeEvent<MouseEvent>) => void }) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current!;
    const transform = new Object3D();
    const color = new Color();
    parts.forEach(([x,y,z,w,h,d,paint], index) => {
      transform.position.set(x,y,z);
      transform.scale.set(w,h,d);
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
      mesh.setColorAt(index, color.set(paint));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [parts]);
  return <instancedMesh ref={ref} args={[undefined, undefined, parts.length]} onClick={onClick}>
    {round ? <icosahedronGeometry args={[.5, 1]} /> : <boxGeometry />}
    <meshStandardMaterial roughness={.93} flatShading />
  </instancedMesh>;
}

const crowns: Solid[] = trees.map(([x,z], i) => [x,1.48,z,1.45,1.92,1.45,i % 2 ? "#729078" : "#859c76"]);
export function Architecture({ select }: { select: (index: number) => void }) {
  return <>
    <hemisphereLight args={["#fff7eb", "#d9cbb6", 2.15]} />
    <directionalLight position={[-13, 24, 10]} intensity={2.25} />
    <Batch parts={site} /><Batch parts={crowns} round />
    {groups.slice(0, 3).map((parts, i) => <Batch key={i} parts={parts} onClick={event => {
      event.stopPropagation();
      if (event.delta < 5) select(i);
    }} />)}
  </>;
}
