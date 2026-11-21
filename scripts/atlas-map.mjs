import {createRequire} from "node:module";
import {mkdirSync,readFileSync} from "node:fs";
const require=createRequire(import.meta.url);
const sharp=createRequire(require.resolve("next/package.json"))("sharp");
const topo=require("world-atlas/countries-110m.json");
const [scaleX,scaleY]=topo.transform.scale,[offsetX,offsetY]=topo.transform.translate;
const width=2048,height=1024,rad=Math.PI/180;
const arcs=topo.arcs.map(arc=>{let x=0,y=0;return arc.map(([dx,dy])=>[((x+=dx)*scaleX+offsetX+180)/360*width,(90-((y+=dy)*scaleY+offsetY))/180*height])});
function polygon(ring){let line=[];for(const index of ring){const arc=index<0?[...arcs[~index]].reverse():arcs[index];line=line.concat(arc.slice(line.length?1:0))}return "M"+line.map(([x,y])=>x.toFixed(2)+" "+y.toFixed(2)).join("L")+"Z"}
const country=topo.objects.countries.geometries.map((g,i)=>'<path fill="'+["#605166","#5d5169","#64576a","#594c61","#645769"][i%5]+'" stroke="#302d41" stroke-width="1.45" d="'+(g.type==="MultiPolygon"?g.arcs.flat(1):g.arcs).map(polygon).join("")+'"/>').join("");
const land=topo.objects.land.geometries[0].arcs.flat(1).map(polygon).join("");
let grid="",fine="";
for(let lon=-180;lon<180;lon+=10){const x=(lon+180)/360*width;grid+='M'+x+' 0V1024';}
for(let lat=-80;lat<=80;lat+=10){const y=(90-lat)/180*height;grid+='M0 '+y+'H2048';}
for(let lat=-79;lat<80;lat+=2){const y=(90-lat)/180*height;fine+='M0 '+y+'H2048';}
const city=(lon,lat)=>'translate('+((lon+180)/360*width)+' '+((90-lat)/180*height)+')';
const texture='<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="1024"><defs><pattern id="dots" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="1.7" cy="1.7" r=".88" fill="#e6cbbb" opacity=".86"/></pattern><pattern id="engrave" width="11" height="11" patternUnits="userSpaceOnUse" patternTransform="rotate(32)"><path d="M1 0V11" stroke="#c8badb" stroke-width=".65" opacity=".6"/></pattern></defs><rect width="100%" height="100%" fill="#28283d"/><path d="'+fine+'" fill="none" stroke="#b6a0c8" opacity=".14" stroke-width=".85"/>'+country+'<path d="'+land+'" fill="url(#dots)" stroke="#cdbfae" stroke-width=".98" opacity=".85"/><path d="'+land+'" fill="url(#engrave)"/><path d="'+grid+'" fill="none" stroke="#b6a0be" stroke-width="1.4" opacity=".46"/><g transform="'+city(37.6176,55.7558)+'"><circle r="8" fill="#ffdf9b" opacity=".24"/><circle r="5.7" fill="none" stroke="#ffda90" stroke-width="1.6"/><circle r="2.8" fill="#fff4c5"/></g></svg>';
mkdirSync("public/atlas",{recursive:true});
const {data}=await sharp(Buffer.from(texture)).removeAlpha().raw().toBuffer({resolveWithObject:true});
await sharp(data,{raw:{width,height,channels:3}}).webp({quality:91}).toFile("public/atlas/engraved-world.webp");
function sphereFrame(size,yaw,pitch=19*rad){
const rgba=Buffer.alloc(size*size*4),roll=-.13;
for(let row=0;row<size;row++)for(let col=0;col<size;col++){
  const x=(col+.5-size/2)/(size/2-2),y=-(row+.5-size/2)/(size/2-2),rr=x*x+y*y;if(rr>1)continue;
  const z=Math.sqrt(1-rr),horizontal=x*Math.cos(roll)+y*Math.sin(roll),vertical=-x*Math.sin(roll)+y*Math.cos(roll);
  const worldY=vertical*Math.cos(pitch)+z*Math.sin(pitch),worldZ=-vertical*Math.sin(pitch)+z*Math.cos(pitch);
  const u=(.5+(Math.atan2(horizontal,worldZ)+yaw)/(Math.PI*2)+1)%1,v=.5-Math.asin(worldY)/Math.PI,idx=(Math.min(height-1,Math.max(0,Math.floor(v*height)))*width+Math.floor(u*width))*3;
  const light=.43+.83*Math.max(0,-.36*x+.76*y+.54*z),edge=Math.pow(1-z,3.2),spec=Math.pow(Math.max(0,-.36*x+.76*y+.54*z),17)*.34;
  const shade=[data[idx]*light+edge*138+spec*125,data[idx+1]*light+edge*103+spec*94,data[idx+2]*light+edge*159+spec*168];
  const out=(row*size+col)*4;shade.forEach((n,i)=>rgba[out+i]=Math.min(255,n));rgba[out+3]=Math.min(255,Math.round((1-Math.sqrt(rr))*size*128));
}
return rgba;
}
const size=720;
for(const [name,lon,lat] of [["geneva",6.15,46.2],["new-york",-74,40.72]]){
  await sharp(sphereFrame(560,lon*rad,lat*.65*rad),{raw:{width:560,height:560,channels:4}}).webp({quality:90}).toFile("public/atlas/"+name+".webp");
}
await sharp(sphereFrame(size,43*rad),{raw:{width:size,height:size,channels:4}}).webp({quality:94,alphaQuality:100}).toFile("public/atlas/globe-poster.webp");
const icon=await sharp(readFileSync("public/compass.svg")).resize(64,64).png().toBuffer();
const directory=Buffer.alloc(22);directory.writeUInt16LE(1,2);directory.writeUInt16LE(1,4);directory[6]=64;directory[7]=64;directory.writeUInt16LE(1,10);directory.writeUInt16LE(32,12);directory.writeUInt32LE(icon.length,14);directory.writeUInt32LE(22,18);
const {writeFileSync}=await import("node:fs");writeFileSync("src/app/favicon.ico",Buffer.concat([directory,icon]));
if(process.argv.includes("--film")){
  const {spawn}=await import("node:child_process");const {once}=await import("node:events");
  const videoSize=384,frames=120,encoder=spawn("ffmpeg",["-hide_banner","-loglevel","error","-y","-f","rawvideo","-pix_fmt","rgba","-s",videoSize+"x"+videoSize,"-r","24","-i","pipe:0","-an","-c:v","libx264","-crf","24","-pix_fmt","yuv420p","-movflags","+faststart","public/atlas/mobile-orbit.mp4"],{stdio:["pipe","inherit","inherit"]});
  const done=once(encoder,"close");
  for(let frame=0;frame<frames;frame++)if(!encoder.stdin.write(sphereFrame(videoSize,rad*(43+7*Math.sin(frame/frames*Math.PI*2)))))await once(encoder.stdin,"drain");
  encoder.stdin.end();if((await done)[0]!==0)throw Error("Could not encode mobile orbit");
}
