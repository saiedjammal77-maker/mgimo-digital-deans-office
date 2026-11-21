// node scripts/prepare-walk-assets.mjs /path/to/blender /path/to/temporary-cache
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [blender, cache] = process.argv.slice(2);
if (!blender || !cache) throw new Error("Pass the Blender executable and an asset cache directory.");
const out = path.join(root, "public/campus-map/materials");
await Promise.all([mkdir(out,{recursive:true}),mkdir(cache,{recursive:true})]);
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("next/package.json"))("sharp");

async function request(url) {
  const response = await fetch(url,{signal:AbortSignal.timeout(180000)});
  if (!response.ok) throw new Error(response.status + " " + url);
  return response;
}
async function download(record, file) {
  const valid = data => createHash("md5").update(data).digest("hex") === record.md5;
  try { if(valid(await readFile(file))) return file; } catch {}
  if(new URL(record.url).hostname!=="dl.polyhaven.org") throw new Error("Unexpected asset host");
  const bytes = Buffer.from(await (await request(record.url)).arrayBuffer());
  if (!valid(bytes)) throw new Error("Asset checksum mismatch: "+file);
  await mkdir(path.dirname(file),{recursive:true});await writeFile(file,bytes);return file;
}
async function listing(id) {return (await request("https://api.polyhaven.com/files/"+id)).json();}
for (const [id,name] of [["grass_ground","grass"],["asphalt_04","asphalt"],["concrete_pavement_02","paving"]]) {
  const files=await listing(id);
  const record=(files.Diffuse||files.diffuse||files.diff)["1k"];
  const input=await download(record.jpg||record.png,path.join(cache,name+".source"));
  await sharp(input).resize(768,768).webp({quality:83}).toFile(path.join(out,name+".webp"));
}
const master=(await listing("tree_small_02")).gltf["1k"].gltf;
const tree=path.join(cache,"tree","tree.gltf");
await download(master,tree);
await Promise.all(Object.entries(master.include).map(([name,item])=>{
  const target=path.resolve(path.dirname(tree),name);
  if(!target.startsWith(path.dirname(tree)+path.sep))throw new Error("Invalid asset path");
  return download(item,target);
}));
await sharp(path.join(root,"public/campus-photo/Mgimo.jpg")).extract({left:415,top:720,width:220,height:80}).jpeg({quality:90}).toFile(path.join(cache,"stone.jpg"));
for(const [i,left] of [574,819,977,345].entries()) {
  await sharp(path.join(root,"public/campus-photo/Mgimo.jpg")).extract({left,top:i===3?845:829,width:53,height:32})
    .resize(158,96).modulate({brightness:1.28,saturation:.78}).jpeg({quality:90}).toFile(path.join(cache,"pane-"+i+".jpg"));
}
const result=spawnSync(blender,["-b","-t","6","--python-exit-code","1","-P",path.join(root,"scripts/bake-walk-kit.py"),"--",tree,cache,out],{stdio:"inherit"});
if(result.status!==0)throw new Error("Blender export failed");
for(const i of [0,1,2]) await sharp(path.join(cache,"canopy-"+i+".png")).trim({threshold:3}).resize(512,640,{fit:"contain",position:"bottom",background:"#00000000"}).webp({quality:87,alphaQuality:96}).toFile(path.join(out,"canopy-"+i+".webp"));
