import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { grounds, openGround, inside, type Pose } from "./world";
import { architecturalDetails } from "./facades";

function seededRandom() {
  let seed = 76;
  return () => { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; };
}
function surface(manager:T.LoadingManager) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 2048;
  const c = canvas.getContext("2d")!;
  const rand = seededRandom();
  c.scale(2,2); c.translate(160,160);
  c.fillStyle = "#8d9a70"; c.fillRect(-160,-160,1024,1024);
  for (let i=0;i<105000;i++) {
    c.fillStyle = i%2 ? "#67764d30" : "#c6c4a139";
    c.fillRect(rand()*1024-160,rand()*1024-160,rand()*3+.3,rand()*1.6+.3);
  }
  function trace(points: number[][]) {
    c.beginPath(); points.forEach(([x,z],i)=> i ? c.lineTo(x,z) : c.moveTo(x,z));
  }
  for (const field of grounds.fields) {
    trace(field.outline);
    c.fillStyle = field.sport === "running" ? "#aa7768" : field.sport === "tennis" ? "#719b89" : "#779766";
    c.fill(); c.strokeStyle="#e8e3c9"; c.lineWidth=.35; c.stroke();
    const p=field.outline;
    if (p.length===5) {
      const length=(a:number[],b:number[])=>Math.hypot(a[0]-b[0],a[1]-b[1]);
      const side=length(p[0],p[1])>length(p[1],p[2])?0:1;
      const mid=(i:number)=>[(p[i%4][0]+p[(i+1)%4][0])/2,(p[i%4][1]+p[(i+1)%4][1])/2];
      const [a,b]=mid(side),[x,z]=mid(side+2);
      c.beginPath();c.moveTo(a,b);c.lineTo(x,z);c.stroke();
      if(field.sport==="soccer"){c.beginPath();c.arc((a+x)/2,(b+z)/2,Math.min(9,Math.hypot(x-a,z-b)*.14),0,Math.PI*2);c.stroke();}
    }
  }
  c.lineJoin="round"; c.lineCap="round";
  // Keep a paved apron between the limestone walls and the lawn.
  for (const building of grounds.buildings) {
    for (const ring of [building.outline, ...building.holes]) {
      trace(ring); c.strokeStyle="#bbb8a9"; c.lineWidth=5.2; c.stroke();
    }
  }
  for (const road of grounds.roads) {
    trace(road.line); c.strokeStyle="#bcb8a8"; c.lineWidth=road.width+.65; c.stroke();
    c.strokeStyle=road.width>4 ? "#878888" : "#d1c7b4"; c.lineWidth=road.width; c.stroke();
  }
  const tex=new T.CanvasTexture(canvas); tex.colorSpace=T.SRGBColorSpace;
  tex.anisotropy=4;
  const mask=document.createElement("canvas");mask.width=mask.height=2048;
  const brush=mask.getContext("2d")!;brush.scale(2,2);brush.translate(160,160);
  brush.fillStyle="#000";brush.fillRect(-160,-160,1024,1024);
  brush.lineCap="round";brush.lineJoin="round";
  const stroke=(p:number[][])=>{brush.beginPath();p.forEach(([x,z],i)=>i?brush.lineTo(x,z):brush.moveTo(x,z));};
  for(const field of grounds.fields){stroke(field.outline);brush.fillStyle="#0000ff";brush.fill();}
  for (const building of grounds.buildings) {
    for (const ring of [building.outline, ...building.holes]) {
      stroke(ring); brush.strokeStyle="#00ff00"; brush.lineWidth=5.2; brush.stroke();
    }
  }
  for(const road of grounds.roads){stroke(road.line);brush.strokeStyle=road.width>4?"#ff0000":"#00ff00";brush.lineWidth=road.width;brush.stroke();}
  const maskMap=new T.CanvasTexture(mask);
  const loader=new T.TextureLoader(manager);
  const scans=["grass","asphalt","paving"].map(name=>{
    const tile=loader.load("/campus-map/materials/"+name+".webp");
    tile.wrapS=tile.wrapT=T.RepeatWrapping;tile.colorSpace=T.SRGBColorSpace;tile.anisotropy=4;return tile;
  });
  const material=new T.MeshStandardMaterial({map:tex,roughness:.94});
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,{campusMask:{value:maskMap},grassScan:{value:scans[0]},roadScan:{value:scans[1]},paverScan:{value:scans[2]}});
    shader.fragmentShader="uniform sampler2D campusMask, grassScan, roadScan, paverScan;\n"+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace("#include <map_fragment>",`
      #include <map_fragment>
      vec3 mask=texture2D(campusMask,vMapUv).rgb;
      vec2 metres=vMapUv*1024.0;
      vec3 lawn=texture2D(grassScan,metres/3.2).rgb;
      float grassVariation=texture2D(grassScan,metres/33.0).g;
      lawn *= mix(vec3(.56,.82,.49),vec3(.90,1.06,.74),clamp(grassVariation*3.0,0.0,1.0));
      vec3 detail=mix(lawn,texture2D(roadScan,metres/3.8).rgb,mask.r);
      detail=mix(detail,texture2D(paverScan,metres/3.4).rgb,mask.g);
      diffuseColor.rgb=mix(detail*(.90+.16*diffuseColor.g),diffuseColor.rgb,mask.b);
    `);
  };
  return {material,dispose(){maskMap.dispose();scans.forEach(t=>t.dispose());}};
}

function windowTexture() {
  const canvas=document.createElement("canvas"); canvas.width=128; canvas.height=128;
  const c=canvas.getContext("2d")!;
  c.fillStyle="#d3c8b0"; c.fillRect(0,0,128,128);
  c.fillStyle="#b8af9e"; c.fillRect(0,0,128,3); c.fillRect(0,0,2,128);
  const sky=c.createLinearGradient(0,18,0,93);
  sky.addColorStop(0,"#657984"); sky.addColorStop(.6,"#485e68"); sky.addColorStop(1,"#38474a");
  c.fillStyle="#99988e"; c.fillRect(11,17,106,82);
  c.fillStyle=sky; c.fillRect(15,21,98,73);
  c.fillStyle="#c2c2b4"; c.fillRect(61,20,4,75); c.fillRect(14,42,100,3);
  c.fillStyle="#eee7d7"; c.fillRect(9,97,110,4);
  const tex=new T.CanvasTexture(canvas); tex.colorSpace=T.SRGBColorSpace;
  tex.wrapS=tex.wrapT=T.RepeatWrapping; tex.anisotropy=4;
  return tex;
}


function block(outline: number[][], holes: number[][][], floors: number, wall: T.Material, roof: T.Material) {
  const vertices:number[]=[], uvs:number[]=[];
  const height=floors*3.45;
  for(const ring of [outline,...holes]) {
    for(let i=1;i<ring.length;i++) {
      const [x,z]=ring[i-1], [a,b]=ring[i];
      const bays=Math.max(1,Math.round(Math.hypot(a-x,b-z)/3.3));
      vertices.push(x,0,z,a,0,b,a,height,b, x,0,z,a,height,b,x,height,z);
      uvs.push(0,0,bays,0,bays,floors,0,0,bays,floors,0,floors);
    }
  }
  const geo=new T.BufferGeometry();
  geo.setAttribute("position",new T.Float32BufferAttribute(vertices,3));
  geo.setAttribute("uv",new T.Float32BufferAttribute(uvs,2)); geo.computeVertexNormals();
  const group=new T.Group(); group.add(new T.Mesh(geo,wall));
  const path=(p:number[][])=>p.slice(0,-1).map(([x,z])=>new T.Vector2(x,-z));
  const top=new T.Shape(path(outline)); holes.forEach(h=>top.holes.push(new T.Path(path(h))));
  const cap=new T.Mesh(new T.ShapeGeometry(top),roof);
  cap.rotation.x=-Math.PI/2; cap.position.y=height+.015; group.add(cap);
  return group;
}

function disposeObject(scene:T.Object3D) {
  const materials=new Set<T.Material>(), geometries=new Set<T.BufferGeometry>(), textures=new Set<T.Texture>();
  scene.traverse(obj=>{ if(obj instanceof T.Mesh) {
    geometries.add(obj.geometry);
    for(const mat of Array.isArray(obj.material)?obj.material:[obj.material]) materials.add(mat);
  }});
  materials.forEach(mat=>{ for(const value of Object.values(mat)) if(value instanceof T.Texture) textures.add(value); mat.dispose(); });
  geometries.forEach(geo=>geo.dispose()); textures.forEach(tex=>tex.dispose());
}

export function createLandscape(canvas: HTMLCanvasElement) {
  let dirty=true;
  const last={x:Infinity,z:Infinity,heading:Infinity,pitch:Infinity};
  const manager=new T.LoadingManager();
  manager.onProgress=()=>{dirty=true;};
  const loader=new T.TextureLoader(manager);
  const renderer=new T.WebGLRenderer({canvas, antialias:true, powerPreference:"low-power"});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
  renderer.shadowMap.enabled=true; renderer.shadowMap.autoUpdate=false;
  renderer.shadowMap.type=T.PCFShadowMap;
  const scene=new T.Scene(), camera=new T.PerspectiveCamera(70,1,.12,750);
  camera.rotation.order="YXZ";
  scene.background=new T.Color("#b9cbd3"); scene.fog=new T.FogExp2("#c2cbd0",.0027);
  scene.add(new T.HemisphereLight("#edf5ff","#9d997d",1.4));
  const sun=new T.DirectionalLight("#fff1d6",2.15);
  sun.position.set(125,310,330);sun.target.position.set(345,0,270);sun.castShadow=true;
  Object.assign(sun.shadow.camera,{left:-390,right:390,top:355,bottom:-355,near:1,far:840});
  sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.0006;sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun,sun.target);
  let disposed=false;
  const sky=loader.load("/campus-map/sky.jpg",texture=>{
    if(disposed) {texture.dispose();return;}
    texture.mapping=T.EquirectangularReflectionMapping; texture.colorSpace=T.SRGBColorSpace;
    scene.background=texture;scene.environment=texture;scene.environmentIntensity=.64;
  });
  const groundFinish=surface(manager);
  const ground=new T.Mesh(new T.PlaneGeometry(1024,1024),groundFinish.material);
  ground.rotation.x=-Math.PI/2;ground.position.set(352,-.03,352);ground.receiveShadow=true;scene.add(ground);
  const wall=new T.MeshStandardMaterial({map:windowTexture(),side:T.DoubleSide,roughness:.9});
  const roof=new T.MeshStandardMaterial({color:"#889393",side:T.DoubleSide});
  const enamel=new T.MeshStandardMaterial({color:"#f6f3da"});
  const beam=new T.CylinderGeometry(.075,.075,1,8);
  function post(a:T.Vector3,b:T.Vector3) {
    const obj=new T.Mesh(beam,enamel),axis=b.clone().sub(a);
    obj.position.copy(a).lerp(b,.5);obj.scale.y=axis.length();
    obj.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),axis.normalize());obj.castShadow=true;scene.add(obj);
  }
  for(const pitch of grounds.fields.filter(f=>f.sport==="soccer" && f.outline.length===5)) {
    const corners=pitch.outline.map(([x,z])=>new T.Vector3(x,0,z));
    const end=corners[0].distanceTo(corners[1])<corners[1].distanceTo(corners[2])?0:1;
    for(const j of [end,end+2]) {
      const a=corners[j%4],b=corners[(j+1)%4],mid=a.clone().lerp(b,.5);
      const offset=b.clone().sub(a).normalize().multiplyScalar(a.distanceTo(b)>32?3.66:2.4);
      const left=mid.clone().sub(offset),right=mid.clone().add(offset);
      const topLeft=left.clone().setY(2.44),topRight=right.clone().setY(2.44);
      post(left,topLeft);post(right,topRight);post(topLeft,topRight);
    }
  }
  const fallbackBuildings = new T.Group();
  scene.add(fallbackBuildings);
  for(const nearby of grounds.surroundings) fallbackBuildings.add(block(nearby.outline,[],nearby.floors,wall,roof));
  for(const building of grounds.buildings) {
    const shape=block(building.outline,building.holes,building.floors,wall,roof);
    shape.traverse(obj=>{obj.castShadow=true;});
    (building.id === "48902461" ? scene : fallbackBuildings).add(shape);
    if(building.id==="48902461") new GLTFLoader(manager).load("/campus-photo/vernadsky.glb",({scene:model})=>{
      if(disposed) { disposeObject(model); return; }
      model.position.set(541.95,0,438.1); model.rotation.y=1.044;
      model.scale.set(52/38,1,52/21);model.traverse(obj=>{obj.castShadow=true;});
      scene.add(model);shape.visible=false;renderer.shadowMap.needsUpdate=true;
    });
  }
  new GLTFLoader(manager).load("/campus-map/grounds-shell.glb", ({scene: campus}) => {
    if (disposed) { disposeObject(campus); return; }
    campus.traverse(object => {
      if (object instanceof T.Mesh) { object.castShadow = true; object.receiveShadow = true; }
    });
    scene.add(campus);
    fallbackBuildings.visible = false;
    renderer.shadowMap.needsUpdate = true;
    dirty = true;
  });
  let details:ReturnType<typeof architecturalDetails>|undefined;
  new GLTFLoader(manager).load("/campus-map/materials/architecture.glb",({scene:kit})=>{
    if(disposed){disposeObject(kit);return;}
    details=architecturalDetails(kit);scene.add(details.group);renderer.shadowMap.needsUpdate=true;
  });
  const rand=seededRandom(), trees:number[][]=[];
  for(let i=0;i<850;i++) {
    const x=rand()*700,z=rand()*595;
    if(!openGround(x,z) || grounds.fields.some(f=>inside(x,z,f.outline)) ||
      (x>558 && x<609 && z>429 && z<471)) continue;
    const nearRoad=grounds.roads.some(road=>road.line.some(([a,b],j)=>{
      if(!j) return false;
      const [c,d]=road.line[j-1], dx=a-c,dz=b-d;
      const t=Math.max(0,Math.min(1,((x-c)*dx+(z-d)*dz)/(dx*dx+dz*dz||1)));
      return Math.hypot(x-c-t*dx,z-d-t*dz)<road.width/2+1.6;
    }));
    if (Math.hypot(x-311,z-186)<8 || Math.hypot(x-303,z-202)<8) continue;
    if(!nearRoad) trees.push([x,z,3+rand()*3]);
  }
  const canopyTextures=[0,1,2].map(i=>{const tex=loader.load("/campus-map/materials/canopy-"+i+".webp");tex.colorSpace=T.SRGBColorSpace;return tex;});
  const crowns=canopyTextures.map((tex,i)=>new T.InstancedMesh(new T.PlaneGeometry(1,1),
    new T.MeshBasicMaterial({map:tex,alphaTest:.38,side:T.DoubleSide}),Math.floor((trees.length+2-i)/3)*2));
  const blob=new T.Object3D();
  trees.forEach(([x,z,h],i)=>{
    const orientation=rand()*Math.PI;
    for(let j=0;j<2;j++) {
      blob.position.set(x,h*.82,z);blob.scale.set(h*1.16,h*1.64,1);
      blob.rotation.y=orientation+j*Math.PI/2;blob.updateMatrix();crowns[i%3].setMatrixAt(Math.floor(i/3)*2+j,blob.matrix);
    }
  });
  crowns.forEach(crown=>{crown.castShadow=true;scene.add(crown);});
  // Place lighting along mapped paths. Skip short segments and keep poles off the path.
  const lights:number[][]=[];
  for(const road of grounds.roads) for(let j=1;j<road.line.length;j++) {
    const [a,b]=road.line[j-1],[x,z]=road.line[j],length=Math.hypot(x-a,z-b);
    if(length<20) continue;
    const px=(x+a)/2-(z-b)/length*(road.width/2+.65),pz=(z+b)/2+(x-a)/length*(road.width/2+.65);
    if(openGround(px,pz)&&!lights.some(([lx,lz])=>Math.hypot(lx-px,lz-pz)<15)) lights.push([px,pz]);
  }
  const fittings=new T.InstancedMesh(new T.BoxGeometry(),new T.MeshStandardMaterial({color:"#454e50"}),lights.length*2);
  lights.forEach(([x,z],i)=>{
    blob.rotation.set(0,0,0);blob.position.set(x,2.45,z);blob.scale.set(.115,4.9,.115);blob.updateMatrix();fittings.setMatrixAt(i*2,blob.matrix);
    blob.position.set(x+.34,4.9,z);blob.scale.set(.80,.13,.27);blob.updateMatrix();fittings.setMatrixAt(i*2+1,blob.matrix);
  });
  fittings.castShadow=true;scene.add(fittings);renderer.shadowMap.needsUpdate=true;
  return {
    resize(w:number,h:number) {renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();dirty=true;},
    draw(p:Pose) {
      if(!dirty&&last.x===p.x&&last.z===p.z&&last.heading===p.heading&&last.pitch===p.pitch)return;
      details?.update(p.x,p.z,canvas.clientWidth<700?90:145);camera.position.set(p.x,1.72,p.z);
      camera.rotation.set(p.pitch,-p.heading,0,"YXZ");renderer.render(scene,camera);
      Object.assign(last,p);dirty=false;
    },
    dispose() {disposed=true;disposeObject(scene);groundFinish.dispose();sky.dispose();sun.shadow.dispose();renderer.dispose();renderer.forceContextLoss();},
  };
}
