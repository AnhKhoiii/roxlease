import React, { useState, useEffect, useRef } from "react";
import axiosInstance from "../../api/axiosInstance";
import { MapContainer, GeoJSON, Tooltip, useMap } from "react-leaflet"; 
import L from "leaflet";
import { useNavigate } from "react-router-dom";
import "leaflet/dist/leaflet.css"; 

function MapUpdater({ geoJsonData }) {
  const map = useMap();
  useEffect(() => {
    if (geoJsonData && geoJsonData.features && geoJsonData.features.length > 0) {
      map.invalidateSize();
      const bounds = L.geoJSON(geoJsonData).getBounds();
      if (bounds.isValid()) {
        setTimeout(() => map.fitBounds(bounds, { padding: [50, 50] }), 100);
      }
    }
  }, [geoJsonData, map]);
  return null;
}

const SearchableSelect = ({ label, value, options, onChange, disabled, placeholder, highlight }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    opt.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOpt = options.find(o => o.value === value);

  return (
    <div className="flex flex-col relative w-full" ref={wrapperRef}>
      <label className={`text-[12px] font-bold mb-1 uppercase tracking-wide ${highlight ? 'text-blue-700' : 'text-gray-600'}`}>{label}</label>
      <div className={`border rounded-lg px-3 py-2 text-sm flex items-center justify-between transition-colors shadow-sm ${disabled ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-70' : highlight ? 'bg-blue-50 border-blue-400 cursor-text hover:border-blue-500' : 'bg-white border-gray-300 cursor-text hover:border-[#EFB034]'}`} onClick={() => { if (!disabled) setIsOpen(true); }}>
        {isOpen ? (
          <input type="text" autoFocus className="w-full outline-none bg-transparent font-medium" placeholder="Type to search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        ) : (
          <span className={`truncate ${selectedOpt ? "text-gray-900 font-bold" : "text-gray-500"}`}>{selectedOpt ? selectedOpt.label : placeholder}</span>
        )}
        <svg className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
      </div>
      {isOpen && (
        <div className="absolute top-[100%] left-0 w-full bg-white border border-gray-200 shadow-xl mt-1 max-h-56 overflow-y-auto z-[2000] rounded-lg">
          {filteredOptions.length > 0 ? filteredOptions.map(opt => (
            <div key={opt.value} className={`px-3 py-2.5 cursor-pointer text-sm border-b border-gray-50 last:border-0 transition-colors ${value === opt.value ? 'bg-blue-100 font-bold text-blue-700' : 'text-gray-700 hover:bg-blue-50'}`} onClick={(e) => { e.stopPropagation(); onChange(opt.value); setIsOpen(false); setSearchTerm(""); }}>
              {opt.label}
            </div>
          )) : <div className="px-3 py-4 text-center text-gray-400 text-sm italic">No results found</div>}
        </div>
      )}
    </div>
  );
};

export default function SpaceConsole() {
  const navigate = useNavigate();
  const mapRef = useRef(null); 

  const [sites, setSites] = useState([]);
  const [buildings, setBuildings] = useState([]); 
  const [floors, setFloors] = useState([]);

  const [selSite, setSelSite] = useState("");
  const [selBuilding, setSelBuilding] = useState("");
  const [selFloor, setSelFloor] = useState("");
  
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [isLoadingMap, setIsLoadingMap] = useState(false);
  const [selectedPolygon, setSelectedPolygon] = useState(null);
  const [visibleLayers, setVisibleLayers] = useState({ ROOM: true, SUITE: true, GROS: true, RF: true });

  const fetchHierarchyData = async () => {
    try {
      const [siteRes, blRes, flRes] = await Promise.all([
        axiosInstance.get("/space/properties/sites").catch(() => ({data: []})),
        axiosInstance.get("/space/properties/buildings").catch(() => ({data: []})),
        axiosInstance.get("/space/properties/floors").catch(() => ({data: []}))
      ]);
      setSites(siteRes.data || []);
      setBuildings(blRes.data || []);
      setFloors(flRes.data || []);
    } catch (error) {
      console.error("Lỗi lấy dữ liệu cấu trúc:", error);
    }
  };

  useEffect(() => { fetchHierarchyData(); }, []);

  useEffect(() => {
    if (!selFloor) { setGeoJsonData(null); return; }
    setIsLoadingMap(true);
    setSelectedPolygon(null);
    
    const currentFloor = floors.find(f => f.flId === selFloor);
    if (!currentFloor || !currentFloor.drawingJson) {
      setGeoJsonData({ type: "FeatureCollection", features: [] });
      setIsLoadingMap(false);
      return;
    }

    const drawingData = currentFloor.drawingJson;
    const rawFeatures = [];

    const addFeatures = (arr, type) => {
      (arr || []).forEach(item => {
        if (item.geometry && item.geometry.coordinates) { 
           rawFeatures.push({
             type: "Feature",
             properties: { code: item.extracted_code || item.layer, type: type, area: item.area }, // Dùng mã chuẩn từ CAD
             geometry: item.geometry
           });
        }
      });
    };

    addFeatures(drawingData.rooms, "ROOM");
    addFeatures(drawingData.suites, "SUITE");
    addFeatures(drawingData.gross, "GROS");
    addFeatures(drawingData.rf, "RF");

    if (rawFeatures.length > 0) {
      let minX = Infinity; let minY = Infinity;
      rawFeatures.forEach(f => {
        f.geometry.coordinates.forEach(ring => {
          ring.forEach(pt => { if (pt[0] < minX) minX = pt[0]; if (pt[1] < minY) minY = pt[1]; });
        });
      });

      const SCALE_FACTOR = 1000.0; 
      const normalizedFeatures = rawFeatures.map(f => {
        const newCoordinates = f.geometry.coordinates.map(ring => 
          ring.map(pt => [(pt[0] - minX) / SCALE_FACTOR, (pt[1] - minY) / SCALE_FACTOR])
        );
        return { ...f, geometry: { ...f.geometry, coordinates: newCoordinates } };
      });

      setGeoJsonData({ type: "FeatureCollection", features: normalizedFeatures });
    } else {
      setGeoJsonData({ type: "FeatureCollection", features: [] });
    }
    setIsLoadingMap(false);
  }, [selFloor, floors]);

  const filteredBuildings = selSite ? buildings.filter(b => b.siteId === selSite) : buildings;
  const filteredFloors = selBuilding ? floors.filter(f => f.blId === selBuilding) : floors;

  const handleSiteChange = (val) => { setSelSite(val); setSelBuilding(""); setSelFloor(""); };
  const handleBuildingChange = (val) => { setSelBuilding(val); setSelFloor(""); };
  const handleRefresh = () => { fetchHierarchyData(); setSelSite(""); setSelBuilding(""); setSelFloor(""); };
  
  const handleResetZoom = () => { 
    if (mapRef.current && geoJsonData) { 
      mapRef.current.fitBounds(L.geoJSON(geoJsonData).getBounds(), { padding: [50, 50] }); 
    } 
  };

  const getFeatureStyle = (feature) => {
    switch (feature.properties.type) {
      case 'ROOM': return { color: "#2563eb", weight: 1.5, fillColor: "#bfdbfe", fillOpacity: 0.6 }; 
      case 'SUITE': return { color: "#059669", weight: 1.5, fillColor: "#a7f3d0", fillOpacity: 0.6 }; 
      case 'GROS': return { color: "#d97706", weight: 2, fillColor: "#fde68a", fillOpacity: 0.4, dashArray: "5, 5" }; 
      case 'RF': return { color: "#9333ea", weight: 2, fillColor: "#e9d5ff", fillOpacity: 0.3 }; 
      default: return { color: "#9ca3af", weight: 1.5, fillColor: "#e5e7eb", fillOpacity: 0.5 };
    }
  };

  const displayGeoJsonData = geoJsonData ? {
    type: "FeatureCollection",
    features: geoJsonData.features.filter(f => visibleLayers[f.properties.type])
  } : null;

  const hasMapData = displayGeoJsonData && displayGeoJsonData.features.length > 0;

  const siteOptions = sites.map(s => ({ value: s.siteId, label: s.siteId }));
  const buildingOptions = filteredBuildings.map(b => ({ value: b.blId, label: b.blId }));
  
  // ================= CẮT BỎ TIỀN TỐ BUILDING Ở DROP DOWN TẦNG =================
  const floorOptions = filteredFloors.map(f => {
      const displayId = f.flId.includes('_') ? f.flId.split('_').pop() : f.flId;
      return { value: f.flId, label: `${displayId} - ${f.flName}` };
  });

  return (
    <div className="relative w-full h-[calc(100vh-60px)] bg-[#e5e5f7] overflow-hidden font-sans" style={{ backgroundImage: "radial-gradient(#444cf7 0.5px, #e5e5f7 0.5px)", backgroundSize: "10px 10px" }}>
      
      <div className="absolute top-6 left-6 z-[400] bg-white/95 backdrop-blur-md p-5 rounded-xl shadow-2xl border border-white/50 w-[850px] animate-[slideInDown_0.3s_ease-out]">
        <div className="flex items-end gap-5">
          <div className="flex-1 grid grid-cols-3 gap-5">
            <SearchableSelect label="1. Select Site" value={selSite} options={siteOptions} onChange={handleSiteChange} placeholder="-- Choose Site --" />
            <SearchableSelect label="2. Select Building" value={selBuilding} options={buildingOptions} onChange={handleBuildingChange} placeholder="-- Choose Building --" disabled={!selSite} />
            <SearchableSelect label="3. Select Floor" value={selFloor} options={floorOptions} onChange={setSelFloor} placeholder="-- Choose Floor --" disabled={!selBuilding} highlight={true} />
          </div>
          <button onClick={handleRefresh} className="bg-[#EFB034] hover:bg-[#d69d2e] text-black font-bold px-5 py-2.5 rounded-lg shadow-md transition-all active:scale-95 flex items-center gap-2 h-[42px]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        </div>
      </div>

      {selFloor && !isLoadingMap && (
        <div className="absolute top-6 right-6 z-[400] bg-white/95 backdrop-blur-md p-5 rounded-xl shadow-2xl border border-white/50 min-w-[220px] animate-[slideInRight_0.3s_ease-out]">
          <h3 className="text-[13px] font-bold text-gray-800 mb-3 uppercase tracking-wide border-b pb-2">Layers Control</h3>
          {[
            { id: 'ROOM', label: 'Phòng (RM)', color: '#2563eb', bg: '#bfdbfe' },
            { id: 'SUITE', label: 'DT Thuê (SU)', color: '#059669', bg: '#a7f3d0' },
            { id: 'GROS', label: 'DT Tổng (GROS)', color: '#d97706', bg: '#fde68a' },
            { id: 'RF', label: 'Mái/Sàn (RF)', color: '#9333ea', bg: '#e9d5ff' }
          ].map(layer => (
            <label key={layer.id} className="flex items-center gap-3 cursor-pointer mb-2.5 p-1.5 hover:bg-gray-100 rounded-md transition-colors">
              <input type="checkbox" className="w-4 h-4 text-blue-600 rounded cursor-pointer" checked={visibleLayers[layer.id]} onChange={() => setVisibleLayers(prev => ({...prev, [layer.id]: !prev[layer.id]}))} />
              <span className="text-sm font-semibold text-gray-700 flex items-center gap-2"><div className="w-4 h-4 border-2 rounded-sm" style={{ backgroundColor: layer.bg, borderColor: layer.color }}></div> {layer.label}</span>
            </label>
          ))}
          <button onClick={handleResetZoom} className="mt-4 w-full flex items-center justify-center gap-2 bg-gray-50 border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold py-2 rounded-lg text-sm transition-colors shadow-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg> Reset Camera
          </button>
        </div>
      )}

      {selectedPolygon && (
        <div className="absolute bottom-8 left-8 z-[500] bg-white p-6 rounded-2xl shadow-2xl border border-gray-200 w-[320px] animate-[slideInUp_0.2s_ease-out]">
          <div className="flex justify-between items-start mb-4 border-b pb-3">
            <div>
              <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">{selectedPolygon.type} INFO</p>
              <h3 className="text-xl font-black text-gray-900">{selectedPolygon.code}</h3>
            </div>
            <button onClick={() => setSelectedPolygon(null)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-full transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="space-y-3 mb-5 bg-gray-50 p-3 rounded-lg border border-gray-100">
            <div className="flex justify-between items-center"><span className="text-sm text-gray-600 font-medium">Loại diện tích:</span><span className="text-sm font-bold text-gray-800 bg-white px-2 py-0.5 rounded shadow-sm border border-gray-200">{selectedPolygon.type}</span></div>
            <div className="flex justify-between items-center"><span className="text-sm text-gray-600 font-medium">Diện tích:</span><span className="text-lg font-black text-green-600">{selectedPolygon.area || 0} m²</span></div>
          </div>
          <button onClick={() => navigate(`/space/background-data/property?tab=${selectedPolygon.type.toLowerCase()}&code=${selectedPolygon.code}`)} className="w-full bg-[#EFB034] hover:bg-[#d69d2e] text-black font-bold py-2.5 rounded-lg shadow-md transition-transform active:scale-95 text-sm flex items-center justify-center gap-2">
            View Detailed Record <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </button>
        </div>
      )}

      {(!selFloor || isLoadingMap || (!hasMapData && !isLoadingMap)) && (
        <div className="absolute inset-0 z-[300] flex items-center justify-center pointer-events-none">
          {isLoadingMap ? (
            <div className="bg-white/90 backdrop-blur-md px-8 py-4 rounded-full shadow-2xl flex items-center gap-4 border border-blue-100 pointer-events-auto">
              <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              <span className="text-base font-bold text-gray-700 tracking-wide">Rendering drawing...</span>
            </div>
          ) : selFloor ? (
            <div className="bg-white/95 backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-red-100 flex flex-col items-center pointer-events-auto max-w-sm text-center">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4 border border-red-100"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></div>
                <p className="text-gray-900 font-black text-xl mb-2">No drawing data available</p>
                <p className="text-gray-500 text-sm">Tầng này chưa được tải lên bản vẽ CAD. Vui lòng quay lại màn hình Property Console để upload file .dxf.</p>
            </div>
          ) : (
            <div className="bg-white/95 backdrop-blur-md px-8 py-5 rounded-full shadow-2xl flex items-center gap-4 border border-gray-100 pointer-events-auto animate-[bounce_2s_infinite]">
              <div className="bg-blue-100 p-2 rounded-full text-blue-600"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg></div>
              <p className="text-gray-700 font-medium text-lg">Hãy chọn <strong className="text-blue-600 font-bold mx-1">Site &rarr; Building &rarr; Floor</strong> để hiển thị bản đồ</p>
            </div>
          )}
        </div>
      )}

      <MapContainer ref={mapRef} crs={L.CRS.Simple} minZoom={-5} maxZoom={5} zoomSnap={0.1} zoomDelta={0.2} wheelPxPerZoomLevel={120} className="w-full h-full z-0" style={{ backgroundColor: "transparent" }} zoomControl={false}>
        <MapUpdater geoJsonData={displayGeoJsonData} />
        {hasMapData && (
          <GeoJSON key={selFloor + JSON.stringify(visibleLayers)} data={displayGeoJsonData} style={getFeatureStyle}
            onEachFeature={(feature, layer) => {
              const tooltipContent = `<div style="font-family: sans-serif; padding: 2px;"><p style="margin: 0; font-weight: bold; color: #1f2937; font-size: 14px;">${feature.properties.code}</p></div>`;
              layer.bindTooltip(tooltipContent, { sticky: true });
              layer.on({
                mouseover: (e) => { e.target.setStyle({ fillOpacity: 0.9, weight: 2.5 }); },
                mouseout: (e) => { e.target.setStyle(getFeatureStyle(feature)); },
                click: () => { setSelectedPolygon(feature.properties); } 
              });
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}