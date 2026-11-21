"use client";
import { Canvas, useLoader, useThree } from "@react-three/fiber";
import { TextureLoader } from "three";
import { Suspense } from "react";
const vertex=`varying vec3 sphere;void main(){sphere=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const fragment=`uniform sampler2D cartography;uniform float yaw;uniform float pitch;varying vec3 sphere;
void main(){vec3 p=normalize(sphere);float roll=-.13;float h=p.x*cos(roll)+p.y*sin(roll);float v=-p.x*sin(roll)+p.y*cos(roll);float wy=v*cos(pitch)+p.z*sin(pitch);float wz=-v*sin(pitch)+p.z*cos(pitch);vec2 coords=vec2(fract(.5+(atan(h,wz)+yaw)/6.2831853),.5+asin(clamp(wy,-1.,1.))/3.14159265);vec3 base=texture2D(cartography,coords).rgb;float sun=max(0.,dot(p,vec3(-.36,.76,.54)));float edge=pow(1.-max(0.,p.z),3.2);gl_FragColor=vec4(base*(.43+.83*sun)+vec3(.54,.405,.624)*edge+vec3(.49,.369,.659)*(.34*pow(sun,17.)),1.);}`;
function Earth({yaw,pitch}:{yaw:number,pitch:number}){
  const map=useLoader(TextureLoader,"/atlas/engraved-world.webp");
  const {viewport}=useThree();
  return <mesh scale={Math.min(viewport.width,viewport.height)*.497}><sphereGeometry args={[1,128,96]}/><shaderMaterial vertexShader={vertex} fragmentShader={fragment} uniforms={{cartography:{value:map},yaw:{value:yaw},pitch:{value:pitch}}}/></mesh>
}
export default function WorldCanvas({yaw,pitch,onFail}:{yaw:number,pitch:number,onFail:()=>void}){
  return <Canvas orthographic camera={{position:[0,0,4],near:.1,far:20,zoom:100}} dpr={[1,1.8]} frameloop="demand" gl={{alpha:true,antialias:true,powerPreference:"low-power"}} onCreated={({gl})=>gl.domElement.addEventListener("webglcontextlost",onFail,{once:true})}><Suspense fallback={null}><Earth yaw={yaw} pitch={pitch}/></Suspense></Canvas>
}
