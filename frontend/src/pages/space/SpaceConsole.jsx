import React, { useState, useEffect } from "react";
import axiosInstance from "../../api/axiosInstance";
import { MapContainer, GeoJSON, Tooltip } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css"; 

export default function SpaceConsole() {
  const [floors, setFloors] = useState([]);
  const [selectedFloorId, setSelectedFloorId] = useState("");
  
  // Dữ liệu hình học của Tầng đang chọn
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [isLoadingMap, setIsLoadingMap] = useState(false);

  // 1. Fetch danh sách Tầng để đưa vào Dropdown/Sidebar
  useEffect(() => {
    const fetchFloors = async () => {
      try {
        const res = await axiosInstance.get("/space/properties/floors");
        setFloors(res.data);
      } catch (error) {
        console.error("Lỗi lấy danh sách tầng:", error);
      }
    };
    fetchFloors();
  }, []);

  // 2. Khi người dùng chọn 1 Tầng, fetch Room và Suite của tầng đó
  useEffect(() => {
    if (!selectedFloorId) {
      setGeoJsonData(null);
      return;
    }

    const fetchSpaceData = async () => {
      setIsLoadingMap(true);
      try {
        // Lấy cả Room và Suite (Song song cho nhanh)
        const [roomRes, suiteRes] = await Promise.all([
          axiosInstance.get("/space/properties/rooms"),
          axiosInstance.get("/space/properties/suites")
        ]);

        // Lọc ra các Room/Suite thuộc về Floor đang chọn
        const floorRooms = roomRes.data.filter(r => r.flId === selectedFloorId);
        const floorSuites = suiteRes.data.filter(s => s.flId === selectedFloorId);

        // Chuyển đổi dữ liệu MongoDB thành chuẩn FeatureCollection của GeoJSON
        const features = [];

        floorRooms.forEach(room => {
          if (room.geometry) {
             features.push({
               type: "Feature",
               properties: { 
                 id: room.roomId, 
                 code: room.roomCode, 
                 type: "ROOM",
                 area: room.area 
               },
               geometry: room.geometry
             });
          }
        });

        floorSuites.forEach(suite => {
          if (suite.geometry) {
             features.push({
               type: "Feature",
               properties: { 
                 id: suite.suiteId, 
                 code: suite.suiteCode, 
                 type: "SUITE",
                 area: suite.area 
               },
               geometry: suite.geometry
             });
          }
        });

        setGeoJsonData({
          type: "FeatureCollection",
          features: features
        });

      } catch (error) {
        console.error("Lỗi lấy dữ liệu không gian:", error);
      } finally {
        setIsLoadingMap(false);
      }
    };

    fetchSpaceData();
  }, [selectedFloorId]);

  // 3. Hàm tạo Style (Màu sắc) tùy theo loại không gian
  const getFeatureStyle = (feature) => {
    switch (feature.properties.type) {
      case 'ROOM':
        return { color: "#3b82f6", weight: 1, fillColor: "#bfdbfe", fillOpacity: 0.6 }; // Xanh dương
      case 'SUITE':
        return { color: "#10b981", weight: 1, fillColor: "#a7f3d0", fillOpacity: 0.6 }; // Xanh lá
      default:
        return { color: "#9ca3af", weight: 1, fillColor: "#e5e7eb", fillOpacity: 0.5 }; // Xám
    }
  };

  return (
    <div className="flex h-[calc(100vh-60px)] bg-gray-50 overflow-hidden font-sans">
      
      {/* SIDEBAR BÊN TRÁI */}
      <div className="w-[300px] bg-white shadow-lg z-10 flex flex-col">
        <div className="p-5 border-b border-gray-200 bg-[#EFB034]">
          <h2 className="text-xl font-bold text-black uppercase tracking-tight">Space Console</h2>
        </div>
        
        <div className="p-5 flex-1 overflow-y-auto">
          <label className="block text-sm font-bold text-gray-700 mb-2">Select Floor to View</label>
          <select 
            className="w-full border border-gray-300 rounded p-2.5 outline-none focus:border-[#EFB034]"
            value={selectedFloorId}
            onChange={(e) => setSelectedFloorId(e.target.value)}
          >
            <option value="">-- Choose a floor --</option>
            {floors.map(f => (
              <option key={f.flId} value={f.flId}>{f.flName} (ID: {f.flId})</option>
            ))}
          </select>

          {/* Sau này bạn có thể bổ sung danh sách chi tiết các phòng ở đây */}
          {isLoadingMap && <p className="mt-4 text-sm text-blue-600 font-semibold animate-pulse">Loading map data...</p>}
        </div>
      </div>

      {/* KHU VỰC BẢN ĐỒ BÊN PHẢI */}
      <div className="flex-1 relative bg-[#e5e5f7]" style={{ opacity: 0.8, backgroundImage: "radial-gradient(#444cf7 0.5px, #e5e5f7 0.5px)", backgroundSize: "10px 10px" }}>
        
        {geoJsonData ? (
          // Bản đồ phẳng (L.CRS.Simple) dùng để vẽ tọa độ CAD (X,Y) thay vì Kinh độ/Vĩ độ thực tế
          <MapContainer 
            crs={L.CRS.Simple} 
            bounds={L.geoJSON(geoJsonData).getBounds()} // Tự động zoom vừa vặn với bản vẽ
            style={{ height: "100%", width: "100%", backgroundColor: "transparent" }}
          >
            {/* Component GeoJSON chịu trách nhiệm vẽ các đa giác */}
            <GeoJSON 
              data={geoJsonData} 
              style={getFeatureStyle}
              onEachFeature={(feature, layer) => {
                // Thêm sự kiện hover/click cho từng phòng
                layer.on({
                  mouseover: (e) => {
                    const l = e.target;
                    l.setStyle({ fillOpacity: 0.9, weight: 2 });
                  },
                  mouseout: (e) => {
                    const l = e.target;
                    l.setStyle(getFeatureStyle(feature));
                  },
                  click: () => {
                    alert(`Bạn vừa click vào: ${feature.properties.type} - ${feature.properties.code}`);
                  }
                });
              }}
            >
              {/* Tooltip hiện thông tin khi đưa chuột vào */}
              <Tooltip sticky>
                <div className="font-sans">
                  <p className="font-bold text-gray-800 m-0">{feature => feature.properties.code}</p>
                  <p className="text-xs text-gray-600 m-0">Loại: {feature => feature.properties.type}</p>
                  <p className="text-xs text-green-600 font-bold m-0">Diện tích: {feature => feature.properties.area || 0} m²</p>
                </div>
              </Tooltip>
            </GeoJSON>
          </MapContainer>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-gray-500 font-semibold bg-white px-6 py-3 rounded-full shadow-sm">
              Please select a floor to view its 2D Plan
            </p>
          </div>
        )}

      </div>
    </div>
  );
}