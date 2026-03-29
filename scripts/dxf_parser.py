import sys
import json
import re
import ezdxf
from ezdxf import path

def extract_area_from_text(text):
    # Chỉ xử lý dấu phẩy hàng nghìn (VD: "1,500.25" -> "1500.25")
    # (?<=\d) : Phía trước là chữ số
    # ,       : Dấu phẩy
    # (?=\d{3}) : Phía sau là đúng 3 chữ số
    clean_text = re.sub(r'(?<=\d),(?=\d{3})', '', text)
    
    match = re.search(r'(\d+[.,]\d+)', clean_text)
    if match: return float(match.group(1).replace(',', '.'))
    
    match = re.search(r'(\d+)', clean_text)
    if match: return float(match.group(1))
    
    return None

def calculate_area(points):
    n = len(points)
    area = 0.0
    for i in range(n):
        j = (i + 1) % n
        area += points[i][0] * points[j][1]
        area -= points[j][0] * points[i][1]
    return round(abs(area) / 2.0 / 1000000.0, 2)

def point_in_polygon(x, y, poly):
    inside = False
    n = len(poly)
    if n == 0: return False
    p1x, p1y = poly[0]
    for i in range(1, n + 1):
        p2x, p2y = poly[i % n]
        if min(p1y, p2y) < y <= max(p1y, p2y):
            if x <= max(p1x, p2x):
                if p1y != p2y:
                    xints = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xints:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside

def get_centroid(points):
    min_x = min(p[0] for p in points)
    max_x = max(p[0] for p in points)
    min_y = min(p[1] for p in points)
    max_y = max(p[1] for p in points)
    return (min_x + max_x) / 2.0, (min_y + max_y) / 2.0

def distance(p1, p2):
    return ((p1[0] - p2[0])**2 + (p1[1] - p2[1])**2)**0.5

def clean_mtext(text):
    text = re.sub(r'[{}]', '', text)
    text = re.sub(r'\\[a-zA-Z0-9~]+;', '', text)
    text = text.replace('\\P', '\n').replace('^M', '\n').replace('\r', '\n')
    return text

def is_area_text(text):
    val = text.upper()
    return bool(re.search(r'(M2|M\^2|SQM|S=|S =)', val) or re.fullmatch(r'^\d+[.,]\d+$', val))

def is_valid_text_for_poly(poly_layer, txt_layer):
    if poly_layer.startswith('RM') and not txt_layer.startswith('RM'): return False
    if poly_layer.startswith('SU') and not txt_layer.startswith('SU'): return False
    if poly_layer.startswith('GROS') and not txt_layer.startswith('GROS'): return False
    if poly_layer.startswith('RF') and not txt_layer.startswith('RF'): return False
    return True

def parse_dxf(file_path):
    try:
        doc = ezdxf.readfile(file_path)
        msp = doc.modelspace()
    except Exception as e:
        return json.dumps({"error": f"Drawing cannot be rendered: {str(e)}"})

    texts = []
    for entity in msp.query('TEXT MTEXT'):
        if not hasattr(entity.dxf, 'layer'): continue
        layer_name = str(entity.dxf.layer).strip().upper().replace('$', '')
        
        if 'TXT' in layer_name or 'TEXT' in layer_name:
            if entity.dxftype() == 'MTEXT':
                try: val = entity.plain_text()
                except: val = entity.text
            else:
                val = entity.dxf.text
                
            val = clean_mtext(val)
            parts = [p.strip() for p in val.split('\n') if p.strip()]
            if not parts: continue
            
            extracted_id = parts[0]
            extracted_area = extract_area_from_text(parts[1]) if len(parts) > 1 else None
            
            if entity.dxftype() == 'TEXT':
                if hasattr(entity.dxf, 'align_point') and (entity.dxf.halign != 0 or entity.dxf.valign != 0):
                    pt = entity.dxf.align_point
                else:
                    pt = entity.dxf.insert
            else:
                pt = entity.dxf.insert

            texts.append({
                'x': pt[0], 
                'y': pt[1], 
                'text': extracted_id,
                'area': extracted_area,
                'layer': layer_name,
                'used': False 
            })

    polygons = []
    for entity in msp.query('LWPOLYLINE POLYLINE'):
        if not hasattr(entity.dxf, 'layer'): continue
        layer_name = str(entity.dxf.layer).strip().upper().replace('$', '')
        
        if layer_name.startswith('RM') or layer_name.startswith('SU') or layer_name.startswith('GROS') or layer_name.startswith('RF'):
            if 'TXT' in layer_name or 'TEXT' in layer_name: continue
            
            points = []
            try:
                p = path.make_path(entity)
                points = [(v.x, v.y) for v in p.flattening(distance=10.0)]
            except Exception:
                continue
            
            if not points or len(points) < 3: continue
            if points[0] != points[-1]: points.append(points[0])
                
            if len(points) >= 4:
                area_sqm = calculate_area(points)
                polygons.append({
                    'layer': layer_name,
                    'cad_id': entity.dxf.handle,
                    'points': points,
                    'area': area_sqm,
                    'extracted_code': None
                })

    # =========================================================================
    # VÒNG 1: TÌM TEXT BÊN TRONG (CÓ ƯU TIÊN DIỆN TÍCH CHO PHÒNG LỚN)
    # =========================================================================
    for poly in polygons:
        texts_inside = []
        for txt in texts:
            if txt['used']: continue
            if not is_valid_text_for_poly(poly['layer'], txt['layer']): continue
            
            if point_in_polygon(txt['x'], txt['y'], poly['points']):
                texts_inside.append(txt)
        
        if texts_inside:
            allowed_diff = max(3.0, poly['area'] * 0.05)
            matching_area_texts = [t for t in texts_inside if t['area'] is not None and abs(t['area'] - poly['area']) <= allowed_diff]
            
            if matching_area_texts:
                best_txt = sorted(matching_area_texts, key=lambda t: t['y'], reverse=True)[0]
            else:
                valid_ids = [t for t in texts_inside if not is_area_text(t['text'])]
                if valid_ids:
                    best_txt = sorted(valid_ids, key=lambda t: t['y'], reverse=True)[0]
                else:
                    best_txt = sorted(texts_inside, key=lambda t: t['y'], reverse=True)[0]
                
            poly['extracted_code'] = best_txt['text']
            best_txt['used'] = True

    # =========================================================================
    # VÒNG 2: TÌM BẰNG DIỆN TÍCH 
    # =========================================================================
    for poly in polygons:
        if poly['extracted_code']: continue 
        
        best_match = None
        min_diff = max(3.0, poly['area'] * 0.05) 
        for txt in texts:
            if txt['used'] or txt['area'] is None: continue
            if not is_valid_text_for_poly(poly['layer'], txt['layer']): continue
            
            diff = abs(txt['area'] - poly['area'])
            if diff < min_diff:
                min_diff = diff
                best_match = txt
        
        if best_match:
            poly['extracted_code'] = best_match['text']
            best_match['used'] = True

    # =========================================================================
    # VÒNG 3: TÌM BẰNG KHOẢNG CÁCH
    # =========================================================================
    for poly in polygons:
        if poly['extracted_code']: continue
        
        best_match = None
        min_dist = 5000.0 
        cx, cy = get_centroid(poly['points'])

        valid_texts = [t for t in texts if not t['used'] and not is_area_text(t['text'])]
        
        for txt in valid_texts:
            if not is_valid_text_for_poly(poly['layer'], txt['layer']): continue
            
            dist = distance((cx, cy), (txt['x'], txt['y']))
            if dist < min_dist:
                min_dist = dist
                best_match = txt

        if best_match:
            poly['extracted_code'] = best_match['text']
            best_match['used'] = True

    # =========================================================================
    # ĐÓNG GÓI JSON
    # =========================================================================
    result = {"rooms": [], "suites": [], "gross": [], "rf": []}
    for poly in polygons:
        geometry = {"type": "Polygon", "coordinates": [poly['points']]}
        payload = {
            "layer": poly['layer'], 
            "cad_id": poly['cad_id'], 
            "geometry": geometry, 
            "area": poly['area'],
            "extracted_code": poly['extracted_code']
        }
        
        if poly['layer'].startswith('RM'): result["rooms"].append(payload)
        elif poly['layer'].startswith('SU'): result["suites"].append(payload)
        elif poly['layer'].startswith('GROS'): result["gross"].append(payload)
        elif poly['layer'].startswith('RF'): result["rf"].append(payload)

    return json.dumps(result)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        print(parse_dxf(sys.argv[1]))