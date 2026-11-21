import grounds from "../../../../public/campus-map/grounds.json";

export { grounds };
export type Pose = { x: number; z: number; heading: number; pitch: number };
export const stops = [
  { en: "Conference hall", ru: "Конференц-зал", x: 607, z: 459, towards: [523, 430] },
  { en: "Main courtyard", ru: "Главный двор", x: 407, z: 389, towards: [424, 395] },
  { en: "New academic building", ru: "Новый учебный корпус", x: 311, z: 186, towards: [298, 219] },
  { en: "Sports centre", ru: "Спортцентр", x: 158, z: 313, towards: [177, 284] },
  { en: "Playing fields", ru: "Спортивные поля", x: 98, z: 208, towards: [67, 140] },
  { en: "Residence grounds", ru: "У общежитий", x: 152, z: 175, towards: [180, 163] },
];
export function spawn(index: number): Pose {
  const {x,z,towards} = stops[index];
  return { x,z,heading: Math.atan2(towards[0]-x,z-towards[1]),pitch: .065 };
}
export function inside(x: number, z: number, ring: number[][]) {
  let hit = false;
  for (let i = 1; i < ring.length; i++) {
    const [a,b] = ring[i-1], [c,d] = ring[i];
    if ((b > z) !== (d > z) && x < (c-a)*(z-b)/(d-b)+a) hit = !hit;
  }
  return hit;
}
const buildings = grounds.buildings.map(b => {
  const xs = b.outline.map(p => p[0]), zs = b.outline.map(p => p[1]);
  return { ...b, left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...zs), bottom: Math.max(...zs) };
});
export function openGround(x: number, z: number) {
  if (!inside(x,z,grounds.boundary)) return false;
  return !buildings.some(b => x >= b.left && x <= b.right && z >= b.top && z <= b.bottom &&
    inside(x,z,b.outline) && !b.holes.some(h => inside(x,z,h)));
}
export function canStand(x: number, z: number) {
  const r = .45;
  return openGround(x-r,z-r) && openGround(x+r,z+r) && openGround(x-r,z+r) && openGround(x+r,z-r);
}
export function step(p: Pose, keys: Set<string>, dt: number) {
  const axis = (a: string, b: string) => Number(keys.has(a))-Number(keys.has(b));
  p.heading += axis("ArrowRight","ArrowLeft") * 1.7 * dt;
  const forward = Number(keys.has("KeyW") || keys.has("ArrowUp")) - Number(keys.has("KeyS") || keys.has("ArrowDown"));
  const strafe = axis("KeyD","KeyA"), length = Math.hypot(strafe,forward);
  if (!length) return;
  const distance = (keys.has("ShiftLeft") || keys.has("ShiftRight") ? 8.4 : 4.2) * dt / length;
  const dx = (Math.sin(p.heading)*forward+Math.cos(p.heading)*strafe)*distance;
  const dz = (-Math.cos(p.heading)*forward+Math.sin(p.heading)*strafe)*distance;
  if (canStand(p.x+dx,p.z)) p.x+=dx;
  if (canStand(p.x,p.z+dz)) p.z+=dz;
}
