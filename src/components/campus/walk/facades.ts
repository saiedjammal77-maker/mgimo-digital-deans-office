import * as T from "three";
import { grounds, canStand } from "./world";

export function architecturalDetails(kit:T.Group) {
  kit.updateMatrixWorld(true);
  const group=new T.Group(), regions:{group:T.Group;box:T.Box3}[]=[];
  const local=new T.Object3D(), matrix=new T.Matrix4();
  function instances(name:string,placements:T.Matrix4[],parent:T.Object3D) {
    if(!placements.length)return;
    kit.getObjectByName(name)?.traverse(node=>{
      if(!(node instanceof T.Mesh)) return;
      const batch=new T.InstancedMesh(node.geometry,node.material,placements.length);
      placements.forEach((p,i)=>batch.setMatrixAt(i,matrix.multiplyMatrices(p,node.matrixWorld)));
      batch.castShadow=true;batch.receiveShadow=true;batch.computeBoundingSphere();parent.add(batch);
    });
  }
  for(const b of grounds.buildings) {
    if(b.id==="48902461")continue;
    const style=b.id==="52885598"?"Glazed":["549610279","48902458"].includes(b.id)?"Residence":
      ["48902413","48902454"].includes(b.id)?"Sports":"Academic";
    const wall:T.Matrix4[]=[],contrast:T.Matrix4[]=[],balconies:T.Matrix4[]=[],caps:T.Matrix4[]=[],doors:T.Matrix4[]=[],seats:T.Matrix4[]=[];
    let longest=0;
    for(const ring of [b.outline,...b.holes]) {
      const signed=ring.slice(1).reduce((sum,[x,z],i)=>sum+ring[i][0]*z-x*ring[i][1],0);
      const side=(signed>0?1:-1)*(ring===b.outline?1:-1);
      for(let i=1;i<ring.length;i++) {
        const [x,z]=ring[i-1],[a,d]=ring[i];
        const len=Math.hypot(a-x,d-z);
        if(len<2.1)continue;
        const nx=(d-z)/len*side,nz=(x-a)/len*side;
        const bays=Math.max(1,Math.round(len/(style==="Sports"?4.6:3.6)));
        local.rotation.set(0,Math.atan2(nx,nz),0);
        local.scale.set(len/bays/3.3,1,1);
        for(let j=0;j<bays;j++) {
          const u=(j+.5)/bays;
          for(let floor=0;floor<b.floors;floor++) {
            local.position.set(x+(a-x)*u+nx*.035,floor*3.45,z+(d-z)*u+nz*.035);
            local.updateMatrix();
            const stoneBay=style==="Glazed" && (j%7===0 || floor===b.floors-1);
            (stoneBay?contrast:wall).push(local.matrix.clone());
            if(style==="Residence" && floor>0 && (j%5===2 || j===0))balconies.push(local.matrix.clone());
          }
          local.position.y=b.floors*3.45;local.updateMatrix();caps.push(local.matrix.clone());
        }
        if(len>longest && ring===b.outline) {
          const cx=(x+a)/2,cz=(z+d)/2;
          if(!canStand(cx+nx*2,cz+nz*2))continue;
          longest=len;doors.length=0;seats.length=0;
          local.scale.set(1,1,1);local.position.set(cx+nx*.45,0,cz+nz*.45);
          local.updateMatrix();doors.push(local.matrix.clone());
          for(const sign of [-1,1]) {
            const px=cx+nx*1.15+sign*(a-x)/len*5,pz=cz+nz*1.15+sign*(d-z)/len*5;
            if(canStand(px,pz)){local.position.set(px,0,pz);local.updateMatrix();seats.push(local.matrix.clone());}
          }
        }
      }
    }
    const bays=new T.Group();instances(style,wall,bays);instances("Academic",contrast,bays);
    instances("Parapet",caps,bays);instances("Balcony",balconies,bays);instances("Entrance",doors,bays);instances("Bench",seats,bays);
    const box=new T.Box3().setFromPoints(b.outline.map(([x,z])=>new T.Vector3(x,0,z)));
    regions.push({group:bays,box});group.add(bays);
  }
  const eye=new T.Vector3();
  return {group,update(x:number,z:number,distance:number){
    eye.set(x,0,z);for(const region of regions)region.group.visible=region.box.distanceToPoint(eye)<distance;
  }};
}
