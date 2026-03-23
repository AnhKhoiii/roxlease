import sys
import json
import ezdxf

def calculate_area(points):
    n = len(points)
    area = 0.0
    for i in range(n):
        j = (i + 1) % n
        area += points[i][0] * points[j][1]
        area -= points[j][0] * points[i][1]
    return round(abs(area) / 2.0 / 1000000.0, 2)

def parse_dxf(file_path):
    try:
        doc = ezdxf.readfile(file_path)
        msp = doc.modelspace()
    except Exception as e:
        return json.dumps({"error": f"Drawing cannot be rendered: {str(e)}"})

    result = {"rooms": [], "suites": [], "gross": [], "rf": []}

    for entity in msp.query('LWPOLYLINE POLYLINE'):
        if not hasattr(entity.dxf, 'layer'): continue
        
        raw_layer = str(entity.dxf.layer).strip().upper()
        layer_name = raw_layer.replace('$', '')
        
        if layer_name.startswith('RM') or layer_name.startswith('SU') or layer_name.startswith('GROS') or layer_name.startswith('RF'):
            if 'TXT' in layer_name or 'TEXT' in layer_name: continue
            
            points = []
            if entity.dxftype() == 'LWPOLYLINE':
                points = [(p[0], p[1]) for p in entity.get_points('xy')]
            elif entity.dxftype() == 'POLYLINE':
                points = [(v.dxf.location.x, v.dxf.location.y) for v in entity.vertices]
            
            if not points: continue

            if len(points) > 0 and points[0] != points[-1]:
                points.append(points[0])
                
            if len(points) >= 4:
                area_sqm = calculate_area(points)
                geometry = {"type": "Polygon", "coordinates": [points]}
                payload = {"layer": layer_name, "cad_id": entity.dxf.handle, "geometry": geometry, "area": area_sqm}
                
                if layer_name.startswith('RM'): result["rooms"].append(payload)
                elif layer_name.startswith('SU'): result["suites"].append(payload)
                elif layer_name.startswith('GROS'): result["gross"].append(payload)
                elif layer_name.startswith('RF'): result["rf"].append(payload)
                    
    return json.dumps(result)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        print(parse_dxf(sys.argv[1]))