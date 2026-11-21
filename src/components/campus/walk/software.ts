import { grounds, type Pose } from "./world";

// A first-person perspective projection for devices without WebGL.
export function softwareView(canvas:HTMLCanvasElement) {
  const ctx=canvas.getContext("2d")!;
  const walls=grounds.buildings.flatMap(b=>[b.outline,...b.holes].flatMap(ring=>
    ring.slice(1).map(([x,z],i)=>({a:ring[i],b:[x,z],levels:b.floors}))));
  return {
    resize(w:number,h:number) {canvas.width=w;canvas.height=h;},
    draw(p:Pose) {
      const w=canvas.width,h=canvas.height, focal=h*.74, horizon=h/2+Math.tan(p.pitch)*focal;
      const sky=ctx.createLinearGradient(0,0,0,h); sky.addColorStop(0,"#799cb7");sky.addColorStop(1,"#dddeda");
      ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);ctx.fillStyle="#99a27f";ctx.fillRect(0,horizon,w,h);
      const sin=Math.sin(p.heading),cos=Math.cos(p.heading);
      const local=([x,z]:number[])=>[(x-p.x)*cos+(z-p.z)*sin,(x-p.x)*sin-(z-p.z)*cos];
      const project=(v:number[],y:number)=>[w/2+v[0]*focal/v[1],horizon+(1.72-y)*focal/v[1]];
      function clipped(u:number[],v:number[]) {
        if(u[1]<.25 && v[1]<.25) return null;
        function clip(a:number[],b:number[]) {
          if(a[1]>=.25) return a;
          return [a[0]+(b[0]-a[0])*(.25-a[1])/(b[1]-a[1]),.25];
        }
        return [clip(u,v),clip(v,u)];
      }
      function polygon(points:number[][],color:string) {
        ctx.fillStyle=color;ctx.beginPath();
        points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();
      }
      for(const road of grounds.roads) for(let j=1;j<road.line.length;j++) {
        const a=road.line[j-1],b=road.line[j];const seg=clipped(local(a),local(b));if(!seg) continue;
        const [u,v]=seg,half=road.width/2;
        polygon([project([u[0]-half,u[1]],0),project([v[0]-half,v[1]],0),
          project([v[0]+half,v[1]],0),project([u[0]+half,u[1]],0)],road.width>4?"#8a8982":"#c8c1ac");
      }
      const faces=walls.flatMap(edge=>{
        const seg=clipped(local(edge.a),local(edge.b));
        if(!seg) return [];
        const [a,b]=seg;
        if(Math.min(a[1],b[1])>420 || (a[0]<-a[1]*w/focal && b[0]<-b[1]*w/focal) ||
          (a[0]>a[1]*w/focal && b[0]>b[1]*w/focal)) return [];
        return [{a,b,count:edge.levels,distance:(a[1]+b[1])/2}];
      }).sort((a,b)=>b.distance-a.distance);
      for(const {a,b,count} of faces) {
        const band=(low:number,high:number,color:string)=>polygon([project(a,low),project(b,low),project(b,high),project(a,high)],color);
        band(0,count*3.45,"#c6bdab");for(let i=0;i<count;i++)band(i*3.45+.9,i*3.45+2.58,"#5e7480");
        band(count*3.45-.22,count*3.45,"#a9a59a");
      }
    },
    dispose() {},
  };
}
