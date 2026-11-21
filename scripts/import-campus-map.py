"""Extract public outdoor geometry from an OpenStreetMap .osm map export."""
import json
import math
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

osm = ET.parse(sys.argv[1]).getroot()
ways = {way.get("id"): way for way in osm.findall("way")}
nodes = {n.get("id"): (float(n.get("lon")), float(n.get("lat"))) for n in osm.findall("node")}
tags = lambda obj: {tag.get("k"): tag.get("v") for tag in obj.findall("tag")}
points = lambda way: [nodes[n.get("ref")] for n in way.findall("nd")]
ring = points(ways["44848355"]) + points(ways["184007520"])[1:]
west, north = min(x for x,y in ring), max(y for x,y in ring)
east_scale = 111320 * math.cos(math.radians(north))

def project(pts):
    return [[round((x-west)*east_scale,1), round((north-y)*111320,1)] for x,y in pts]

boundary = project(ring)

def inside(pt):
    x,y = pt
    hits = 0
    for (a,b),(c,d) in zip(boundary,boundary[1:]):
        if (b>y)!=(d>y) and x<(c-a)*(y-b)/(d-b)+a:
            hits+=1
    return hits % 2

buildings, roads, fields, surroundings = [], [], [], []
def building(id,t,outline,holes):
    levels = t.get("building:levels","")
    buildings.append(dict(id=id,outline=outline,holes=holes,
                          floors=int(levels) if levels.isdigit() else 2))

for way_id,way in ways.items():
    t=tags(way)
    p=project(points(way))
    if not any(inside(pt) for pt in p):
        if t.get("building") and p[0]==p[-1] and any(-110<x<800 and -110<z<700 for x,z in p):
            levels=t.get("building:levels","")
            surroundings.append(dict(outline=p,floors=int(levels) if levels.isdigit() else 3))
        continue
    if t.get("building") and p[0]==p[-1]:
        building(way_id,t,p,[])
    elif t.get("leisure") in ("pitch","track") and p[0]==p[-1]:
        fields.append(dict(outline=p,sport=t.get("sport","")))
    elif t.get("highway") in ("service","footway","pedestrian","path","cycleway","living_street","steps","residential"):
        roads.append(dict(line=p,width=5 if t["highway"] in ("service","living_street","residential") else 2.2))
main=osm.find("relation[@id='395037']")
members=main.findall("member")
outer=next(m for m in members if m.get("role")=="outer")
building("395037",tags(main),project(points(ways[outer.get("ref")])),
         [project(points(ways[m.get("ref")])) for m in members if m.get("role")=="inner"])
data=dict(boundary=boundary, buildings=buildings, roads=roads, fields=fields, surroundings=surroundings)
path=Path(__file__).resolve().parents[1]/"public/campus-map/grounds.json"
path.parent.mkdir(parents=True,exist_ok=True)
path.write_text(json.dumps(data,separators=(",",":"))+"\n")
