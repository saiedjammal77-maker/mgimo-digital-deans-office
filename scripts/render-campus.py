"""Rebuild with Blender 4.5: blender -b -P scripts/render-campus.py -- sky.hdr

Facade UVs refer to A.Savin's Mgimo.jpg in a 760 x 570 reference frame.
The packed scene has no external image dependencies after the first build.
"""
import math
import random
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector

root = Path(__file__).resolve().parents[1]
output = root / "artifacts"
output.mkdir(exist_ok=True)
sky_path = Path(sys.argv[sys.argv.index("--") + 1]).resolve()
random.seed(76)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def material(name, rgb, rough=.7, metallic=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*rgb, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*rgb, 1)
    shader.inputs["Roughness"].default_value = rough
    shader.inputs["Metallic"].default_value = metallic
    return mat


def textured(name, rgb, scale, contrast):
    mat = material(name, rgb)
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    coords = nodes.new("ShaderNodeTexCoord")
    noise = nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = scale
    links.new(coords.outputs["Object"], noise.inputs[0])
    ramp = nodes.new("ShaderNodeValToRGB")
    for i, factor in enumerate([1-contrast, 1+contrast]):
        ramp.color_ramp.elements[i].color = (*[c*factor for c in rgb], 1)
    links.new(noise.outputs["Fac"], ramp.inputs[0])
    shader = nodes.get("Principled BSDF")
    links.new(ramp.outputs[0], shader.inputs["Base Color"])
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = .18
    bump.inputs["Distance"].default_value = .09
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs[0], shader.inputs["Normal"])
    return mat


limestone = textured("Pale limestone panels", (.54, .50, .41), 7, .30)
concrete = textured("Weathered coping", (.43, .43, .40), 19, .35)
lawn = textured("Grass and moss", (.092, .135, .043), 1.1, .85)
paving = textured("Forecourt | aggregate", (.24, .23, .21), 8, .40)
road = textured("Asphalt", (.071, .074, .079), 28, .42)
metal = material("Brushed aluminium", (.42, .45, .46), .33, .65)
glazing = material("Smoked glazing", (.07, .12, .14), .19, .55)
bark = textured("Tree bark", (.09, .071, .048), 20, .55)


def mesh(name, vertices, faces, mat):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    data.materials.append(mat)
    return obj


def box(name, centre, dims, mat):
    x,y,z = centre
    w,d,h = (n/2 for n in dims)
    verts = [(x+i*w,y+j*d,z+k*h) for k in (-1,1) for j in (-1,1) for i in (-1,1)]
    return mesh(name,verts,[(0,2,3,1),(4,5,7,6),(0,1,5,4),(1,3,7,5),(3,2,6,7),(2,0,4,6)],mat)


# Subdivide the surfaces so photographic alignment follows perspective across each bay.
photo = material("Vernadsky stone and windows | A.Savin, Wikipedia · FAL 1.3", (1,1,1))
image_node = photo.node_tree.nodes.new("ShaderNodeTexImage")
image_node.image = bpy.data.images.load(str(root/"public/campus-photo/Mgimo.jpg"))
photo.node_tree.links.new(image_node.outputs["Color"], photo.node_tree.nodes.get("Principled BSDF").inputs["Base Color"])


def facade(name, origin, run, top, corners):
    transform = []
    uv = [(0,0),(1,0),(1,1),(0,1)]
    for (u,v),(x,y) in zip(uv,corners):
        transform.extend([[u,v,1,0,0,0,-u*x,-v*x],[0,0,0,u,v,1,-u*y,-v*y]])
    H = np.append(np.linalg.solve(transform,np.array(corners).flatten()),1).reshape(3,3)
    nx,ny = 36,12
    verts, tex = [], []
    for j in range(ny+1):
        for i in range(nx+1):
            u,v = i/nx,j/ny
            verts.append((origin[0]+run[0]*u,origin[1]+run[1]*u,.20+(top-.20)*v))
            x,y,w = H @ [u,v,1]
            tex.append((x/w/760,1-y/w/570))
    faces = []
    for j in range(ny):
        for i in range(nx):
            a = j*(nx+1)+i
            faces.append((a,a+1,a+nx+2,a+nx+1))
    data = mesh(name,verts,faces,photo).data
    layer = data.uv_layers.new()
    for loop in data.loops:
        layer.data[loop.index].uv = tex[loop.vertex_index]


box("Auditorium envelope", (0,0,5.69),(37.96,20.96,11.36),limestone)
facade("South elevation",(-19,-10.5),(38,0),11.4,[(38,377),(436,370),(436,225),(40,261)])
facade("East elevation",(19,-10.5),(0,21),11.4,[(436,370),(590,349),(589,277),(436,225)])
box("Parapet cap", (0,0,11.45),(38.12,21.12,.11),concrete)

# The auditorium rises above the rectilinear plinth, with a vertically ribbed drum.
segments = 768
verts = []
for z in (11.5,14.3):
    for i in range(segments):
        angle = 2*math.pi*i/segments
        rib = .055 if i%4 in (1,2) else 0
        verts.append(((11.6+rib)*math.cos(angle),1.2+(7.7+rib)*math.sin(angle),z))
faces = [(i,(i+1)%segments,(i+1)%segments+segments,i+segments) for i in range(segments)]
faces.append(tuple(range(segments,2*segments)))
mesh("Fluted auditorium drum",verts,faces,concrete)
for x in (-7,-4):
    bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=.42,depth=.65,location=(x,2,14.61))
    bpy.context.object.data.materials.append(metal)
for i in range(3):
    box("Entrance tread",(11,-12-i*.33,.28-i*.08),(14,2,.16),concrete)
box("Entrance canopy",(11,-11.45,4.04),(15,2.2,.25),limestone)
for x in (4.3,17.7):
    box("Canopy support",(x,-12.39,2.01),(.18,.18,4.02),metal)

for side in (-1,1):
    for i in range(3):
        x = side*(21+i*12)
        y = 20+i*4
        box("Teaching wing",(x,y,4.2),(12,10,8.4),limestone)
        for floor in range(3):
            for bay in range(7):
                box("Recessed sash",(x-5.1+bay*1.7,y-5.02,1.6+floor*2.5),(1.23,.09,1.48),glazing)

box("Ground",(0,10,-.32),(800,640,.5),lawn)
box("Campus forecourt",(0,-12.8,-.026),(102,9,.09),paving)
box("Access lane",(0,-20.4,-.032),(240,6.1,.08),road)
for y in (-23.56,-17.26):
    box("Kerb",(0,y,.015),(240,.23,.16),concrete)
for i in range(-24,25):
    box("Paving joint",(i*2,-14.3,.022),(.015,4.6,.006),road)

iron = material("Graphite powder coat",(.047,.055,.061),.42,.5)
wood = textured("Oiled bench slats",(.23,.125,.064),13,.38)
enamel = material("Road paint",(.68,.65,.53))
for x in (-28,-15,26,39):
    box("Path light | mast",(x,-16.1,2.62),(.10,.10,5.24),iron)
    box("Path light | arm",(x+.34,-16.1,5.17),(.77,.11,.12),iron)
    box("Path light | LED",(x+.61,-16.1,5.12),(.48,.24,.06),enamel)
for x in (-16,-10,24):
    for dx in (-.84,.84):
        box("Seat support",(x+dx,-14,.24),(.11,.50,.46),iron)
    for j in range(4):
        box("Bench plank",(x,-14.22+j*.145,.49),(2.25,.115,.075),wood)
    for z in (.79,.94):
        box("Backrest",(x,-13.76,z),(2.25,.095,.12),wood)
for i in range(7):
    box("Pedestrian crossing",(12,-23.1+i*.87,.013),(2.6,.40,.008),enamel)

# Irregular leaf clusters, separately instanced for each tree to keep the scene compact.
leaves = [material("Foliage "+str(i), c) for i,c in enumerate([
    (.065,.112,.028),(.095,.146,.038),(.14,.185,.045),(.105,.16,.047),(.18,.192,.055)])]


def sapling():
    verts, faces, colors = [],[],[]
    for _ in range(38):
        cx,cy,cz = [random.uniform(-1,1) for _ in range(3)]
        if cx*cx+cy*cy+cz*cz>1.2:
            continue
        for _ in range(145):
            x,y,z = [random.gauss(a,.2) for a in (cx,cy,cz)]
            r=random.uniform(.023,.056)
            a=random.random()*math.tau
            k=len(verts)
            verts.extend([(x-r,y,z),(x,y+r*math.sin(a),z+r),(x+r,y,z),(x,y-r*math.cos(a),z-r*.5)])
            faces.append((k,k+1,k+2,k+3))
            colors.append(random.randrange(len(leaves)))
    obj=mesh("Tree canopy",verts,faces,leaves[0])
    for mat in leaves[1:]:
        obj.data.materials.append(mat)
    for poly,col in zip(obj.data.polygons,colors):
        poly.material_index=col
    return obj


canopies=[sapling() for _ in range(4)]
locations=[(x,random.uniform(8,25)) for x in range(-84,85,3)]
locations += [(x,random.uniform(-14,-9)) for x in [-54,-49,-44,-39,-34,-29,35,40,45,50,55]]
for i,(x,y) in enumerate(locations):
    size=random.uniform(2,3.6)
    source=canopies[i%4]
    tree=bpy.data.objects.new("Linden",source.data)
    scene.collection.objects.link(tree)
    tree.location=(x,y,size*1.55)
    tree.scale=(size,size,size*1.15)
    tree.rotation_euler.z=random.random()*math.tau
    box("Trunk",(x,y,size*.66),(.27,.3,size*1.32),bark)
for obj in canopies:
    bpy.data.objects.remove(obj,do_unlink=True)

world=bpy.data.worlds.new("Afternoon sky | Poly Haven, CC0")
scene.world=world
world.use_nodes=True
nodes,links=world.node_tree.nodes,world.node_tree.links
env=nodes.new("ShaderNodeTexEnvironment")
env.image=bpy.data.images.load(str(sky_path))
mapping=nodes.new("ShaderNodeMapping")
mapping.inputs["Rotation"].default_value.z=math.radians(112)
links.new(nodes.new("ShaderNodeTexCoord").outputs["Generated"],mapping.inputs[0])
links.new(mapping.outputs[0],env.inputs[0])
links.new(env.outputs[0],nodes.get("Background").inputs[0])
nodes.get("Background").inputs[1].default_value=.74
bpy.ops.object.light_add(type="SUN",location=(-25,-36,34))
sun=bpy.context.object
sun.rotation_euler=Vector((.7,.67,-.45)).to_track_quat("-Z","Y").to_euler()
sun.data.energy=2.35
sun.data.color=(1,.74,.48)
sun.data.angle=.06
bpy.ops.object.camera_add(location=(39,-66,5.1))
camera=bpy.context.object
camera.rotation_euler=(Vector((-1,0,13.3))-camera.location).to_track_quat("-Z","Y").to_euler()
camera.data.lens=39
camera.data.clip_end=600
scene.camera=camera
scene.render.engine="CYCLES"
scene.cycles.samples=16
scene.cycles.use_denoising=True
scene.render.resolution_x=1920
scene.render.resolution_y=1080
scene.render.image_settings.file_format="PNG"
scene.render.filepath="//vernadsky.png"
bpy.context.preferences.filepaths.save_version=0
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(output/"vernadsky.blend"),compress=True)
bpy.ops.render.render(write_still=True)

# The on-demand web model includes the photographed building only.
bpy.ops.object.select_all(action="DESELECT")
subjects=("Auditorium envelope","South elevation","East elevation","Parapet cap",
          "Fluted auditorium drum","Cylinder","Entrance tread","Entrance canopy","Canopy support")
for obj in scene.objects:
    if obj.name.startswith(subjects):
        obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(root/"public/campus-photo/vernadsky.glb"),
                          use_selection=True,export_format="GLB")
