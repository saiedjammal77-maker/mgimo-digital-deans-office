import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const sharp=createRequire(require.resolve("next/package.json"))("sharp");
for(const width of [640,1280,2048]){
  const base="public/campus-photo/mgimo-hero-"+width;
  const {data,info}=await sharp(base+".webp").ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const {height}=info, visited=new Uint8Array(width*height),queue=new Int32Array(width*height);
  let front=0,back=0;
  function add(pixel){
    if(visited[pixel])return;
    visited[pixel]=1;
    const i=pixel*4;
    if(data[i+2]-data[i]>24&&data[i+2]-data[i+1]>7&&data[i+1]>99){
      data[i+3]=0;queue[back++]=pixel;
    }
  }
  for(let x=0;x<width;x++)add(x);
  while(front<back){
    const pos=queue[front++],x=pos%width;
    if(x>0)add(pos-1);if(x<width-1)add(pos+1);
    if(pos>=width)add(pos-width);if(pos+width<width*height)add(pos+width);
  }
  await sharp(data,{raw:{width,height,channels:4}}).webp({quality:88}).toFile(base+"-facade.webp");
}
