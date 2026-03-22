import sys
import json
import ezdxf

def parse_dxf(file_path):
    try:
        doc = ezdxf.readfile(file_path)
        msp = doc.modelspace()
    except Exception as e:
        return json.dumps({"error": f"Lỗi đọc file: {str(e)}"})

    result = {
        "rooms": [],
        "suites": [],
        "gross": [], # Thêm mảng chứa layer GROS
        "debug_info": {
            "total_entities_checked": 0,
            "layers_found": list(set([entity.dxf.layer for entity in msp])),
        }
    }

    for entity in msp.query('LWPOLYLINE POLYLINE'):
        result["debug_info"]["total_entities_checked"] += 1
        if not hasattr(entity.dxf, 'layer'): continue
        
        # Làm sạch tên layer (Xóa khoảng trắng và ký tự $)
        raw_layer = str(entity.dxf.layer).strip().upper()
        layer_name = raw_layer.replace('$', '')
        
        # Lấy các layer RM, SU, GROS (bỏ qua các layer Text như RMTXT)
        if layer_name.startswith('RM') or layer_name.startswith('SU') or layer_name.startswith('GROS'):
            # Loại trừ các layer Text
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
                geometry = {
                    "type": "Polygon",
                    "coordinates": [points]
                }
                
                payload = {"layer": layer_name, "cad_id": entity.dxf.handle, "geometry": geometry}
                
                if layer_name.startswith('RM'):
                    result["rooms"].append(payload)
                elif layer_name.startswith('SU'):
                    result["suites"].append(payload)
                elif layer_name.startswith('GROS'):
                    result["gross"].append(payload)
                    
    return json.dumps(result)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        print(parse_dxf(sys.argv[1]))
    else:
        print(json.dumps({"error": "Thiếu đường dẫn file"}))