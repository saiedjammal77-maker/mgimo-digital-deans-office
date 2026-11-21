"""Blender 4.5: blender -b -P scripts/render-campus-grounds.py [-- local-map.osm [tree.gltf]]

Both cameras and the game export share the placement map's metre coordinates.
Building elevations use the photographed materials from the existing facade kit.
"""
import math
import random
import sys
import xml.etree.ElementTree as ET
import json
from pathlib import Path
from collections import defaultdict
import bpy
import bmesh
from mathutils import Vector, geometry

root=Path(__file__).resolve().parents[1]
public=root/"public/campus-map"
assets=public/"materials"
out=root/"artifacts"
out.mkdir(exist_ok=True)
data=json.loads((public/"grounds.json").read_text())
rand=random.Random(76)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene
scene.render.engine="CYCLES"
scene.cycles.samples=12
scene.cycles.use_denoising=True
scene.render.resolution_percentage=100
world=bpy.data.worlds.new("Moscow daylight")
scene.world=world
world.use_nodes=True
bg=world.node_tree.nodes.get("Background")
bg.inputs[0].default_value=(.76,.85,1,1)
bg.inputs[1].default_value=.78
bpy.ops.object.light_add(type="SUN")
sun=bpy.context.object
sun.rotation_euler=Vector((.55,.70,-.75)).to_track_quat("-Z","Y").to_euler()
sun.data.energy=3.1
sun.data.color=(1,.86,.68)
sun.data.angle=.047
bpy.ops.object.camera_add()
camera=bpy.context.object
scene.camera=camera
camera.data.type="ORTHO"
camera.data.clip_end=5000

# Bake the photographic, recessed window modules for distant buildings and the aerial views.
bpy.ops.import_scene.gltf(filepath=str(assets/"architecture.glb"))
modules={o.name:o for o in scene.objects if o.type=="EMPTY"}
for item in modules.values():
    for child in item.children_recursive: child.hide_render=True
styles=["Academic","Residence","Glazed","Sports"]
scene.render.resolution_x=330
scene.render.resolution_y=345
camera.location=(0,-7,1.725)
camera.rotation_euler=(math.pi/2,0,0)
camera.data.ortho_scale=3.45
scene.render.image_settings.file_format="JPEG"
for style in styles:
    for child in modules[style].children_recursive: child.hide_render=False
    scene.render.filepath=str(out/(style+".jpg"))
    bpy.ops.render.render(write_still=True)
    for child in modules[style].children_recursive: child.hide_render=True

def mat(name,rgb,texture=None,scale=1):
    m=bpy.data.materials.new(name)
    m.use_nodes=True
    n=m.node_tree.nodes;links=m.node_tree.links;p=n.get("Principled BSDF")
    p.inputs["Base Color"].default_value=(*rgb,1);p.inputs["Roughness"].default_value=.82
    if texture:
        image=n.new("ShaderNodeTexImage");image.image=bpy.data.images.load(str(texture),check_existing=True)
        links.new(image.outputs["Color"],p.inputs[0])
        if scale!=1:
            xyz=n.new("ShaderNodeTexCoord");v=n.new("ShaderNodeVectorMath");v.operation="SCALE"
            v.inputs["Scale"].default_value=scale
            links.new(xyz.outputs["Object"],v.inputs[0]);links.new(v.outputs[0],image.inputs[0])
    return m

facades={s:mat(s+" elevation",(1,1,1),out/(s+".jpg")) for s in styles}
roof=mat("Bituminous roof",(.22,.235,.235))
coping=mat("Zinc coping",(.56,.57,.53))
vent=mat("Metal ventilation cover",(.39,.40,.39))
grass=mat("Lawn",(.3,.4,.1),assets/"grass.webp",.22)
# Vary the lawn at the scale of mowing and soil patches as well as individual blades.
nodes=grass.node_tree.nodes
links=grass.node_tree.links
noise=nodes.new("ShaderNodeTexNoise")
noise.inputs["Scale"].default_value=.027
links.new(nodes.get("Texture Coordinate").outputs["Object"],noise.inputs["Vector"])
tones=nodes.new("ShaderNodeValToRGB")
tones.color_ramp.elements[0].color=(.39,.64,.27,1)
tones.color_ramp.elements[1].color=(.61,.86,.41,1)
links.new(noise.outputs[0],tones.inputs[0])
tint=nodes.new("ShaderNodeMixRGB")
tint.blend_type="MULTIPLY";tint.inputs[0].default_value=.76
links.new(nodes.get("Image Texture").outputs[0],tint.inputs[1]);links.new(tones.outputs[0],tint.inputs[2])
links.new(tint.outputs[0],nodes.get("Principled BSDF").inputs[0])
asphalt=mat("Asphalt",(.16,.16,.16),assets/"asphalt.webp",.2)
pavers=mat("Paving",(.45,.46,.43),assets/"paving.webp",.28)
court=mat("Court green",(.13,.27,.18));track=mat("Track rubber",(.38,.16,.095));line=mat("Line marking",(.82,.83,.73))
leaf=[mat("Summer canopy "+str(i),rgb) for i,rgb in enumerate([(.064,.128,.042),(.105,.16,.058),(.14,.185,.067),(.087,.15,.061)])]
bark=mat("Tree trunks",(.115,.085,.061))

# Group geometry by material. The exported shell has a small, fixed draw-call count.
batches=defaultdict(lambda:[[],[],[]])
def face(m,points,uv=None):
    vs,fs,ts=batches[m];start=len(vs);vs.extend(points);fs.append(tuple(range(start,start+len(points))))
    ts.extend(uv if uv is not None else [(p[0]*.2,p[1]*.2) for p in points])
def flush():
    result=[]
    for m,(vs,fs,ts) in batches.items():
        me=bpy.data.meshes.new(m.name);me.from_pydata(vs,[],fs);me.update()
        ob=bpy.data.objects.new(m.name,me);scene.collection.objects.link(ob);me.materials.append(m)
        layer=me.uv_layers.new()
        for lp in me.loops:layer.data[lp.index].uv=ts[lp.vertex_index]
        result.append(ob)
    batches.clear();return result
def in_ring(x,z,r):
    return sum((b>z)!=(d>z) and x<(c-a)*(z-b)/(d-b)+a for (a,b),(c,d) in zip(r,r[1:]))%2
def cap(m,rings,h):
    verts=[];edges=[]
    for ring in rings:
        start=len(verts);verts.extend(Vector((x,-z)) for x,z in ring[:-1])
        count=len(verts)-start;edges.extend((start+i,start+(i+1)%count) for i in range(count))
    vs,_,tris,*_=geometry.delaunay_2d_cdt(verts,edges,[],0,.001)
    for tri in tris:
        cx=sum(vs[i].x for i in tri)/len(tri);cz=-sum(vs[i].y for i in tri)/len(tri)
        if in_ring(cx,cz,rings[0]) and not any(in_ring(cx,cz,hole) for hole in rings[1:]):
            face(m,[(vs[i].x,vs[i].y,h) for i in tri])
def ribbon(m,a,b,width,h):
    x,z=a;u,v=b;length=math.hypot(u-x,v-z)
    if length<.01:return
    dx=-(v-z)*width*.5/length;dz=(u-x)*width*.5/length
    face(m,[(x+dx,-z-dz,h),(u+dx,-v-dz,h),(u-dx,-v+dz,h),(x-dx,-z+dz,h)])
def box(m,x,y,z,w,d,h):
    pts=[(x+i*w/2,y+j*d/2,z+k*h) for k in (0,1) for j in (-1,1) for i in (-1,1)]
    for ids in [(4,5,7,6),(0,1,5,4),(1,3,7,5),(3,2,6,7),(2,0,4,6)]:
        face(m,[pts[i] for i in ids])

for b in data["buildings"]+data["surroundings"]:
    id=b.get("id","")
    if id=="48902461":continue
    floors=b["floors"];h=floors*3.45
    style="Glazed" if id=="52885598" else "Sports" if id in ["48902413","48902454"] else "Residence" if floors>7 or id in ["549610279","48902458"] or not id else "Academic"
    rings=[b["outline"],*b.get("holes",[])]
    cap(roof,rings,h)
    for ring in rings:
        area=sum(a*d-c*z for (a,z),(c,d) in zip(ring,ring[1:]))
        for a,c in zip(ring,ring[1:]):
            if (area>0)==(ring is rings[0]):a,c=c,a
            x,z=a;u,v=c;length=math.hypot(x-u,z-v);bays=max(1,round(length/(4.6 if style=="Sports" else 3.6)))
            face(facades[style],[(x,-z,0),(u,-v,0),(u,-v,h),(x,-z,h)],[(0,0),(bays,0),(bays,floors),(0,floors)])
            face(coping,[(x,-z,h),(u,-v,h),(u,-v,h+.35),(x,-z,h+.35)])
            ribbon(coping,a,c,.50,h+.35)
    r=rings[0];xs=[p[0] for p in r];zs=[p[1] for p in r]
    for _ in range(min(12,max(1,int((max(xs)-min(xs))*(max(zs)-min(zs))/350)))):
        x=rand.uniform(min(xs),max(xs));z=rand.uniform(min(zs),max(zs))
        if all(in_ring(x+i,z+j,r) and not any(in_ring(x+i,z+j,hole) for hole in rings[1:]) for i in (-2,2) for j in (-2,2)):
            box(vent,x,-z,h,2.2,1.5,.72);box(coping,x,-z,h+.72,2.28,1.59,.09)
shell=flush()
bpy.ops.object.select_all(action="DESELECT")
for o in shell:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(public/"grounds-shell.glb"),use_selection=True,export_format="GLB")

# Attach the existing photo-aligned conference hall at the same transform as the game.
bpy.ops.import_scene.gltf(filepath=str(root/"public/campus-photo/vernadsky.glb"))
hall=bpy.data.objects.new("Conference hall · Block A",None);scene.collection.objects.link(hall)
for ob in list(bpy.context.selected_objects):
    if ob.parent is None: ob.parent=hall
hall.location=(541.95,-438.1,0);hall.rotation_euler.z=1.044;hall.scale=(52/38,52/21,1)
face(grass,[(-1500,1500,-.15),(-1500,-2000,-.15),(2000,-2000,-.15),(2000,1500,-.15)])
for f in data["fields"]:
    p=f["outline"];is_track=f["sport"]=="running";h=.01 if is_track else .035
    cap(track if is_track else court,[p],h)
    for a,b in zip(p,p[1:]):ribbon(line,a,b,.22,h+.012)
    if len(p)==5:
        a,b,c,d=p[:4];mid=lambda f,g:[(i+j)/2 for i,j in zip(f,g)]
        ribbon(line,mid(a,b),mid(c,d),.18,h+.014)
extra=[]
if "--" in sys.argv and len(sys.argv)>sys.argv.index("--")+1:
    xml=ET.parse(sys.argv[sys.argv.index("--")+1]).getroot()
    origin=(37.4818969,55.6752791);scale=111320*math.cos(math.radians(origin[1]))
    nodes={n.get("id"):((float(n.get("lon"))-origin[0])*scale,(origin[1]-float(n.get("lat")))*111320) for n in xml.findall("node")}
    for w in xml.findall("way"):
        t={v.get("k"):v.get("v") for v in w.findall("tag")}
        if t.get("highway") not in ["primary","secondary","tertiary","residential","service","footway","path"]:continue
        p=[nodes[n.get("ref")] for n in w.findall("nd")]
        if not any(-650<x<1350 and -620<z<1260 for x,z in p):continue
        width={"primary":10,"secondary":8,"tertiary":7,"residential":5.5,"service":4.2}.get(t["highway"],1.8)
        extra.append({"line":p,"width":width})
for i,road in enumerate(extra+data["roads"]):
    h=(.055 if i<len(extra) else .085) + .00007*(i%193)
    for j,(a,b) in enumerate(zip(road["line"],road["line"][1:])):
        ribbon(asphalt if road["width"]>4 else pavers,a,b,road["width"],h+j*.000008)
flush()

# Three-dimensional crowns stay legible from both overhead and street-facing angles.
crownmesh=bpy.data.meshes.new("Linden crown")
bm=bmesh.new();bmesh.ops.create_icosphere(bm,subdivisions=2,radius=1)
for v in bm.verts:v.co*=rand.uniform(.88,1.13)
bm.to_mesh(crownmesh);bm.free()
for m in leaf:crownmesh.materials.append(m)
for poly in crownmesh.polygons:poly.material_index=rand.randrange(4);poly.use_smooth=True
rings=[(b["outline"],b.get("holes",[])) for b in data["buildings"]+data["surroundings"]]
def near_path(x,z):
    for a,b,r in segments:
        u,v=a;c,d=b
        if x<min(u,c)-r or x>max(u,c)+r or z<min(v,d)-r or z>max(v,d)+r:continue
        dx=c-u;dz=d-v;q=min(1,max(0,((x-u)*dx+(z-v)*dz)/(dx*dx+dz*dz or 1)))
        if math.hypot(x-u-dx*q,z-v-dz*q)<r:return True
    return False
segments=[(a,b,r["width"]/2+1.4) for r in extra+data["roads"] for a,b in zip(r["line"],r["line"][1:])]
tree_collection=None
if "--" in sys.argv and len(sys.argv)>sys.argv.index("--")+2:
    bpy.ops.import_scene.gltf(filepath=sys.argv[sys.argv.index("--")+2])
    imported=list(bpy.context.selected_objects)
    points=[o.matrix_world@Vector(c) for o in imported if o.type=="MESH" for c in o.bound_box]
    tree_height=max(v.z for v in points)-min(v.z for v in points)
    tree_collection=bpy.data.collections.new("Poly Haven · Tree Small 02")
    tree_collection.instance_offset=Vector(((min(v.x for v in points)+max(v.x for v in points))/2,
        (min(v.y for v in points)+max(v.y for v in points))/2,min(v.z for v in points)))
    for obj in imported:
        for collection in list(obj.users_collection):collection.objects.unlink(obj)
        tree_collection.objects.link(obj)
for _ in range(2400):
    x=rand.uniform(-170,850);z=rand.uniform(-150,740)
    if any(in_ring(x,z,r) and not any(in_ring(x,z,h) for h in holes) for r,holes in rings):continue
    if any(in_ring(x,z,f["outline"]) for f in data["fields"]) or near_path(x,z):continue
    h=rand.uniform(6,13)
    if tree_collection:
        ob=bpy.data.objects.new("Campus tree",None);scene.collection.objects.link(ob)
        ob.instance_type="COLLECTION";ob.instance_collection=tree_collection
        ob.location=(x,-z,0);ob.rotation_euler.z=rand.random()*math.tau
        ob.scale=(h/tree_height,)*3
        continue
    box(bark,x,-z,0,.30,.32,h*.74)
    for j in range(4):
        ob=bpy.data.objects.new("Deciduous canopy",crownmesh);scene.collection.objects.link(ob)
        ob.location=(x+rand.uniform(-1.35,1.35),-z+rand.uniform(-1.35,1.35),h*(.61+.08*j))
        ob.scale=(h*.27,h*.28,h*.29);ob.rotation_euler.z=rand.random()*6.28
flush()
scene.render.image_settings.file_format="PNG"
scene.cycles.samples=20
scene.render.resolution_x=2000;scene.render.resolution_y=1200
target=Vector((345,-285,4));camera.location=target+Vector((-440,-650,630))
camera.rotation_euler=(target-camera.location).to_track_quat("-Z","Y").to_euler()
bpy.context.view_layer.update()
local=[camera.matrix_world.inverted()@Vector((x,-z,0)) for x,z in data["boundary"]]
lo=Vector((min(p.x for p in local),min(p.y for p in local),0));hi=Vector((max(p.x for p in local),max(p.y for p in local),0))
camera.location+=camera.rotation_euler.to_quaternion()@((lo+hi)/2)
camera.data.ortho_scale=max(hi.x-lo.x,(hi.y-lo.y)*2000/1200)*1.14
scene.render.filepath="//campus-aerial.png"
bpy.context.preferences.filepaths.save_version=0
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(out/"vernadsky-grounds.blend"),compress=True)
bpy.ops.render.render(write_still=True)
# Orthographic camera matches the SVG viewBox -20 -22 732 640 exactly.
camera.location=(346,-298,900);camera.rotation_euler=(0,0,0);camera.data.ortho_scale=732
scene.render.resolution_x=1464;scene.render.resolution_y=1280
scene.render.filepath=str(out/"campus-overhead.png");bpy.ops.render.render(write_still=True)
