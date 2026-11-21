"""Build reusable architectural bays in Blender and bake the tree scan from three sides."""
import math
import sys
from collections import defaultdict
from pathlib import Path
import bpy
from mathutils import Vector

tree,cache,out=map(Path,sys.argv[sys.argv.index("--")+1:])
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene
def paint(name,rgb,metal=0,rough=.65):
    mat=bpy.data.materials.new(name)
    mat.diffuse_color=(*rgb,1)
    mat.use_nodes=True
    shader=mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value=(*rgb,1)
    shader.inputs["Metallic"].default_value=metal
    shader.inputs["Roughness"].default_value=rough
    return mat

stone=paint("Limestone",(.59,.55,.47))
image=stone.node_tree.nodes.new("ShaderNodeTexImage")
image.image=bpy.data.images.load(str(cache/"stone.jpg"))
stone.node_tree.links.new(image.outputs[0],stone.node_tree.nodes.get("Principled BSDF").inputs["Base Color"])
alloy=paint("Anodised metal",(.43,.47,.48),.7,.32)
seal=paint("Window reveal",(.065,.074,.077),.1)
slab=paint("Concrete edge",(.53,.52,.49))
white=paint("Porcelain cladding",(.77,.78,.74))
dark=paint("Vent louvre",(.19,.21,.22),.45)
timber=paint("Oiled slats",(.34,.195,.10))
glass=[paint("Reflective glass "+str(i),c,.70,.14) for i,c in enumerate([
    (.095,.18,.22),(.17,.26,.29),(.12,.205,.26),(.22,.28,.29)])]
for i,mat in enumerate(glass):
    sample=mat.node_tree.nodes.new("ShaderNodeTexImage")
    sample.image=bpy.data.images.load(str(cache/("pane-"+str(i)+".jpg")))
    mat.node_tree.links.new(sample.outputs[0],mat.node_tree.nodes.get("Principled BSDF").inputs["Base Color"])
parts=defaultdict(lambda:([],[]))
def box(mat,x,depth,z,w,d,h):
    # Local -Y faces outdoors. The GLB exporter converts Z-up to Three's Y-up.
    vertices,faces=parts[mat]
    first=len(vertices)
    for k in (-1,1):
        for j in (-1,1):
            for i in (-1,1):
                vertices.append((x+i*w/2,-depth+j*d/2,z+k*h/2))
    faces.extend(tuple(first+i for i in f) for f in [(0,2,3,1),(4,5,7,6),(0,1,5,4),(1,3,7,5),(3,2,6,7),(2,0,4,6)])

def store(name):
    parent=bpy.data.objects.new(name,None);scene.collection.objects.link(parent)
    for mat,(verts,faces) in parts.items():
        mesh=bpy.data.meshes.new(name+mat.name)
        mesh.from_pydata(verts,[],faces);mesh.update()
        obj=bpy.data.objects.new(mesh.name,mesh);scene.collection.objects.link(obj);obj.parent=parent
        mesh.materials.append(mat)
        uv=mesh.uv_layers.new()
        for poly in mesh.polygons:
            for n in poly.loop_indices:
                v=mesh.vertices[mesh.loops[n].vertex_index].co
                uv.data[n].uv=((v.x/3.3+.5) if abs(poly.normal.x)<.6 else v.y,v.z/3.45)
    parts.clear()

for name,left,right,bottom,top,face in [
    ("Academic",-.99,1.21,.85,2.78,stone),("Residence",-1.17,.91,.96,2.66,white),
    ("Glazed",-1.59,1.59,.17,3.31,alloy),("Sports",-1.40,1.38,1.17,2.98,slab)]:
    opening=right-left
    box(face,(-1.65+left)/2,.16,1.725,left+1.65,.27,3.43)
    box(face,(1.65+right)/2,.16,1.725,1.65-right,.27,3.43)
    box(face,(left+right)/2,.16,bottom/2,opening,.27,bottom)
    box(face,(left+right)/2,.16,(top+3.45)/2,opening,.27,3.45-top)
    box(seal,(left+right)/2,.06,(top+bottom)/2,opening,.09,top-bottom)
    count=3 if name in ("Sports","Glazed") else 2
    for j in range(count):
        x=left+(j+.5)*opening/count
        box(glass[j],x,.119,(top+bottom)/2,opening/count-.065,.032,top-bottom-.10)
    for j in range(count+1):
        box(alloy,left+j*opening/count,.154,(top+bottom)/2,.045,.057,top-bottom)
    box(alloy,(left+right)/2,.16,top-.46,opening,.064,.052)
    box(alloy,(left+right)/2,.24,bottom,opening+.09,.38,.08)
    box(slab,0,.20,3.395,3.29,.33,.10)
    if name=="Residence":
        for n in range(5):box(dark,1.22,.31,.33+n*.07,.36,.045,.028)
    store(name)
for x in (-.77,.77):
    box(glass[2],x,.38,1.05,1.45,.12,2.08)
    box(alloy,x,.48,.21,1.46,.08,.14)
    box(alloy,x+(.52 if x<0 else -.52),.52,1.03,.035,.10,.42)
for x in (-1.55,0,1.55):box(alloy,x,.44,1.17,.065,.15,2.34)
box(slab,0,.83,2.56,3.7,1.65,.19)
box(dark,0,1.62,2.56,3.72,.055,.14)
store("Entrance")
for x in (-.76,.76):
    box(dark,x,0,.24,.12,.49,.46);box(dark,x,-.20,.61,.10,.10,.64)
for j in range(5):box(timber,0,-.23+j*.11,.49,2.08,.087,.055)
for j in range(3):box(timber,0,-.24,.69+j*.10,2.08,.066,.08)
store("Bench")
box(slab,0,.64,.12,2.78,1.25,.18)
box(white,0,1.24,.56,2.72,.12,.78)
box(alloy,0,1.24,1.00,2.81,.12,.065)
for x in (-1.32,1.32):
    box(alloy,x,.64,1.00,.05,1.22,.055)
    box(alloy,x,.09,.59,.055,.06,.85)
store("Balcony")
box(slab,0,.15,.18,3.29,.46,.38)
box(alloy,0,.15,.39,3.31,.5,.055)
store("Parapet")
bpy.ops.export_scene.gltf(filepath=str(out/"architecture.glb"),export_format="GLB")

bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene
bpy.ops.import_scene.gltf(filepath=str(tree))
objs=[o for o in scene.objects if o.type=="MESH"]
coords=[o.matrix_world@Vector(c) for o in objs for c in o.bound_box]
lo=Vector([min(v[i] for v in coords) for i in range(3)])
hi=Vector([max(v[i] for v in coords) for i in range(3)])
center=(hi+lo)/2;extent=hi-lo
world=bpy.data.worlds.new("Outdoor fill");world.use_nodes=True
world.node_tree.nodes.get("Background").inputs[0].default_value=(.78,.86,1,1)
world.node_tree.nodes.get("Background").inputs[1].default_value=.75
scene.world=world
bpy.ops.object.light_add(type="SUN");sun=bpy.context.object
sun.rotation_euler=Vector((.6,.55,-.8)).to_track_quat("-Z","Y").to_euler();sun.data.energy=2.3
sun.data.color=(1,.89,.72);sun.data.angle=.12
bpy.ops.object.camera_add();camera=bpy.context.object;scene.camera=camera
camera.data.type="ORTHO";camera.data.ortho_scale=max(math.hypot(extent.x,extent.y),extent.z)*1.06
scene.render.engine="CYCLES";scene.cycles.samples=12;scene.cycles.use_denoising=True
scene.render.film_transparent=True;scene.render.resolution_x=720;scene.render.resolution_y=720
scene.render.image_settings.color_mode="RGBA";scene.render.image_settings.file_format="PNG"
for i in range(3):
    angle=i*math.tau/3
    camera.location=center+Vector((math.cos(angle),math.sin(angle),-.025))*max(extent)*2
    camera.rotation_euler=(center-camera.location).to_track_quat("-Z","Y").to_euler()
    scene.render.filepath=str(cache/("canopy-"+str(i)+".png"))
    bpy.ops.render.render(write_still=True)
